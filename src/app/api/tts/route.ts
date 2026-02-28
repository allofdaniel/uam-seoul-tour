import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit('tts');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
    );
  }

  try {
    const { text, language } = await request.json();

    if (!text || text.length > 500) {
      return NextResponse.json({ error: 'Text required, max 500 chars' }, { status: 400 });
    }

    // Gemini TTS는 직접 오디오를 생성하지 않으므로 클라이언트 Web Speech API 폴백 안내
    return NextResponse.json({
      fallbackToWebSpeech: true,
      text,
      language: language || 'ko',
    }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
