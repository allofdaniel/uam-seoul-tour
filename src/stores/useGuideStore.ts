import { create } from 'zustand';
import { POI, TriggerType, NarrationRecord } from '@/domain/types';

interface GuideState {
  isNarrating: boolean;
  currentPOI: POI | null;
  currentTrigger: TriggerType | null;
  narrationText: string;
  highlightKeyword: string;
  displayImage: string;
  audioEnabled: boolean;
  guideQueue: POI[];
  narrationHistory: NarrationRecord[];
  pendingTransition: boolean;
  lastNarrationTime: number;

  // Actions
  startNarration: (poi: POI, trigger: TriggerType) => void;
  setNarrationText: (text: string, keyword?: string) => void;
  endNarration: () => void;
  enqueuePOI: (poi: POI) => void;
  dequeuePOI: () => POI | null;
  toggleAudio: () => void;
  setDisplayImage: (url: string) => void;
  setPendingTransition: (pending: boolean) => void;
  addToHistory: (record: NarrationRecord) => void;
  getRecentHistory: (count?: number) => NarrationRecord[];
  canNarrate: () => boolean;
  resetGuide: () => void;
}

const MIN_NARRATION_INTERVAL = 10000; // 10초

export const useGuideStore = create<GuideState>((set, get) => ({
  isNarrating: false,
  currentPOI: null,
  currentTrigger: null,
  narrationText: '',
  highlightKeyword: '',
  displayImage: '',
  audioEnabled: true,
  guideQueue: [],
  narrationHistory: [],
  pendingTransition: false,
  lastNarrationTime: 0,

  startNarration: (poi, trigger) => set({
    isNarrating: true,
    currentPOI: poi,
    currentTrigger: trigger,
    narrationText: '',
    highlightKeyword: '',
    displayImage: poi.images?.[0]?.image_url || '',
    pendingTransition: false,
  }),

  setNarrationText: (text, keyword) => set({
    narrationText: text,
    highlightKeyword: keyword || '',
  }),

  endNarration: () => {
    const state = get();
    if (state.currentPOI && state.narrationText) {
      const record: NarrationRecord = {
        poiId: state.currentPOI.id,
        poiName: state.currentPOI.name,
        narration: state.narrationText,
        context: state.currentTrigger || 'passing',
        timestamp: Date.now(),
      };
      set((s) => ({
        isNarrating: false,
        currentPOI: null,
        currentTrigger: null,
        narrationText: '',
        highlightKeyword: '',
        displayImage: '',
        lastNarrationTime: Date.now(),
        narrationHistory: [...s.narrationHistory.slice(-2), record], // 최근 3건 유지
      }));
    } else {
      set({
        isNarrating: false,
        currentPOI: null,
        currentTrigger: null,
        narrationText: '',
        highlightKeyword: '',
        displayImage: '',
        lastNarrationTime: Date.now(),
      });
    }
  },

  enqueuePOI: (poi) => set((s) => {
    if (s.guideQueue.find(p => p.id === poi.id)) return s;
    return { guideQueue: [...s.guideQueue, poi] };
  }),

  dequeuePOI: () => {
    const state = get();
    if (state.guideQueue.length === 0) return null;
    const [next, ...rest] = state.guideQueue;
    set({ guideQueue: rest });
    return next;
  },

  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  setDisplayImage: (url) => set({ displayImage: url }),
  setPendingTransition: (pending) => set({ pendingTransition: pending }),

  addToHistory: (record) => set((s) => ({
    narrationHistory: [...s.narrationHistory.slice(-2), record],
  })),

  getRecentHistory: (count = 3) => {
    return get().narrationHistory.slice(-count);
  },

  canNarrate: () => {
    const state = get();
    return !state.isNarrating && (Date.now() - state.lastNarrationTime >= MIN_NARRATION_INTERVAL);
  },

  resetGuide: () => set({
    isNarrating: false,
    currentPOI: null,
    currentTrigger: null,
    narrationText: '',
    highlightKeyword: '',
    displayImage: '',
    guideQueue: [],
    narrationHistory: [],
    pendingTransition: false,
    lastNarrationTime: 0,
  }),
}));
