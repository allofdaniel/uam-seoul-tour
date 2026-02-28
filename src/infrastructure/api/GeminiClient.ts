import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const backupGenAI = process.env.GEMINI_API_KEY_BACKUP
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY_BACKUP)
  : null;

export async function generateNarration(prompt: string, timeout = 5000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    clearTimeout(timer);
    return result.response.text();
  } catch (error: any) {
    clearTimeout(timer);
    // 1차 실패 시 백업 키 시도
    if (backupGenAI && error?.status !== 429) {
      try {
        const backupModel = backupGenAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await backupModel.generateContent(prompt);
        return result.response.text();
      } catch {
        throw error;
      }
    }
    throw error;
  }
}

export async function generateTTS(text: string, language: string = 'ko'): Promise<ArrayBuffer> {
  // Gemini TTS 사용 - 실패 시 null 반환하여 클라이언트에서 Web Speech API 폴백
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{
        text: `Please read the following text aloud in ${language === 'ko' ? 'Korean' : 'English'}: "${text}"`,
      }],
    }],
  });

  // Gemini의 TTS는 텍스트 기반이므로, 실제 오디오 합성은 클라이언트 Web Speech API로 폴백
  throw new Error('TTS_FALLBACK_TO_WEB_SPEECH');
}
