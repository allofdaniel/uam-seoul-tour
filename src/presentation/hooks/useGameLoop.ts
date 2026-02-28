'use client';

import { useEffect, useRef } from 'react';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';

const TRAIL_INTERVAL = 500; // 500ms마다 궤적 기록

export default function useGameLoop() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const lastTrailRef = useRef<number>(0);

  useEffect(() => {
    if (gamePhase !== 'flying') return;

    const loop = () => {
      const now = Date.now();

      // 경과 시간 업데이트
      useGameStore.getState().updateElapsed();

      // 궤적 기록
      if (now - lastTrailRef.current >= TRAIL_INTERVAL) {
        useFlightStore.getState().addTrailPoint();
        lastTrailRef.current = now;
      }

      animRef.current = requestAnimationFrame(loop);
    };

    const animRef = { current: requestAnimationFrame(loop) };

    return () => cancelAnimationFrame(animRef.current);
  }, [gamePhase]);
}
