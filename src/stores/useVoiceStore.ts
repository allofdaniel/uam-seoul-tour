import { create } from 'zustand';
import type { VoicePhase, MicPermission } from '@/domain/types';

interface VoiceState {
  voicePhase: VoicePhase;
  transcript: string;
  interimTranscript: string;
  micPermission: MicPermission;
  voiceResponse: string;
  voiceHighlightKeyword: string;
  voiceRelatedPOI: string | null;
  errorMessage: string;

  // Actions
  startListening: () => void;
  stopListening: () => void;
  setTranscript: (text: string) => void;
  setInterimTranscript: (text: string) => void;
  setProcessing: () => void;
  setResponding: (answer: string, keyword?: string, relatedPOI?: string | null) => void;
  resetVoice: () => void;
  setMicPermission: (status: MicPermission) => void;
  setError: (message: string) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  voicePhase: 'idle',
  transcript: '',
  interimTranscript: '',
  micPermission: 'prompt',
  voiceResponse: '',
  voiceHighlightKeyword: '',
  voiceRelatedPOI: null,
  errorMessage: '',

  startListening: () => set({
    voicePhase: 'listening',
    transcript: '',
    interimTranscript: '',
    voiceResponse: '',
    voiceHighlightKeyword: '',
    voiceRelatedPOI: null,
    errorMessage: '',
  }),

  stopListening: () => set((s) => ({
    voicePhase: s.transcript ? 'processing' : 'idle',
  })),

  setTranscript: (text) => set({ transcript: text }),
  setInterimTranscript: (text) => set({ interimTranscript: text }),

  setProcessing: () => set({ voicePhase: 'processing' }),

  setResponding: (answer, keyword, relatedPOI) => set({
    voicePhase: 'responding',
    voiceResponse: answer,
    voiceHighlightKeyword: keyword || '',
    voiceRelatedPOI: relatedPOI ?? null,
  }),

  resetVoice: () => set({
    voicePhase: 'idle',
    transcript: '',
    interimTranscript: '',
    voiceResponse: '',
    voiceHighlightKeyword: '',
    voiceRelatedPOI: null,
    errorMessage: '',
  }),

  setMicPermission: (status) => set({ micPermission: status }),
  setError: (message) => set({ errorMessage: message, voicePhase: 'idle' }),
}));
