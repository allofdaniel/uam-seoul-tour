'use client';

import { useEffect, useRef } from 'react';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';
import { useGuideStore } from '@/stores/useGuideStore';
import { POI, TriggerType, GeminiRequest } from '@/domain/types';
import poiData from '@/infrastructure/data/poi-data.json';

const FOV_DEG = 120; // ±60도
const MAX_RANGE_M = 3000; // 3km
const DETECTION_INTERVAL = 2000; // 2초마다 탐지

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export default function usePOIDetection() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const previousDistancesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (gamePhase !== 'flying') return;

    const interval = setInterval(() => {
      const flight = useFlightStore.getState();
      const game = useGameStore.getState();
      const guide = useGuideStore.getState();

      const { lat, lon } = flight.position;
      const heading = flight.heading;

      // 가시권 내 POI 필터링
      const visiblePOIs: (POI & { distance_m: number; bearing: number; trigger: TriggerType })[] = [];

      for (const poi of poiData as POI[]) {
        // 이미 방문한 POI 제외
        if (game.visitedPOIIds.includes(poi.id)) continue;

        const dist = haversineDistance(lat, lon, poi.lat, poi.lon);
        if (dist > Math.max(MAX_RANGE_M, poi.visible_range_m || MAX_RANGE_M)) continue;

        const bearing = calculateBearing(lat, lon, poi.lat, poi.lon);
        const relativeAngle = ((bearing - heading + 360) % 360);
        const normalizedAngle = relativeAngle > 180 ? relativeAngle - 360 : relativeAngle;

        // 시야각 판정
        if (Math.abs(normalizedAngle) <= FOV_DEG / 2) {
          // 트리거 유형 결정
          const prevDist = previousDistancesRef.current.get(poi.id);
          let trigger: TriggerType = 'approaching';

          if (prevDist !== undefined) {
            if (dist < prevDist && dist < 1000) trigger = 'approaching';
            else if (dist > prevDist) trigger = 'departing';
            else trigger = 'passing';
          }

          if (dist < 500) trigger = 'passing';

          previousDistancesRef.current.set(poi.id, dist);

          visiblePOIs.push({ ...poi, distance_m: dist, bearing, trigger });
        }
      }

      // 선호도 기반 우선순위 정렬
      visiblePOIs.sort((a, b) => {
        const aScore = game.preferences.includes(a.category_code) ? 0 : 1;
        const bScore = game.preferences.includes(b.category_code) ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return a.distance_m - b.distance_m;
      });

      // 최우선 POI 안내 트리거
      if (visiblePOIs.length > 0 && guide.canNarrate()) {
        const topPOI = visiblePOIs[0];
        triggerNarration(topPOI, topPOI.trigger, game, guide, flight);

        // 나머지 POI를 큐에 추가
        for (let i = 1; i < Math.min(visiblePOIs.length, 3); i++) {
          guide.enqueuePOI(visiblePOIs[i]);
        }
      } else if (visiblePOIs.length > 0 && guide.isNarrating) {
        // 안내 중이면 큐에 추가
        for (const poi of visiblePOIs) {
          if (poi.id !== guide.currentPOI?.id) {
            guide.enqueuePOI(poi);
          }
        }
      }
    }, DETECTION_INTERVAL);

    return () => clearInterval(interval);
  }, [gamePhase]);
}

async function triggerNarration(
  poi: POI & { distance_m: number; bearing: number },
  trigger: TriggerType,
  game: ReturnType<typeof useGameStore.getState>,
  guide: ReturnType<typeof useGuideStore.getState>,
  flight: ReturnType<typeof useFlightStore.getState>
) {
  guide.startNarration(poi, trigger);

  const request: GeminiRequest = {
    vehiclePosition: flight.position,
    heading: flight.heading,
    speed_kmh: flight.speed_kmh,
    targetPOI: {
      name: poi.name,
      name_en: poi.name_en,
      category: poi.category_code,
      description: poi.description,
      distance_m: poi.distance_m,
      bearing: poi.bearing,
    },
    passengerPreferences: game.preferences,
    context: trigger,
    timeOfDay: getTimeOfDay(),
    language: game.language,
    narrationHistory: guide.getRecentHistory(3).map((h) => ({
      poiName: h.poiName,
      narration: h.narration,
      context: h.context,
    })),
    pilotProfile: game.pilotProfile,
  };

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (response.ok) {
      const data = await response.json();
      guide.setNarrationText(data.narration, data.highlightKeyword);
      game.addVisitedPOI(poi.id);
      game.incrementNarrations();

      // TTS 재생 (Web Speech API)
      if (guide.audioEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.narration);
        utterance.lang = game.language === 'ko' ? 'ko-KR' : 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => {
          guide.endNarration();
          // 큐에서 다음 POI 처리
          const nextPOI = guide.dequeuePOI();
          if (nextPOI) {
            const dist = haversineDistance(flight.position.lat, flight.position.lon, nextPOI.lat, nextPOI.lon);
            const bearing = calculateBearing(flight.position.lat, flight.position.lon, nextPOI.lat, nextPOI.lon);
            setTimeout(() => {
              triggerNarration(
                { ...nextPOI, distance_m: dist, bearing },
                'approaching',
                useGameStore.getState(),
                useGuideStore.getState(),
                useFlightStore.getState()
              );
            }, 2000);
          }
        };
        speechSynthesis.speak(utterance);
      } else {
        // 음성 없이 텍스트만 표시 후 10초 후 종료
        setTimeout(() => {
          guide.endNarration();
          const nextPOI = guide.dequeuePOI();
          if (nextPOI) {
            setTimeout(() => {
              const dist = haversineDistance(flight.position.lat, flight.position.lon, nextPOI.lat, nextPOI.lon);
              const bearing = calculateBearing(flight.position.lat, flight.position.lon, nextPOI.lat, nextPOI.lon);
              triggerNarration(
                { ...nextPOI, distance_m: dist, bearing },
                'approaching',
                useGameStore.getState(),
                useGuideStore.getState(),
                useFlightStore.getState()
              );
            }, 2000);
          }
        }, 10000);
      }
    }
  } catch {
    // 폴백 안내
    guide.setNarrationText(
      game.language === 'ko'
        ? `${poi.name}이(가) 보입니다. ${poi.description}`
        : `${poi.name_en} is visible. ${poi.description_en}`,
      poi.name
    );
    game.addVisitedPOI(poi.id);
    setTimeout(() => guide.endNarration(), 8000);
  }
}
