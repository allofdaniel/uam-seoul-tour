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
    return `당신은 서울 관광 전문 UAM 탑승 안내원 "스카이바운드 가이드"입니다.
승객 "${request.pilotProfile.callsign}"님을 위해 ${toneInstruction} 관광 안내를 해주세요.
규칙:
- 2~3문장으로 간결하게 (문장당 50자 이내)
- 현재 비행 방향과 POI의 위치 관계를 언급
- 시간대(${request.timeOfDay})에 맞는 분위기 반영
- 반드시 JSON 형식으로 응답: {"narration": "안내 텍스트", "highlightKeyword": "핵심 키워드"}`;
  }

  return `You are "Skybound Guide", a UAM tourism narrator for Seoul.
Guide passenger "${request.pilotProfile.callsign}" ${toneInstruction}.
Rules:
- Keep it to 2-3 sentences (under 50 chars each)
- Mention the POI's direction relative to the aircraft
- Reflect the time of day (${request.timeOfDay})
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
승객 선호: ${request.passengerPreferences.join(', ')}${historyContext}`;
  }

  return `[Context: ${getContextLabel(context, false)}]
POI: ${targetPOI.name_en || targetPOI.name} (${targetPOI.category})
Description: ${targetPOI.description}
Distance: ${Math.round(targetPOI.distance_m)}m, Direction: ${directionText}
Altitude: ${Math.round(vehiclePosition.altitude_m)}m, Speed: ${Math.round(request.speed_kmh)}km/h
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
