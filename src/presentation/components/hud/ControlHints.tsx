'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useGameStore } from '@/stores/useGameStore';

export default function ControlHints() {
  const { showControlHints, controlHintsOpacity, setControlHintsOpacity, setShowControlHints } = useUIStore();
  const experienceLevel = useGameStore((s) => s.pilotProfile.experienceLevel);

  useEffect(() => {
    // 베테랑은 즉시 숨김
    if (experienceLevel === 'veteran') {
      setShowControlHints(false);
      return;
    }

    // 초보가 아닌 경우 1분 후 페이드아웃
    if (experienceLevel !== 'beginner') {
      const fadeTimer = setTimeout(() => {
        const fadeInterval = setInterval(() => {
          setControlHintsOpacity(controlHintsOpacity - 0.02);
          if (controlHintsOpacity <= 0) {
            setShowControlHints(false);
            clearInterval(fadeInterval);
          }
        }, 50);
        return () => clearInterval(fadeInterval);
      }, 60000);

      return () => clearTimeout(fadeTimer);
    }
  }, [experienceLevel, controlHintsOpacity, setControlHintsOpacity, setShowControlHints]);

  if (!showControlHints) return null;

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
      style={{ opacity: controlHintsOpacity }}
    >
      <div className="bg-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl px-6 py-3">
        <div className="flex items-center gap-6 text-xs text-gray-300">
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-white">W</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-white">S</kbd>
            <span>속도</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-white">A</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-white">D</kbd>
            <span>회전</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-white">Q</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-white">E</kbd>
            <span>고도</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-2 py-0.5 bg-gray-700 rounded text-white">Space</kbd>
            <span>자동순항</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-white">L</kbd>
            <span>착륙</span>
          </div>
        </div>
      </div>
    </div>
  );
}
