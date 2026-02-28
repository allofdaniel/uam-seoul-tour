import { create } from 'zustand';
import { Position, TrailPoint } from '@/domain/types';

interface FlightState {
  position: Position;
  heading: number;        // 0-360
  speed_kmh: number;
  pitch: number;
  roll: number;
  isAutoCruise: boolean;
  trail: TrailPoint[];
  trailSequence: number;

  // Actions
  updatePosition: (pos: Partial<Position>) => void;
  setHeading: (h: number) => void;
  setSpeed: (s: number) => void;
  setPitch: (p: number) => void;
  setRoll: (r: number) => void;
  toggleAutoCruise: () => void;
  addTrailPoint: () => void;
  resetFlight: () => void;
}

// 초기 위치: 여의도 버티포트 (고도 0m, 지면)
const INITIAL_POSITION: Position = { lat: 37.5219, lon: 126.9245, altitude_m: 0 };

export const useFlightStore = create<FlightState>((set, get) => ({
  position: { ...INITIAL_POSITION },
  heading: 90, // 동쪽 (잠실 방향)
  speed_kmh: 0,
  pitch: 0,
  roll: 0,
  isAutoCruise: false,
  trail: [],
  trailSequence: 0,

  updatePosition: (pos) => set((state) => ({ position: { ...state.position, ...pos } })),
  setHeading: (h) => set({ heading: ((h % 360) + 360) % 360 }),
  setSpeed: (s) => set({ speed_kmh: Math.max(0, Math.min(350, s)) }),
  setPitch: (p) => set({ pitch: Math.max(-30, Math.min(30, p)) }),
  setRoll: (r) => set({ roll: Math.max(-45, Math.min(45, r)) }),
  toggleAutoCruise: () => set((state) => ({ isAutoCruise: !state.isAutoCruise })),
  addTrailPoint: () => {
    const state = get();
    const point: TrailPoint = {
      lat: state.position.lat,
      lon: state.position.lon,
      altitude_m: state.position.altitude_m,
      heading: state.heading,
      speed_kmh: state.speed_kmh,
      sequence: state.trailSequence,
      recorded_at: Date.now(),
    };
    set((s) => ({
      trail: [...s.trail.slice(-1999), point], // 최대 2000 포인트
      trailSequence: s.trailSequence + 1,
    }));
  },
  resetFlight: () => set({
    position: { ...INITIAL_POSITION },
    heading: 90,
    speed_kmh: 0,
    pitch: 0,
    roll: 0,
    isAutoCruise: false,
    trail: [],
    trailSequence: 0,
  }),
}));
