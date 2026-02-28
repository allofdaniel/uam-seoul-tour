import type { VoiceGuideRequest } from '@/domain/types';

export function buildVoiceSystemPrompt(request: VoiceGuideRequest): string {
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
승객 "${request.pilotProfile.callsign}"님이 음성으로 질문했습니다. ${toneInstruction} 답변하세요.

규칙:
- 질문이 현재 위치/주변과 관련되면 → 제공된 근처 관광지 데이터를 활용하여 답변
- 일반적인 질문이면 → 서울 관광 안내원으로서 직접 답변
- 3~5문장, 자연스러운 대화체 (문장당 50자 이내)
- 반드시 JSON 형식으로 응답: {"answer": "답변 텍스트", "highlightKeyword": "핵심 키워드", "relatedPOI": "관련 POI 이름 or null"}`;
  }

  return `You are "Skybound Guide", a UAM tourism narrator for Seoul.
Passenger "${request.pilotProfile.callsign}" asked a question via voice. Answer ${toneInstruction}.

Rules:
- If the question relates to current location/surroundings → use provided nearby POI data
- If it's a general question → answer directly as a Seoul tourism guide
- 3-5 sentences, conversational tone (under 50 chars each)
- Respond in JSON: {"answer": "response text", "highlightKeyword": "key word", "relatedPOI": "related POI name or null"}`;
}

export function buildVoiceUserPrompt(request: VoiceGuideRequest): string {
  const isKorean = request.language === 'ko';
  const { nearbyPOIs, vehiclePosition, heading, speed_kmh, zone } = request;

  let poiList = '';
  if (nearbyPOIs.length > 0) {
    poiList = nearbyPOIs.map((poi, i) => {
      const dirText = getDirectionFromBearing(heading, poi.bearing, isKorean);
      return `${i + 1}. ${poi.name} (${poi.category}) - ${poi.description.slice(0, 60)} - 거리 ${Math.round(poi.distance_m)}m ${dirText}`;
    }).join('\n');
  }

  if (isKorean) {
    return `[질문]: ${request.userQuestion}
[현재 위치]: 위도 ${vehiclePosition.lat.toFixed(4)}, 경도 ${vehiclePosition.lon.toFixed(4)}, 고도 ${Math.round(vehiclePosition.altitude_m)}m, ${zone || '서울'} 상공
[비행 상태]: 속도 ${Math.round(speed_kmh)}km/h, 방향 ${Math.round(heading)}°
${nearbyPOIs.length > 0 ? `[근처 관광지 ${nearbyPOIs.length}곳]:\n${poiList}` : '[근처 관광지]: 없음'}
JSON 형식으로 응답해주세요: {"answer": "...", "highlightKeyword": "...", "relatedPOI": "..."}`;
  }

  return `[Question]: ${request.userQuestion}
[Current Position]: lat ${vehiclePosition.lat.toFixed(4)}, lon ${vehiclePosition.lon.toFixed(4)}, altitude ${Math.round(vehiclePosition.altitude_m)}m, above ${zone || 'Seoul'}
[Flight Status]: speed ${Math.round(speed_kmh)}km/h, heading ${Math.round(heading)}°
${nearbyPOIs.length > 0 ? `[Nearby POIs (${nearbyPOIs.length})]:\n${poiList}` : '[Nearby POIs]: none'}
Respond in JSON: {"answer": "...", "highlightKeyword": "...", "relatedPOI": "..."}`;
}

function getDirectionFromBearing(heading: number, bearing: number, korean: boolean): string {
  const relative = ((bearing - heading + 360) % 360);
  if (relative < 30 || relative > 330) return korean ? '(정면)' : '(ahead)';
  if (relative < 150) return korean ? '(오른쪽)' : '(right)';
  if (relative > 210) return korean ? '(왼쪽)' : '(left)';
  return korean ? '(후방)' : '(behind)';
}

export function buildVoiceFullPrompt(request: VoiceGuideRequest): string {
  return `${buildVoiceSystemPrompt(request)}\n\n${buildVoiceUserPrompt(request)}`;
}
