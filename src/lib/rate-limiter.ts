interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

interface RateLimitConfig {
  minIntervalMs: number;
  maxPerMinute: number;
}

const store = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL_MS = 300000;

// 키별 Rate Limit 설정
const KEY_CONFIGS: Record<string, RateLimitConfig> = {
  gemini: { minIntervalMs: 10000, maxPerMinute: 6 },
  'voice-guide': { minIntervalMs: 5000, maxPerMinute: 10 },
};

const DEFAULT_CONFIG: RateLimitConfig = { minIntervalMs: 10000, maxPerMinute: 6 };

function getConfig(key: string): RateLimitConfig {
  return KEY_CONFIGS[key] || DEFAULT_CONFIG;
}

export function checkRateLimit(key: string = 'global'): {
  allowed: boolean;
  retryAfter: number;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const windowStart = now - 60000;
  const config = getConfig(key);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], lastCleanup: now };
    store.set(key, entry);
  }

  // 5분마다 오래된 엔트리 정리
  if (now - entry.lastCleanup > CLEANUP_INTERVAL_MS) {
    entry.timestamps = entry.timestamps.filter(t => t > windowStart);
    entry.lastCleanup = now;
  }

  // 유효한 타임스탬프만 유지
  const validTimestamps = entry.timestamps.filter(t => t > windowStart);

  // 최소 간격 체크
  const lastTimestamp = validTimestamps[validTimestamps.length - 1] || 0;
  if (now - lastTimestamp < config.minIntervalMs) {
    const retryAfter = Math.ceil((config.minIntervalMs - (now - lastTimestamp)) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: config.maxPerMinute - validTimestamps.length,
      reset: Math.ceil((windowStart + 60000) / 1000),
    };
  }

  // 분당 최대 횟수 체크
  if (validTimestamps.length >= config.maxPerMinute) {
    const oldestInWindow = validTimestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + 60000 - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
      reset: Math.ceil((oldestInWindow + 60000) / 1000),
    };
  }

  // 허용
  validTimestamps.push(now);
  entry.timestamps = validTimestamps;

  return {
    allowed: true,
    retryAfter: 0,
    remaining: config.maxPerMinute - validTimestamps.length,
    reset: Math.ceil((now + 60000) / 1000),
  };
}
