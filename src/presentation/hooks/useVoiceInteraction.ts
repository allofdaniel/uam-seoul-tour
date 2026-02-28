'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useVoiceStore } from '@/stores/useVoiceStore';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';
import { useGuideStore } from '@/stores/useGuideStore';
import { haversineDistance, calculateBearing } from '@/domain/utils/geo';
import type { VoiceGuideRequest, POI } from '@/domain/types';
import poiData from '@/infrastructure/data/poi-data.json';

const MAX_LISTEN_MS = 10000; // 10초 최대 청취
const SILENCE_TIMEOUT_MS = 3000; // 말 멈춘 후 3초 침묵 시 자동 종료
const NEARBY_RANGE_M = 5000; // 5km 이내 POI 수집

// SpeechRecognition 타입 정의
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export default function useVoiceInteraction() {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokenRef = useRef(false);
  const isActiveRef = useRef(false);

  const {
    voicePhase,
    micPermission,
    startListening,
    setTranscript,
    setInterimTranscript,
    setProcessing,
    setResponding,
    resetVoice,
    setMicPermission,
    setError,
  } = useVoiceStore();

  // 브라우저 SpeechRecognition 지원 여부
  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // 주변 POI 수집
  const collectNearbyPOIs = useCallback(() => {
    const flight = useFlightStore.getState();
    const { lat, lon } = flight.position;
    const heading = flight.heading;

    const nearby: VoiceGuideRequest['nearbyPOIs'] = [];
    for (const poi of poiData as POI[]) {
      const dist = haversineDistance({ lat, lon }, { lat: poi.lat, lon: poi.lon });
      if (dist <= NEARBY_RANGE_M) {
        const bearing = calculateBearing({ lat, lon }, { lat: poi.lat, lon: poi.lon });
        nearby.push({
          name: poi.name,
          name_en: poi.name_en,
          category: poi.category_code,
          description: poi.description,
          distance_m: Math.round(dist),
          bearing: Math.round(bearing),
        });
      }
    }

    // 거리순 정렬, 최대 5개
    return nearby.sort((a, b) => a.distance_m - b.distance_m).slice(0, 5);
  }, []);

  // 현재 구역 판별 (간단한 구현)
  const getCurrentZone = useCallback((): string | null => {
    const { lat, lon } = useFlightStore.getState().position;
    if (lat > 37.50 && lat < 37.54 && lon > 126.90 && lon < 126.95) return '여의도';
    if (lat > 37.52 && lat < 37.56 && lon > 126.95 && lon < 127.01) return '용산';
    if (lat > 37.49 && lat < 37.53 && lon > 127.01 && lon < 127.07) return '강남';
    if (lat > 37.50 && lat < 37.53 && lon > 127.07 && lon < 127.12) return '잠실';
    return '서울';
  }, []);

  // API 호출
  const callVoiceGuideAPI = useCallback(async (question: string) => {
    const flight = useFlightStore.getState();
    const game = useGameStore.getState();
    const nearbyPOIs = collectNearbyPOIs();
    const zone = getCurrentZone();

    const request: VoiceGuideRequest = {
      userQuestion: question,
      vehiclePosition: flight.position,
      heading: flight.heading,
      speed_kmh: flight.speed_kmh,
      nearbyPOIs,
      zone,
      language: game.language,
      pilotProfile: game.pilotProfile,
    };

    try {
      const response = await fetch('/api/voice-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (response.status === 429) {
        const data = await response.json();
        setError(
          game.language === 'ko'
            ? `잠시 후 다시 시도해주세요 (${data.retryAfter}초)`
            : `Please try again in ${data.retryAfter} seconds`
        );
        return;
      }

      if (!response.ok) {
        throw new Error('API error');
      }

      const data = await response.json();

      // GuidePanel에 음성 응답 표시
      const guide = useGuideStore.getState();
      guide.setVoiceNarration(data.answer, data.highlightKeyword);

      setResponding(data.answer, data.highlightKeyword, data.relatedPOI);

      // TTS 재생
      if (guide.audioEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(data.answer);
        utterance.lang = game.language === 'ko' ? 'ko-KR' : 'en-US';
        utterance.rate = 0.9;
        utterance.onend = () => {
          // 응답 완료 후 일정 시간 유지 후 리셋
          setTimeout(() => {
            resetVoice();
            useGuideStore.getState().endNarration();
          }, 2000);
        };
        utterance.onerror = () => {
          // TTS 실패해도 텍스트는 표시 유지
          setTimeout(() => {
            resetVoice();
            useGuideStore.getState().endNarration();
          }, 8000);
        };
        speechSynthesis.speak(utterance);
      } else {
        // TTS 미지원 시 텍스트만 표시
        setTimeout(() => {
          resetVoice();
          useGuideStore.getState().endNarration();
        }, 8000);
      }
    } catch {
      const lang = useGameStore.getState().language;
      setError(
        lang === 'ko'
          ? 'AI 응답을 받을 수 없습니다. 다시 시도해주세요.'
          : 'Could not get AI response. Please try again.'
      );
    }
  }, [collectNearbyPOIs, getCurrentZone, setResponding, resetVoice, setError]);

  // 음성 인식 시작
  const startVoiceInput = useCallback(async () => {
    if (!isSupported) {
      setError(
        useGameStore.getState().language === 'ko'
          ? '이 브라우저에서는 음성 인식을 지원하지 않습니다.'
          : 'Speech recognition is not supported in this browser.'
      );
      return;
    }

    if (voicePhase !== 'idle') return;

    // 마이크 권한을 먼저 명시적으로 요청
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 권한 확보 후 트랙 해제 (SpeechRecognition이 별도로 마이크 사용)
      stream.getTracks().forEach(track => track.stop());
      setMicPermission('granted');
    } catch {
      setMicPermission('denied');
      setError(
        useGameStore.getState().language === 'ko'
          ? '마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.'
          : 'Microphone permission denied. Please allow it in browser settings.'
      );
      return;
    }

    // 기존 TTS 중지
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // 자동 안내 중이면 중단
    const guide = useGuideStore.getState();
    if (guide.isNarrating) {
      guide.endNarration();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = useGameStore.getState().language === 'ko' ? 'ko-KR' : 'en-US';

    let finalTranscript = '';
    hasSpokenRef.current = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (finalTranscript) setTranscript(finalTranscript);
      setInterimTranscript(interim);

      // 말이 감지되면 silence 타이머 리셋
      hasSpokenRef.current = true;
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => {
        if (isActiveRef.current && recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[Voice] SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        setMicPermission('denied');
        setError(
          useGameStore.getState().language === 'ko'
            ? '마이크 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.'
            : 'Microphone permission denied. Please allow it in browser settings.'
        );
      } else if (event.error === 'no-speech') {
        // continuous 모드에서는 무시 (계속 대기)
      } else if (event.error === 'aborted') {
        // 의도적 중단은 무시
      }
    };

    recognition.onend = () => {
      console.log('[Voice] onend - transcript:', JSON.stringify(useVoiceStore.getState().transcript), 'phase:', useVoiceStore.getState().voicePhase);
      isActiveRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (silenceRef.current) {
        clearTimeout(silenceRef.current);
        silenceRef.current = null;
      }

      const transcript = useVoiceStore.getState().transcript;
      if (transcript.trim()) {
        setProcessing();
        const guideState = useGuideStore.getState();
        guideState.startNarration(
          { id: 'voice', name: '음성 대화', name_en: 'Voice Chat', zone_code: '', category_code: 'landmark', lat: 0, lon: 0, altitude_m: 0, description: '', description_en: '', images: [], tags: [], visible_range_m: 0, direction: '' },
          'passing'
        );
        callVoiceGuideAPI(transcript.trim());
      } else if (useVoiceStore.getState().voicePhase === 'listening') {
        const lang = useGameStore.getState().language;
        setError(
          lang === 'ko'
            ? '음성이 인식되지 않았습니다. 다시 시도해주세요.'
            : 'No speech detected. Please try again.'
        );
      }
    };

    recognitionRef.current = recognition;
    isActiveRef.current = true;
    startListening();

    try {
      recognition.start();
      console.log('[Voice] recognition started');
    } catch {
      setError(
        useGameStore.getState().language === 'ko'
          ? '마이크를 시작할 수 없습니다.'
          : 'Could not start microphone.'
      );
      isActiveRef.current = false;
      return;
    }

    // 최대 청취 시간 제한
    timeoutRef.current = setTimeout(() => {
      if (isActiveRef.current && recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, MAX_LISTEN_MS);
  }, [isSupported, voicePhase, startListening, setTranscript, setInterimTranscript, setProcessing, setMicPermission, setError, callVoiceGuideAPI]);

  // 음성 인식 중지
  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current && isActiveRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 토글 (시작/중지)
  const toggleVoice = useCallback(() => {
    if (voicePhase === 'idle') {
      startVoiceInput();
    } else if (voicePhase === 'listening') {
      stopVoiceInput();
    } else if (voicePhase === 'responding') {
      // 응답 중이면 TTS 중단 + 리셋
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      resetVoice();
      useGuideStore.getState().endNarration();
    }
  }, [voicePhase, startVoiceInput, stopVoiceInput, resetVoice]);

  // M키 이벤트 리스너
  useEffect(() => {
    const handler = () => toggleVoice();
    window.addEventListener('voice-toggle', handler);
    return () => window.removeEventListener('voice-toggle', handler);
  }, [toggleVoice]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (recognitionRef.current && isActiveRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (silenceRef.current) clearTimeout(silenceRef.current);
    };
  }, []);

  return {
    toggleVoice,
    isSupported,
    voicePhase,
    micPermission,
  };
}
