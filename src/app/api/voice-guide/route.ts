import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';
import { canExecute, recordSuccess, recordFailure } from '@/lib/circuit-breaker';
import { generateNarration } from '@/infrastructure/api/GeminiClient';
import { buildVoiceFullPrompt } from '@/infrastructure/api/voice-prompts';
import type { VoiceGuideRequest, VoiceGuideResponse } from '@/domain/types';

const FALLBACK_RESPONSES: Record<string, string> = {
  ko: '죄송합니다, 잠시 후 다시 말씀해 주세요.',
  en: 'Sorry, please try again in a moment.',
};

export async function POST(request: NextRequest) {
  try {
    // Rate Limit 체크 (voice-guide 키: 5초 간격, 분당 10회)
    const rateLimit = checkRateLimit('voice-guide');
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
      const body = await request.json() as VoiceGuideRequest;
      const lang = body.language || 'ko';
      return NextResponse.json({
        answer: FALLBACK_RESPONSES[lang] || FALLBACK_RESPONSES.ko,
        highlightKeyword: '',
        relatedPOI: null,
        isFallback: true,
      } as VoiceGuideResponse);
    }

    const body = await request.json() as VoiceGuideRequest;

    // 요청 검증
    if (!body.userQuestion || !body.vehiclePosition) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const prompt = buildVoiceFullPrompt(body);

    try {
      const rawResponse = await generateNarration(prompt, 7000);
      recordSuccess('gemini');

      // JSON 파싱 시도
      let answer = rawResponse;
      let highlightKeyword = '';
      let relatedPOI: string | null = null;

      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*?"answer"[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          answer = parsed.answer || rawResponse;
          highlightKeyword = parsed.highlightKeyword || '';
          relatedPOI = parsed.relatedPOI || null;
        }
      } catch {
        // JSON 파싱 실패 시 원본 텍스트 사용
      }

      return NextResponse.json(
        {
          answer,
          highlightKeyword,
          relatedPOI,
          isFallback: false,
        } as VoiceGuideResponse,
        {
          headers: {
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    } catch {
      recordFailure('gemini');

      const lang = body.language || 'ko';
      return NextResponse.json({
        answer: FALLBACK_RESPONSES[lang] || FALLBACK_RESPONSES.ko,
        highlightKeyword: '',
        relatedPOI: null,
        isFallback: true,
      } as VoiceGuideResponse);
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
