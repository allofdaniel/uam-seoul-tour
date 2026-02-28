import { create } from 'zustand';
import { GamePhase, Language, POICategoryCode, PilotProfile } from '@/domain/types';

interface GameState {
  gamePhase: GamePhase;
  language: Language;
  preferences: POICategoryCode[];
  pilotProfile: PilotProfile;
  visitedPOIIds: string[];
  startTime: number;
  elapsedSeconds: number;
  distanceTraveled_km: number;
  totalNarrations: number;

  // Actions
  setGamePhase: (phase: GamePhase) => void;
  setLanguage: (lang: Language) => void;
  setPreferences: (prefs: POICategoryCode[]) => void;
  setPilotProfile: (profile: PilotProfile) => void;
  addVisitedPOI: (poiId: string) => void;
  startTimer: () => void;
  updateElapsed: () => void;
  addDistance: (km: number) => void;
  incrementNarrations: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  gamePhase: 'loading',
  language: 'ko',
  preferences: [],
  pilotProfile: { callsign: 'PILOT', experienceLevel: 'beginner' },
  visitedPOIIds: [],
  startTime: 0,
  elapsedSeconds: 0,
  distanceTraveled_km: 0,
  totalNarrations: 0,

  setGamePhase: (phase) => set({ gamePhase: phase }),
  setLanguage: (lang) => set({ language: lang }),
  setPreferences: (prefs) => set({ preferences: prefs }),
  setPilotProfile: (profile) => set({ pilotProfile: profile }),
  addVisitedPOI: (poiId) => set((s) => ({
    visitedPOIIds: s.visitedPOIIds.includes(poiId) ? s.visitedPOIIds : [...s.visitedPOIIds, poiId],
  })),
  startTimer: () => set({ startTime: Date.now(), elapsedSeconds: 0 }),
  updateElapsed: () => {
    const s = get();
    if (s.startTime > 0) {
      set({ elapsedSeconds: Math.floor((Date.now() - s.startTime) / 1000) });
    }
  },
  addDistance: (km) => set((s) => ({ distanceTraveled_km: s.distanceTraveled_km + km })),
  incrementNarrations: () => set((s) => ({ totalNarrations: s.totalNarrations + 1 })),
  resetGame: () => set({
    gamePhase: 'onboarding',
    preferences: [],
    visitedPOIIds: [],
    startTime: 0,
    elapsedSeconds: 0,
    distanceTraveled_km: 0,
    totalNarrations: 0,
  }),
}));
