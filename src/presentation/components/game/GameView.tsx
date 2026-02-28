'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

  // 잠실 착륙 구역 근접 판별
  const distToJamsil = Math.sqrt(
    Math.pow(position.lat - 37.5133, 2) + Math.pow(position.lon - 127.1001, 2)
  ) * 111;
  const nearLandingZone = gamePhase === 'flying' && distToJamsil < 2;

  return (
    <div className="relative w-full h-full">
      {/* 3D 맵 씬 */}
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

      {/* 이륙 시퀀스 오버레이 */}
      {gamePhase === 'takeoff' && <TakeoffOverlay />}

      {/* 착륙 가능 안내 */}
      {nearLandingZone && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-orange-500/90 backdrop-blur-sm px-6 py-3 rounded-full text-white font-medium animate-bounce">
            🛬 잠실 버티포트 근접 - L 키를 눌러 착륙하세요
          </div>
        </div>
      )}

      {/* 착륙 시퀀스 오버레이 */}
      {gamePhase === 'landing' && <LandingOverlay />}
    </div>
  );
}

function TakeoffOverlay() {
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const startTimer = useGameStore((s) => s.startTimer);
  const setHudVisible = useUIStore((s) => s.setHudVisible);
  const updatePosition = useFlightStore((s) => s.updatePosition);
  const setSpeed = useFlightStore((s) => s.setSpeed);
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // 3초 카운트다운 후 이륙
    const interval = setInterval(() => {
      setCountdown((c: number) => {
        if (c <= 1) {
          clearInterval(interval);
          // 이륙 실행
          updatePosition({ altitude_m: 200 });
          setSpeed(80);
          setHudVisible(true);
          startTimer();
          setTimeout(() => setGamePhase('flying'), 1000);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [setGamePhase, startTimer, setHudVisible, updatePosition, setSpeed]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
      <div className="text-center animate-pulse">
        {countdown > 0 ? (
          <div className="text-8xl font-bold text-orange-400">{countdown}</div>
        ) : (
          <div className="text-4xl font-bold text-orange-400">TAKEOFF!</div>
        )}
      </div>
    </div>
  );
}

function LandingOverlay() {
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const setHudVisible = useUIStore((s) => s.setHudVisible);
  const [landingPhase, setLandingPhase] = useState<'descending' | 'touchdown' | 'complete'>('descending');

  useEffect(() => {
    // 착륙 시퀀스: 하강 → 터치다운 → 완료
    const t1 = setTimeout(() => setLandingPhase('touchdown'), 2000);
    const t2 = setTimeout(() => setLandingPhase('complete'), 3500);
    const t3 = setTimeout(() => {
      setHudVisible(false);
      setGamePhase('result');
    }, 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [setGamePhase, setHudVisible]);

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
