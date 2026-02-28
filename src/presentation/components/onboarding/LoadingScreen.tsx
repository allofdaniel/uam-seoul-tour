'use client';

import { useEffect, useState } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';

export default function LoadingScreen() {
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const { setLoadingProgress, loadingProgress, isWebGLSupported } = useUIStore();
  const [dots, setDots] = useState('');

  useEffect(() => {
    // 로딩 애니메이션
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);

    // 로딩 프로그레스 시뮬레이션 (functional updater로 stale closure 방지)
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15 + 5;
      setLoadingProgress(Math.min(100, progress));
      if (progress >= 100) clearInterval(progressInterval);
    }, 300);

    return () => {
      clearInterval(dotInterval);
      clearInterval(progressInterval);
    };
  }, [setLoadingProgress]);

  useEffect(() => {
    if (loadingProgress >= 100) {
      const timer = setTimeout(() => {
        setGamePhase('onboarding');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress, setGamePhase]);

  if (!isWebGLSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold mb-4">WebGL을 지원하지 않는 브라우저입니다</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          SKYBOUND는 3D 그래픽을 사용합니다.<br />
          Chrome, Safari, Edge 등 최신 브라우저에서 접속해주세요.
        </p>
        <a
          href="https://www.google.com/chrome/"
          className="px-6 py-3 bg-orange-500 rounded-full text-white font-medium hover:bg-orange-600 transition-colors"
        >
          Chrome 다운로드
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white relative overflow-hidden">
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 via-black to-black" />

      {/* 로고 */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="text-4xl mb-2">✈️</div>
        <h1 className="text-3xl font-bold tracking-widest text-orange-400 mb-2">
          SKYBOUND
        </h1>
        <p className="text-gray-400 text-sm mb-12">
          서울 하늘을 여행하는 새로운 방법
        </p>

        {/* 프로그레스 바 */}
        <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, loadingProgress)}%` }}
          />
        </div>

        <p className="text-gray-500 text-sm">
          {loadingProgress < 30 && `에셋 로딩 중${dots}`}
          {loadingProgress >= 30 && loadingProgress < 60 && `서울 지형 준비 중${dots}`}
          {loadingProgress >= 60 && loadingProgress < 90 && `비행 시스템 초기화${dots}`}
          {loadingProgress >= 90 && '준비 완료!'}
        </p>
      </div>
    </div>
  );
}
