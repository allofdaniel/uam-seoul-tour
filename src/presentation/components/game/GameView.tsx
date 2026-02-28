'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useFlightStore } from '@/stores/useFlightStore';
import { useUIStore } from '@/stores/useUIStore';
import FlightHUD from '@/presentation/components/hud/FlightHUD';
import GuidePanel from '@/presentation/components/hud/GuidePanel';
import MiniMap from '@/presentation/components/hud/MiniMap';
import ControlHints from '@/presentation/components/hud/ControlHints';
import VoiceMicButton from '@/presentation/components/hud/VoiceMicButton';
import useFlightControls from '@/presentation/hooks/useFlightControls';
import usePOIDetection from '@/presentation/hooks/usePOIDetection';
import useGameLoop from '@/presentation/hooks/useGameLoop';
import MapScene from './MapScene';

export default function GameView() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const hudVisible = useUIStore((s) => s.hudVisible);
  const position = useFlightStore((s) => s.position);

  // 비행 조종 훅
  useFlightControls();
  // POI 탐지 훅
  usePOIDetection();
  // 게임 루프 훅
  useGameLoop();

  // L키 착륙 안내 (항상 표시)
  const showLandingHint = gamePhase === 'flying';

  return (
    <div className="relative w-full h-full">
      {/* 3D CesiumJS 맵 */}
      <MapScene />

      {/* HUD 오버레이 */}
      {hudVisible && (
        <>
          <FlightHUD />
          <MiniMap />
          <GuidePanel />
          <VoiceMicButton />
          <ControlHints />
        </>
      )}

      {/* 이륙 시퀀스 */}
      {gamePhase === 'takeoff' && <TakeoffOverlay />}

      {/* 착륙 불필요 - L키로 언제든 착륙 가능 */}

      {/* 착륙 시퀀스 */}
      {gamePhase === 'landing' && <LandingOverlay />}
    </div>
  );
}

// ── 부드러운 이륙 오버레이 ──
function TakeoffOverlay() {
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const startTimer = useGameStore((s) => s.startTimer);
  const setHudVisible = useUIStore((s) => s.setHudVisible);
  const updatePosition = useFlightStore((s) => s.updatePosition);
  const setSpeed = useFlightStore((s) => s.setSpeed);
  const [phase, setPhase] = useState<'waiting' | 'rising' | 'complete'>('waiting');

  // 스페이스바 대기
  useEffect(() => {
    if (phase !== 'waiting') return;

    setHudVisible(true);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        setPhase('rising');
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, setHudVisible]);

  // 부드러운 상승 애니메이션
  useEffect(() => {
    if (phase !== 'rising') return;

    startTimer();

    const TARGET_ALTITUDE = 200;
    const TARGET_SPEED = 80;
    const DURATION = 5000; // 5초 (자연스러운 상승)
    const startTime = performance.now();

    let rafId: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DURATION, 1);

      // ease-in-out 커브 (부드러운 시작과 끝)
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      updatePosition({ altitude_m: eased * TARGET_ALTITUDE });
      setSpeed(eased * TARGET_SPEED);

      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        setPhase('complete');
        setGamePhase('flying');
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafId);
  }, [phase, setGamePhase, startTimer, updatePosition, setSpeed]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      {phase === 'waiting' && (
        <div className="text-center animate-fadeIn">
          <div className="bg-black/60 backdrop-blur-md border border-gray-700/50 rounded-2xl px-10 py-8">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-white text-lg font-bold mb-2">여의도 버티포트</p>
            <p className="text-gray-400 text-sm mb-6">이륙 준비 완료</p>
            <div className="flex items-center justify-center gap-2 animate-pulse">
              <kbd className="px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-400 font-bold text-sm">
                SPACE
              </kbd>
              <span className="text-gray-300 text-sm">를 눌러 이륙</span>
            </div>
          </div>
        </div>
      )}
      {phase === 'rising' && (
        <div className="text-center animate-fadeIn">
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-6">
            <div className="text-3xl font-bold text-orange-400 animate-bounce mb-2">
              TAKEOFF
            </div>
            <p className="text-gray-300 text-sm">상승 중...</p>
            <div className="mt-3 w-40 h-1.5 bg-gray-700 rounded-full overflow-hidden mx-auto">
              <div className="h-full bg-orange-500 rounded-full animate-takeoff-bar" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 착륙 오버레이 ──
function LandingOverlay() {
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const setHudVisible = useUIStore((s) => s.setHudVisible);
  const updatePosition = useFlightStore((s) => s.updatePosition);
  const setSpeed = useFlightStore((s) => s.setSpeed);
  const [landingPhase, setLandingPhase] = useState<
    'descending' | 'touchdown' | 'complete'
  >('descending');

  // 부드러운 하강 애니메이션
  useEffect(() => {
    const startAlt = useFlightStore.getState().position.altitude_m;
    const startSpeed = useFlightStore.getState().speed_kmh;
    const DURATION = 2500;
    const startTime = performance.now();

    let rafId: number;

    const descend = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out

      updatePosition({ altitude_m: startAlt * (1 - eased) });
      setSpeed(startSpeed * (1 - eased));

      if (t < 1) {
        rafId = requestAnimationFrame(descend);
      }
    };

    rafId = requestAnimationFrame(descend);

    const t1 = setTimeout(() => setLandingPhase('touchdown'), 2500);
    const t2 = setTimeout(() => setLandingPhase('complete'), 4000);
    const t3 = setTimeout(() => {
      setHudVisible(false);
      setGamePhase('result');
    }, 5500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [setGamePhase, setHudVisible, updatePosition, setSpeed]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 transition-opacity">
      <div className="text-center">
        {landingPhase === 'descending' && (
          <div className="animate-pulse">
            <div className="text-6xl mb-4">🛬</div>
            <div className="text-2xl font-bold text-orange-400">하강 중...</div>
            <p className="text-gray-400 mt-2">잠실 버티포트 착륙 준비</p>
          </div>
        )}
        {landingPhase === 'touchdown' && (
          <div className="animate-fadeIn">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-2xl font-bold text-green-400">TOUCHDOWN!</div>
            <p className="text-gray-400 mt-2">안전하게 착륙했습니다</p>
          </div>
        )}
        {landingPhase === 'complete' && (
          <div className="animate-fadeIn">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-2xl font-bold text-white">비행 완료!</div>
            <p className="text-gray-400 mt-2">결과를 확인하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
