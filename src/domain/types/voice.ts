import type { Position, Language, PilotProfile, POICategoryCode } from './index';

// 음성 대화 단계
export type VoicePhase = 'idle' | 'listening' | 'processing' | 'responding';

// 마이크 권한 상태
export type MicPermission = 'prompt' | 'granted' | 'denied';

// 음성 대화 API 요청
export interface VoiceGuideRequest {
  userQuestion: string;
  vehiclePosition: Position;
  heading: number;
  speed_kmh: number;
  nearbyPOIs: {
    name: string;
    name_en: string;
    category: POICategoryCode;
    description: string;
    distance_m: number;
    bearing: number;
  }[];
  zone: string | null;
  language: Language;
  pilotProfile: PilotProfile;
}

// 음성 대화 API 응답
export interface VoiceGuideResponse {
  answer: string;
  highlightKeyword: string;
  relatedPOI: string | null;
  isFallback: boolean;
}
