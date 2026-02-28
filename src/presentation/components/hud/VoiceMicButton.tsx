'use client';

import { useVoiceStore } from '@/stores/useVoiceStore';
import useVoiceInteraction from '@/presentation/hooks/useVoiceInteraction';

export default function VoiceMicButton() {
  const { toggleVoice, isSupported, micPermission } = useVoiceInteraction();
  const voicePhase = useVoiceStore((s) => s.voicePhase);
  const errorMessage = useVoiceStore((s) => s.errorMessage);

  const disabled = !isSupported || micPermission === 'denied';

  return (
    <div className="absolute bottom-24 right-6 z-20 flex flex-col items-end gap-2">
      {/* 에러 메시지 */}
      {errorMessage && (
        <div className="bg-red-500/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg max-w-[200px] animate-fadeIn">
          {errorMessage}
        </div>
      )}

      {/* 마이크 버튼 */}
      <button
        onClick={toggleVoice}
        disabled={disabled}
        title={
          disabled
            ? (micPermission === 'denied' ? '마이크 권한 거부됨' : '미지원 브라우저')
            : voicePhase === 'idle'
              ? '음성 질문 (M)'
              : voicePhase === 'listening'
                ? '듣는 중... (클릭하여 중지)'
                : voicePhase === 'processing'
                  ? '처리 중...'
                  : '응답 중... (클릭하여 중지)'
        }
        className={`
          relative w-14 h-14 rounded-full flex items-center justify-center
          transition-all duration-300 pointer-events-auto
          ${disabled
            ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
            : voicePhase === 'idle'
              ? 'bg-black/60 backdrop-blur-md border border-gray-600/50 hover:border-orange-400/50 hover:bg-black/70'
              : voicePhase === 'listening'
                ? 'bg-red-500/80 border-2 border-red-400'
                : voicePhase === 'processing'
                  ? 'bg-black/70 backdrop-blur-md border border-orange-400/50'
                  : 'bg-orange-500/30 backdrop-blur-md border border-orange-400/70'
          }
        `}
      >
        {/* idle 상태: 마이크 아이콘 */}
        {voicePhase === 'idle' && (
          <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        )}

        {/* listening 상태: 펄스 링 + 파형 */}
        {voicePhase === 'listening' && (
          <>
            {/* 펄스 링 */}
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
            {/* 파형 인디케이터 */}
            <div className="flex items-center gap-0.5">
              <span className="w-1 h-3 bg-white rounded-full animate-wave1" />
              <span className="w-1 h-5 bg-white rounded-full animate-wave2" />
              <span className="w-1 h-4 bg-white rounded-full animate-wave3" />
              <span className="w-1 h-5 bg-white rounded-full animate-wave2" />
              <span className="w-1 h-3 bg-white rounded-full animate-wave1" />
            </div>
          </>
        )}

        {/* processing 상태: 스피너 */}
        {voicePhase === 'processing' && (
          <svg className="w-6 h-6 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}

        {/* responding 상태: 글로우 마이크 */}
        {voicePhase === 'responding' && (
          <>
            <span className="absolute inset-0 rounded-full bg-orange-400/20 animate-pulse" />
            <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
