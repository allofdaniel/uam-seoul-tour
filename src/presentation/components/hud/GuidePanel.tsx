'use client';

import { useEffect, useState } from 'react';
import { useGuideStore } from '@/stores/useGuideStore';

export default function GuidePanel() {
  const { isNarrating, narrationText, highlightKeyword, currentPOI, displayImage, audioEnabled, toggleAudio, pendingTransition } = useGuideStore();
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

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

  // 안내가 없으면 숨김
  if (!isNarrating && !narrationText) return null;

  return (
    <div className="absolute bottom-6 right-6 z-20 max-w-sm animate-slideInRight">
      <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-2xl p-4 shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-orange-400">🎙️</span>
            <span className="text-orange-400 text-sm font-semibold">AI 가이드</span>
            {pendingTransition && (
              <span className="text-xs text-yellow-400 animate-pulse">전환 중...</span>
            )}
          </div>
          <button
            onClick={toggleAudio}
            className="text-gray-400 hover:text-white transition-colors text-sm pointer-events-auto"
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* POI 이름 */}
        {currentPOI && (
          <div className="mb-2">
            <span className="text-white font-bold">{currentPOI.name}</span>
            <span className="text-gray-400 text-xs ml-2">{currentPOI.name_en}</span>
          </div>
        )}

        {/* 안내 텍스트 */}
        <div className="text-gray-200 text-sm leading-relaxed min-h-[3rem]">
          {isNarrating && !narrationText ? (
            <span className="text-gray-400 animate-pulse">안내 준비 중...</span>
          ) : (
            <>
              {displayText}
              {isTyping && <span className="inline-block w-1 h-4 bg-orange-400 animate-pulse ml-0.5" />}
            </>
          )}
        </div>

        {/* POI 이미지 (있을 경우) */}
        {displayImage && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <img src={displayImage} alt={currentPOI?.name || ''} className="w-full h-32 object-cover" />
          </div>
        )}

        {/* 하이라이트 키워드 */}
        {highlightKeyword && (
          <div className="mt-2">
            <span className="inline-block px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400 text-xs">
              #{highlightKeyword}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
