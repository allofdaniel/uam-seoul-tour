'use client';

import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import poiData from '@/infrastructure/data/poi-data.json';

export default function MiniMap() {
  const position = useFlightStore((s) => s.position);
  const heading = useFlightStore((s) => s.heading);
  const trail = useFlightStore((s) => s.trail);
  const visitedPOIIds = useGameStore((s) => s.visitedPOIIds);
  const showMiniMap = useUIStore((s) => s.showMiniMap);
  const isMobile = useUIStore((s) => s.isMobile);

  if (!showMiniMap || isMobile) return null;

  // 미니맵 범위 (약 5km)
  const range = 0.03; // 위경도 범위
  const mapSize = 180;

  const toMapCoord = (lat: number, lon: number) => {
    const x = ((lon - position.lon + range) / (range * 2)) * mapSize;
    const y = ((position.lat + range - lat) / (range * 2)) * mapSize;
    return { x: Math.max(0, Math.min(mapSize, x)), y: Math.max(0, Math.min(mapSize, y)) };
  };

  const nearbyPOIs = (poiData as any[]).filter((poi) => {
    const dLat = Math.abs(poi.lat - position.lat);
    const dLon = Math.abs(poi.lon - position.lon);
    return dLat < range && dLon < range;
  });

  return (
    <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
      <div className="bg-black/60 backdrop-blur-md border border-gray-700/50 rounded-xl overflow-hidden">
        <svg width={mapSize} height={mapSize} className="block">
          {/* 배경 */}
          <rect width={mapSize} height={mapSize} fill="rgba(10,10,30,0.8)" />

          {/* 그리드 */}
          {[0.25, 0.5, 0.75].map((f) => (
            <g key={f}>
              <line x1={f * mapSize} y1={0} x2={f * mapSize} y2={mapSize} stroke="rgba(100,100,150,0.2)" />
              <line x1={0} y1={f * mapSize} x2={mapSize} y2={f * mapSize} stroke="rgba(100,100,150,0.2)" />
            </g>
          ))}

          {/* Trail */}
          {trail.length > 1 && (
            <polyline
              points={trail.slice(-200).map((p) => {
                const c = toMapCoord(p.lat, p.lon);
                return `${c.x},${c.y}`;
              }).join(' ')}
              fill="none"
              stroke="rgba(255,165,0,0.4)"
              strokeWidth="1.5"
            />
          )}

          {/* POI 마커 */}
          {nearbyPOIs.map((poi) => {
            const c = toMapCoord(poi.lat, poi.lon);
            const visited = visitedPOIIds.includes(poi.id);
            return (
              <g key={poi.id}>
                <circle cx={c.x} cy={c.y} r={4} fill={visited ? '#22c55e' : '#3b82f6'} opacity={0.8} />
                <circle cx={c.x} cy={c.y} r={6} fill="none" stroke={visited ? '#22c55e' : '#3b82f6'} opacity={0.3} strokeWidth={1} />
              </g>
            );
          })}

          {/* 현재 위치 (중앙) */}
          <g transform={`translate(${mapSize / 2}, ${mapSize / 2}) rotate(${heading})`}>
            <polygon points="0,-8 -5,5 5,5" fill="#f97316" stroke="#fff" strokeWidth="1" />
          </g>
        </svg>
      </div>
    </div>
  );
}
