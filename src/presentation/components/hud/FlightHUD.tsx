'use client';

import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';

function getCompassDirection(heading: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(heading / 45) % 8];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function FlightHUD() {
  const position = useFlightStore((s) => s.position);
  const heading = useFlightStore((s) => s.heading);
  const speed = useFlightStore((s) => s.speed_kmh);
  const isAutoCruise = useFlightStore((s) => s.isAutoCruise);
  const elapsedSeconds = useGameStore((s) => s.elapsedSeconds);

  return (
    <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex justify-center px-4 pt-4">
        <div className="flex items-center gap-6 bg-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl px-6 py-3 text-sm font-mono">
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-xs">고도</span>
            <span className="text-white font-bold">{Math.round(position.altitude_m)}m</span>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-xs">속도</span>
            <span className="text-white font-bold">{Math.round(speed)}km/h</span>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-xs">진행방향</span>
            <span className="text-white font-bold">
              {getCompassDirection(heading)} {Math.round(heading).toString().padStart(3, '0')}°
            </span>
          </div>
          <div className="w-px h-8 bg-gray-700" />
          <div className="flex flex-col items-center">
            <span className="text-gray-400 text-xs">비행시간</span>
            <span className="text-white font-bold">{formatTime(elapsedSeconds)}</span>
          </div>
          {isAutoCruise && (
            <>
              <div className="w-px h-8 bg-gray-700" />
              <div className="px-2 py-1 bg-orange-500/20 border border-orange-500/50 rounded text-orange-400 text-xs font-bold">
                AUTO
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
