// 환경변수 런타임 검증
function getEnvVar(key: string, required = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || '';
}

export const env = {
  GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY'),
  GEMINI_API_KEY_BACKUP: getEnvVar('GEMINI_API_KEY_BACKUP', false),
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
