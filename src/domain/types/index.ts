// 좌표
export interface Coordinate {
  lat: number;
  lon: number;
}

export interface Position extends Coordinate {
  altitude_m: number;
}

// 비행 단계
export type FlightPhase = 'takeoff' | 'cruise' | 'descent' | 'landing';
export type GamePhase = 'loading' | 'onboarding' | 'takeoff' | 'flying' | 'landing' | 'result';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'veteran';
export type TriggerType = 'approaching' | 'passing' | 'departing';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type Language = 'ko' | 'en';
export type POICategoryCode = 'landmark' | 'restaurant' | 'culture' | 'nature' | 'shopping' | 'cat_landmark';
export type POIZoneCode = 'yeouido' | 'yongsan' | 'gangnam' | 'jamsil' | 'hangang' | string;

// POI 관련
export interface POICategory {
  code: POICategoryCode;
  name: string;
  name_en: string;
  icon: string;
}

export interface POIZone {
  code: POIZoneCode;
  name: string;
  center_lat: number;
  center_lon: number;
  radius_km: number;
}

export interface POIImage {
  id: string;
  image_url: string;
  display_order: number;
}

export interface POI {
  id: string;
  zone_code: POIZoneCode;
  category_code: POICategoryCode;
  name: string;
  name_en: string;
  lat: number;
  lon: number;
  altitude_m: number;
  description: string;
  description_en: string;
  images: POIImage[];
  tags: string[];
  visible_range_m: number;
  direction: string;
}

// 승객 관련
export interface PilotProfile {
  callsign: string;
  experienceLevel: ExperienceLevel;
}

export interface Passenger {
  id: string;
  sessionId: string;
  language: Language;
  preferences: POICategoryCode[];
  pilotProfile: PilotProfile;
}

// 비행 상태
export interface TrailPoint {
  lat: number;
  lon: number;
  altitude_m: number;
  heading: number;
  speed_kmh: number;
  sequence: number;
  recorded_at: number;
}

// 안내 관련
export interface NarrationRecord {
  poiId: string;
  poiName: string;
  narration: string;
  context: TriggerType;
  timestamp: number;
}

export interface GuideLogEntry {
  id: string;
  sessionId: string;
  poiId: string;
  triggerType: TriggerType;
  narrationText: string;
  distance_m: number;
  bearing: number;
  triggeredAt: number;
  sequenceInSession: number;
  previousGuideLogId: string | null;
}

// Gemini API 관련
export interface GeminiRequest {
  vehiclePosition: Position;
  heading: number;
  speed_kmh: number;
  targetPOI: {
    name: string;
    name_en: string;
    category: POICategoryCode;
    description: string;
    distance_m: number;
    bearing: number;
  };
  passengerPreferences: POICategoryCode[];
  context: TriggerType;
  timeOfDay: TimeOfDay;
  language: Language;
  narrationHistory: {
    poiName: string;
    narration: string;
    context: string;
  }[];
  pilotProfile: PilotProfile;
}

export interface GeminiResponse {
  narration: string;
  highlightKeyword: string;
  isFallback: boolean;
}

export interface TTSRequest {
  text: string;
  language: Language;
}

// 게임 결과
export interface GameResult {
  sessionId: string;
  pilotCallsign: string;
  totalFlightTime: number;
  totalDistance_km: number;
  maxAltitude_m: number;
  maxSpeed_kmh: number;
  visitedPOIs: {
    id: string;
    name: string;
    category: POICategoryCode;
  }[];
  totalNarrations: number;
  trail: TrailPoint[];
  startedAt: number;
  endedAt: number;
}
