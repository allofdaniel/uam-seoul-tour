'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import LoadingScreen from '@/presentation/components/onboarding/LoadingScreen';
import OnboardingFlow from '@/presentation/components/onboarding/OnboardingFlow';
import GameView from '@/presentation/components/game/GameView';
import ResultScreen from '@/presentation/components/result/ResultScreen';

export default function Home() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const setIsMobile = useUIStore((s) => s.setIsMobile);
  const setIsWebGLSupported = useUIStore((s) => s.setIsWebGLSupported);

  useEffect(() => {
    // 모바일 감지
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // WebGL 지원 체크
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      setIsWebGLSupported(!!gl);
    } catch {
      setIsWebGLSupported(false);
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile, setIsWebGLSupported]);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {gamePhase === 'loading' && <LoadingScreen />}
      {gamePhase === 'onboarding' && <OnboardingFlow />}
      {(gamePhase === 'takeoff' || gamePhase === 'flying' || gamePhase === 'landing') && (
        <GameView />
      )}
      {gamePhase === 'result' && <ResultScreen />}
    </main>
  );
}
