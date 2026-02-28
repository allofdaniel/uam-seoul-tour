'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useGuideStore } from '@/stores/useGuideStore';
import { useFlightStore } from '@/stores/useFlightStore';

// 고도 → Google Maps Static API 줌 레벨 변환
function altitudeToZoom(altitudeM: number): number {
  if (altitudeM >= 800) return 14;
  if (altitudeM >= 500) return 15;
  if (altitudeM >= 300) return 16;
  if (altitudeM >= 150) return 17;
  return 18;
}

export default function GuidePanel() {
  const {
    isNarrating,
    narrationText,
    highlightKeyword,
    currentPOI,
    displayImage,
    audioEnabled,
    toggleAudio,
    pendingTransition,
  } = useGuideStore();

  const position = useFlightStore((s) => s.position);
  const speed = useFlightStore((s) => s.speed_kmh);
  const heading = useFlightStore((s) => s.heading);

  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [placesPhotoUrl, setPlacesPhotoUrl] = useState<string | null>(null);

  // 타이핑 애니메이션
  useEffect(() => {
    if (!narrationText) {
      setDisplayText('');
      return;
    }

    setIsTyping(true);
    let index = 0;
    setDisplayText('');

    const interval = setInterval(() => {
      if (index < narrationText.length) {
        setDisplayText(narrationText.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [narrationText]);

  // Google Places API로 대표 사진 가져오기
  useEffect(() => {
    if (!currentPOI) {
      setPlacesPhotoUrl(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/places-photo?lat=${currentPOI.lat}&lng=${currentPOI.lon}&name=${encodeURIComponent(currentPOI.name)}`
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.photoUrl) {
            setPlacesPhotoUrl(data.photoUrl);
          }
        }
      } catch {
        // 실패해도 visitseoul 이미지로 폴백
      }
    })();

    return () => { cancelled = true; };
  }, [currentPOI?.id]);

  // 항공사진 URL (Google Maps Static API, 현재 고도 기반 줌)
  const aerialPhotoUrl = useMemo(() => {
    if (!currentPOI) return '';
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TILES_API_KEY;
    if (!apiKey) return '';
    const zoom = altitudeToZoom(position.altitude_m);
    return `https://maps.googleapis.com/maps/api/staticmap?center=${currentPOI.lat},${currentPOI.lon}&zoom=${zoom}&size=400x250&maptype=satellite&key=${apiKey}`;
  }, [currentPOI, position.altitude_m]);

  const hasPOI = currentPOI !== null;

  // 대표이미지: Places API 우선, 없으면 visitseoul 이미지
  const representativeImage = placesPhotoUrl || displayImage;

  return (
    <div
      className={`fixed top-0 right-0 w-[360px] h-screen z-20 transition-transform duration-500 ease-in-out ${
        hasPOI ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="h-full bg-[#0b0f19]/90 backdrop-blur-xl border-l border-gray-700/30 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <span className="text-orange-400 font-bold text-sm tracking-wide">
              Gemini 가이드
            </span>
            {pendingTransition && (
              <span className="text-xs text-yellow-400 animate-pulse ml-1">
                전환 중...
              </span>
            )}
          </div>
          <button
            onClick={toggleAudio}
            className="text-gray-400 hover:text-white transition-colors pointer-events-auto text-lg"
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* 스크롤 가능한 본문 */}
        <div className="flex-1 overflow-y-auto">
          {/* 항공사진 (현재 고도 기반 위성 뷰) */}
          {aerialPhotoUrl && (
            <div className="relative">
              <img
                src={aerialPhotoUrl}
                alt="항공뷰"
                className="w-full h-[220px] object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0b0f19]/95 to-transparent" />
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="px-2.5 py-1 bg-orange-500/90 text-white text-xs font-bold rounded-full shadow-lg">
                  AERIAL VIEW
                </span>
                <span className="px-2.5 py-1 bg-black/60 text-gray-300 text-xs rounded-full">
                  {position.altitude_m.toFixed(0)}m
                </span>
              </div>
            </div>
          )}

          {/* POI 정보 카드 */}
          {currentPOI && (
            <div className="px-5 py-4">
              {/* 카테고리 배지 */}
              <span className="inline-block px-2.5 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded text-blue-300 text-xs font-medium mb-2">
                {currentPOI.category_code?.replace('cat_', '').toUpperCase() ||
                  'LANDMARK'}
              </span>

              {/* POI 이름 */}
              <h2 className="text-white font-bold text-xl leading-tight mb-1">
                {currentPOI.name}
              </h2>
              <p className="text-gray-500 text-xs mb-4">{currentPOI.name_en}</p>

              {/* 대표 이미지 (Google Places 또는 visitseoul) */}
              {representativeImage && (
                <div className="mb-4 rounded-xl overflow-hidden border border-gray-700/30 shadow-lg">
                  <img
                    src={representativeImage}
                    alt={currentPOI.name}
                    className="w-full h-[160px] object-cover"
                    onError={(e) => {
                      // Places 이미지 실패시 visitseoul 폴백
                      const img = e.target as HTMLImageElement;
                      if (placesPhotoUrl && displayImage && img.src !== displayImage) {
                        img.src = displayImage;
                      } else {
                        img.style.display = 'none';
                      }
                    }}
                  />
                  <div className="px-3 py-1.5 bg-gray-800/60 flex items-center justify-between">
                    <span className="text-gray-400 text-[10px] uppercase tracking-wider">
                      {placesPhotoUrl ? 'Google Places' : 'Visit Seoul'}
                    </span>
                    <span className="text-gray-500 text-[10px]">
                      {currentPOI.name}
                    </span>
                  </div>
                </div>
              )}

              {/* 설명 */}
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                {currentPOI.description}
              </p>

              {/* 태그 */}
              {currentPOI.tags && currentPOI.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {currentPOI.tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        tag === highlightKeyword
                          ? 'bg-orange-500/30 border border-orange-500/50 text-orange-300'
                          : 'bg-gray-700/50 border border-gray-600/30 text-gray-400'
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Gemini 내레이션 */}
          {(isNarrating || narrationText) && (
            <div className="px-5 py-4 border-t border-gray-700/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                <span className="text-orange-400 text-xs font-semibold tracking-wide">
                  GEMINI NARRATION
                </span>
              </div>
              <div className="text-gray-200 text-sm leading-relaxed">
                {isNarrating && !narrationText ? (
                  <span className="text-gray-500 animate-pulse">
                    안내 준비 중...
                  </span>
                ) : (
                  <>
                    {displayText}
                    {isTyping && (
                      <span className="inline-block w-0.5 h-4 bg-orange-400 animate-pulse ml-0.5 align-middle" />
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 하단 비행정보 */}
        <div className="px-5 py-3 border-t border-gray-700/30 bg-[#0b0f19]/95 shrink-0">
          <div className="flex justify-between text-[10px] text-gray-500 font-mono">
            <span>ALT {position.altitude_m.toFixed(0)}m</span>
            <span>SPD {speed.toFixed(0)}km/h</span>
            <span>HDG {heading.toFixed(0)}&deg;</span>
          </div>
        </div>
      </div>
    </div>
  );
}
