import { GeminiRequest } from '@/domain/types';

// 시스템 프롬프트를 request.language와 pilotProfile.experienceLevel에 따라 동적으로 구성
export function buildSystemPrompt(request: GeminiRequest): string {
  const isKorean = request.language === 'ko';
  const level = request.pilotProfile.experienceLevel;

  let toneInstruction = '';
  if (level === 'beginner') {
    toneInstruction = isKorean
      ? '친절하고 상세하게, 처음 방문하는 여행자에게 설명하듯이'
      : 'In a friendly and detailed manner, as if explaining to a first-time visitor';
  } else if (level === 'veteran') {
    toneInstruction = isKorean
      ? '간결하고 핵심적으로, 현지인처럼'
      : 'Concisely and to the point, like a local';
  } else {
    toneInstruction = isKorean
      ? '자연스럽고 편안하게'
      : 'In a natural and comfortable tone';
  }

  if (isKorean) {
    return `당신은 서울 관광 전문 UAM 탑승 안내원 "스카이바운드 Gemini 가이드"입니다.
승객 "${request.pilotProfile.callsign}"님을 위해 ${toneInstruction} 관광 안내를 해주세요.

현재 상황:
- 날짜: 2026년 2월 28일 (겨울 끝자락, 이른 봄)
- 시간: 오후 5~7시 (해질녘, 석양)
- 날씨: 겨울 저녁, 서울 하늘이 붉게 물들고 있음

규칙:
- 2~3문장으로 간결하게 (문장당 50자 이내)
- 현재 비행 방향과 POI의 위치 관계를 언급
- 저녁 시간대에 맞는 분위기를 반영하세요:
  * 야경이 아름다운 곳은 "지금 해가 지면서 조명이 하나둘 켜지고 있다" 등 시간 맞는 멘트
  * 낮에 보기 좋은 곳은 "낮에 방문하면 더 좋은 곳이지만, 지금은 석양과 함께 독특한 매력이 있다" 등
  * 밤에 특히 좋은 곳은 "저녁 무렵부터 야경이 시작되어 지금이 가장 아름다운 시간" 등
  * 계절감도 반영: 겨울 끝자락의 서울, 봄이 다가오는 시기
- 반드시 JSON 형식으로 응답: {"narration": "안내 텍스트", "highlightKeyword": "핵심 키워드"}`;
  }

  return `You are "Skybound Gemini Guide", a UAM tourism narrator for Seoul.
Guide passenger "${request.pilotProfile.callsign}" ${toneInstruction}.

Current context:
- Date: February 28, 2026 (late winter, early spring)
- Time: 5-7 PM (sunset/dusk)
- Weather: Winter evening, Seoul sky painted in sunset hues

Rules:
- Keep it to 2-3 sentences (under 50 chars each)
- Mention the POI's direction relative to the aircraft
- Reflect the evening time context:
  * For places with beautiful night views: mention lights turning on as sun sets
  * For daytime attractions: mention they're best by day but have unique charm at sunset
  * For nighttime highlights: mention this is the golden hour when night views begin
  * Include seasonal context: late winter Seoul, spring approaching
- Respond in JSON: {"narration": "guide text", "highlightKeyword": "key word"}`;
}

export function buildUserPrompt(request: GeminiRequest): string {
  const { targetPOI, context, vehiclePosition, heading, narrationHistory } = request;
  const isKorean = request.language === 'ko';

  let historyContext = '';
  if (narrationHistory.length > 0) {
    const historyItems = narrationHistory.map(h =>
      `- ${h.poiName}: "${h.narration}" (${h.context})`
    ).join('\n');

    historyContext = isKorean
      ? `\n\n[이전 안내 이력 - 중복 내용 없이 자연스럽게 이어서 안내하세요]\n${historyItems}`
      : `\n\n[Previous narrations - Continue seamlessly without repeating]\n${historyItems}`;
  }

  const directionText = getDirectionText(
    heading,
    calculateBearingFromPositions(vehiclePosition, targetPOI),
    isKorean
  );

  if (isKorean) {
    return `[상황: ${getContextLabel(context, true)}]
POI: ${targetPOI.name} (${targetPOI.category})
설명: ${targetPOI.description}
거리: ${Math.round(targetPOI.distance_m)}m, 방향: ${directionText}
고도: ${Math.round(vehiclePosition.altitude_m)}m, 속도: ${Math.round(request.speed_kmh)}km/h
시간대: 2026년 2월 28일 오후 5~7시 (석양/해질녘)
승객 선호: ${request.passengerPreferences.join(', ')}${historyContext}`;
  }

  return `[Context: ${getContextLabel(context, false)}]
POI: ${targetPOI.name_en || targetPOI.name} (${targetPOI.category})
Description: ${targetPOI.description}
Distance: ${Math.round(targetPOI.distance_m)}m, Direction: ${directionText}
Altitude: ${Math.round(vehiclePosition.altitude_m)}m, Speed: ${Math.round(request.speed_kmh)}km/h
Time: Feb 28, 2026, 5-7 PM (sunset/dusk)
Preferences: ${request.passengerPreferences.join(', ')}${historyContext}`;
}

function getContextLabel(context: string, korean: boolean): string {
  const labels: Record<string, [string, string]> = {
    approaching: ['접근 중 - 소개 멘트', 'Approaching - Introduction'],
    passing: ['통과 중 - 핵심 정보', 'Passing - Key Information'],
    departing: ['이탈 중 - 마무리 + 다음 추천', 'Departing - Wrap-up + Next suggestion'],
  };
  return labels[context]?.[korean ? 0 : 1] || context;
}

function getDirectionText(heading: number, bearing: number, korean: boolean): string {
  const relative = ((bearing - heading + 360) % 360);
  if (relative < 30 || relative > 330) return korean ? '정면' : 'ahead';
  if (relative < 150) return korean ? '오른쪽' : 'right';
  if (relative > 210) return korean ? '왼쪽' : 'left';
  return korean ? '후방' : 'behind';
}

function calculateBearingFromPositions(
  from: { lat: number; lon: number },
  to: { distance_m: number; bearing: number }
): number {
  return to.bearing;
}

export function buildFullPrompt(request: GeminiRequest): string {
  return `${buildSystemPrompt(request)}\n\n${buildUserPrompt(request)}`;
}
