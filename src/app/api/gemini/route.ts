import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { canExecute, recordSuccess, recordFailure } from '@/lib/circuit-breaker';
import { generateNarration } from '@/infrastructure/api/GeminiClient';
import { buildFullPrompt } from '@/infrastructure/api/prompts';
import { GeminiRequest, GeminiResponse } from '@/domain/types';

// 폴백 멘트
const FALLBACK_NARRATIONS: Record<string, Record<string, string>> = {
  ko: {
    landmark: '멋진 랜드마크가 보입니다. 서울의 아름다운 풍경을 즐겨보세요.',
    restaurant: '이 근처에 유명한 맛집들이 있습니다. 서울의 맛을 느껴보세요.',
    culture: '문화와 예술이 살아 숨 쉬는 곳입니다. 서울의 다양한 문화를 경험해보세요.',
    nature: '자연의 아름다움을 느낄 수 있는 곳입니다. 도심 속 휴식처를 만끽하세요.',
    shopping: '쇼핑과 여가를 즐길 수 있는 거리입니다. 서울의 트렌디한 문화를 느껴보세요.',
    default: '서울 상공을 비행하고 있습니다. 아름다운 풍경을 즐겨주세요.',
  },
  en: {
    landmark: 'A wonderful landmark is in sight. Enjoy the beautiful scenery of Seoul.',
    restaurant: 'Famous restaurants are nearby. Experience the flavors of Seoul.',
    culture: 'A place where culture and art thrive. Explore the diverse culture of Seoul.',
    nature: 'A place to feel the beauty of nature. Enjoy this urban oasis.',
    shopping: 'A street for shopping and leisure. Feel the trendy culture of Seoul.',
    default: 'You are flying over Seoul. Enjoy the beautiful scenery.',
  },
};

export async function POST(request: NextRequest) {
  try {
    // Rate Limit 체크
    const rateLimit = checkRateLimit('gemini');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    }

    // Circuit Breaker 체크
    if (!canExecute('gemini')) {
      const body = await request.json() as GeminiRequest;
      const lang = body.language || 'ko';
      const category = body.targetPOI?.category || 'default';
      const fallbackText =
        FALLBACK_NARRATIONS[lang]?.[category] ||
        FALLBACK_NARRATIONS[lang]?.default ||
        FALLBACK_NARRATIONS.ko.default;

      return NextResponse.json(
        {
          narration: fallbackText,
          highlightKeyword: '',
          isFallback: true,
        } as GeminiResponse,
        {
          headers: {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    }

    const body = await request.json() as GeminiRequest;

    // 요청 검증
    if (!body.targetPOI || !body.vehiclePosition) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prompt = buildFullPrompt(body);

    try {
      const rawResponse = await generateNarration(prompt, 5000);
      recordSuccess('gemini');

      // JSON 파싱 시도
      let narration = rawResponse;
      let highlightKeyword = '';

      try {
        // JSON 블록 추출
        const jsonMatch = rawResponse.match(/\{[\s\S]*?"narration"[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          narration = parsed.narration || rawResponse;
          highlightKeyword = parsed.highlightKeyword || '';
        }
      } catch {
        // JSON 파싱 실패 시 원본 텍스트 사용
      }

      return NextResponse.json(
        {
          narration,
          highlightKeyword,
          isFallback: false,
        } as GeminiResponse,
        {
          headers: {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    } catch (error: any) {
      recordFailure('gemini');

      // 폴백
      const lang = body.language || 'ko';
      const category = body.targetPOI?.category || 'default';
      const fallbackText =
        FALLBACK_NARRATIONS[lang]?.[category] ||
        FALLBACK_NARRATIONS[lang]?.default ||
        FALLBACK_NARRATIONS.ko.default;

      return NextResponse.json({
        narration: fallbackText,
        highlightKeyword: '',
        isFallback: true,
      } as GeminiResponse);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
