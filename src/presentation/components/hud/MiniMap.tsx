'use client';

import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';
import { useUIStore } from '@/stores/useUIStore';
import poiData from '@/infrastructure/data/poi-data.json';
import airspaceData from '@/infrastructure/data/airspace-data.json';

export default function MiniMap() {
  const position = useFlightStore((s) => s.position);
  const heading = useFlightStore((s) => s.heading);
  const trail = useFlightStore((s) => s.trail);
  const visitedPOIIds = useGameStore((s) => s.visitedPOIIds);
  const showMiniMap = useUIStore((s) => s.showMiniMap);
  const isMobile = useUIStore((s) => s.isMobile);

  if (!showMiniMap || isMobile) return null;

  const range = 0.05; // 위경도 범위 (약 5.5km)
  const mapSize = 200;

  const toMapCoord = (lat: number, lon: number) => {
    const x = ((lon - position.lon + range) / (range * 2)) * mapSize;
    const y = ((position.lat + range - lat) / (range * 2)) * mapSize;
    return { x, y };
  };

  const clamp = (v: number) => Math.max(0, Math.min(mapSize, v));

  const nearbyPOIs = (poiData as any[]).filter((poi) => {
    return Math.abs(poi.lat - position.lat) < range && Math.abs(poi.lon - position.lon) < range;
  });

  // UAM 회랑 경로
  const corridor = airspaceData.uam_corridors[0];
  const corridorInRange = corridor.waypoints.filter((wp) =>
    Math.abs(wp.lat - position.lat) < range && Math.abs(wp.lon - position.lon) < range
  );

  // 비행금지/제한구역 중 미니맵 범위 내에 있는 것
  const restrictedInRange = airspaceData.restricted_zones.filter((zone) =>
    zone.boundary.some(([lon, lat]) =>
      Math.abs(lat - position.lat) < range && Math.abs(lon - position.lon) < range
    )
  );

  // 위험구역 중 범위 내
  const dangerInRange = airspaceData.danger_zones.filter((dz) =>
    Math.abs(dz.center[1] - position.lat) < range && Math.abs(dz.center[0] - position.lon) < range
  );

  // CTR 구역 범위 내
  const ctrInRange = airspaceData.ctr_zones.filter((ctr) =>
    Math.abs(ctr.center[1] - position.lat) < range * 3 && Math.abs(ctr.center[0] - position.lon) < range * 3
  );

  // 공항 범위 내
  const airportsInRange = airspaceData.airports.filter((ap) =>
    Math.abs(ap.coords[1] - position.lat) < range && Math.abs(ap.coords[0] - position.lon) < range
  );

  return (
    <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
      <div className="bg-black/70 backdrop-blur-md border border-gray-700/50 rounded-xl overflow-hidden shadow-2xl">
        {/* 미니맵 제목 */}
        <div className="bg-gray-900/80 px-3 py-1 text-xs font-mono text-gray-400 flex justify-between">
          <span>AIRSPACE MAP</span>
          <span>{position.lat.toFixed(3)}N {position.lon.toFixed(3)}E</span>
        </div>

        <svg width={mapSize} height={mapSize} className="block">
          {/* 배경 */}
          <rect width={mapSize} height={mapSize} fill="rgba(8,8,24,0.9)" />

          {/* 그리드 */}
          {[0.2, 0.4, 0.6, 0.8].map((f) => (
            <g key={f}>
              <line x1={f * mapSize} y1={0} x2={f * mapSize} y2={mapSize} stroke="rgba(80,80,130,0.15)" />
              <line x1={0} y1={f * mapSize} x2={mapSize} y2={f * mapSize} stroke="rgba(80,80,130,0.15)" />
            </g>
          ))}

          {/* 거리 원 (1km, 3km) */}
          <circle cx={mapSize / 2} cy={mapSize / 2} r={(1 / (range * 2 * 111.32)) * mapSize}
            fill="none" stroke="rgba(100,100,160,0.2)" strokeWidth="0.5" strokeDasharray="3,3" />
          <circle cx={mapSize / 2} cy={mapSize / 2} r={(3 / (range * 2 * 111.32)) * mapSize}
            fill="none" stroke="rgba(100,100,160,0.2)" strokeWidth="0.5" strokeDasharray="3,3" />

          {/* CTR 구역 (큰 원) */}
          {ctrInRange.map((ctr) => {
            const c = toMapCoord(ctr.center[1], ctr.center[0]);
            const radiusKm = ctr.radius_nm * 1.852;
            const radiusPx = (radiusKm / (range * 2 * 111.32)) * mapSize;
            return (
              <g key={ctr.id}>
                <circle cx={clamp(c.x)} cy={clamp(c.y)} r={radiusPx}
                  fill="rgba(46,204,113,0.05)" stroke={ctr.color} strokeWidth="0.8" strokeDasharray="4,2" opacity={0.5} />
                <text x={clamp(c.x)} y={clamp(c.y) - radiusPx - 2} textAnchor="middle"
                  fontSize="7" fill={ctr.color} opacity={0.6}>{ctr.name}</text>
              </g>
            );
          })}

          {/* 비행금지/제한구역 (폴리곤) */}
          {restrictedInRange.map((zone) => {
            const points = zone.boundary.map(([lon, lat]) => {
              const c = toMapCoord(lat, lon);
              return `${clamp(c.x)},${clamp(c.y)}`;
            }).join(' ');
            const isProhibited = zone.type === 'P';
            return (
              <g key={zone.id}>
                <polygon points={points}
                  fill={isProhibited ? 'rgba(255,0,0,0.12)' : 'rgba(255,68,68,0.08)'}
                  stroke={isProhibited ? '#ff0000' : '#ff4444'}
                  strokeWidth="1" strokeDasharray={isProhibited ? '' : '3,2'} opacity={0.7} />
                <text x={clamp(toMapCoord(
                  zone.boundary.reduce((s, [, lat]) => s + lat, 0) / zone.boundary.length,
                  zone.boundary.reduce((s, [lon]) => s + lon, 0) / zone.boundary.length
                ).x)} y={clamp(toMapCoord(
                  zone.boundary.reduce((s, [, lat]) => s + lat, 0) / zone.boundary.length,
                  zone.boundary.reduce((s, [lon]) => s + lon, 0) / zone.boundary.length
                ).y)} textAnchor="middle" fontSize="6" fill={isProhibited ? '#ff4444' : '#ff8888'} opacity={0.8}>
                  {zone.id}
                </text>
              </g>
            );
          })}

          {/* 위험구역 (원) */}
          {dangerInRange.map((dz) => {
            const c = toMapCoord(dz.center[1], dz.center[0]);
            const radiusKm = dz.radius_nm * 1.852;
            const radiusPx = (radiusKm / (range * 2 * 111.32)) * mapSize;
            return (
              <circle key={dz.id} cx={clamp(c.x)} cy={clamp(c.y)} r={Math.max(3, radiusPx)}
                fill="rgba(255,200,0,0.1)" stroke="#ffc800" strokeWidth="0.7" strokeDasharray="2,2" opacity={0.6} />
            );
          })}

          {/* UAM 회랑 경로 */}
          {corridorInRange.length > 1 && (
            <polyline
              points={corridorInRange.map((wp) => {
                const c = toMapCoord(wp.lat, wp.lon);
                return `${clamp(c.x)},${clamp(c.y)}`;
              }).join(' ')}
              fill="none"
              stroke="rgba(249,115,22,0.3)"
              strokeWidth="2"
              strokeDasharray="6,3"
            />
          )}

          {/* UAM 웨이포인트 */}
          {corridorInRange.map((wp, i) => {
            const c = toMapCoord(wp.lat, wp.lon);
            return (
              <g key={`wp-${i}`}>
                <rect x={clamp(c.x) - 2} y={clamp(c.y) - 2} width={4} height={4}
                  fill="#f97316" opacity={0.6} transform={`rotate(45, ${clamp(c.x)}, ${clamp(c.y)})`} />
              </g>
            );
          })}

          {/* 공항 마커 */}
          {airportsInRange.map((ap) => {
            const c = toMapCoord(ap.coords[1], ap.coords[0]);
            return (
              <g key={ap.id}>
                <circle cx={clamp(c.x)} cy={clamp(c.y)} r={5} fill="none" stroke="#60a5fa" strokeWidth="1" opacity={0.6} />
                <line x1={clamp(c.x) - 4} y1={clamp(c.y)} x2={clamp(c.x) + 4} y2={clamp(c.y)} stroke="#60a5fa" strokeWidth="0.8" opacity={0.6} />
                <line x1={clamp(c.x)} y1={clamp(c.y) - 4} x2={clamp(c.x)} y2={clamp(c.y) + 4} stroke="#60a5fa" strokeWidth="0.8" opacity={0.6} />
                <text x={clamp(c.x) + 7} y={clamp(c.y) + 3} fontSize="6" fill="#60a5fa" opacity={0.7}>{ap.id}</text>
              </g>
            );
          })}

          {/* 비행 궤적 (Trail) */}
          {trail.length > 1 && (
            <polyline
              points={trail.slice(-300).map((p) => {
                const c = toMapCoord(p.lat, p.lon);
                return `${clamp(c.x)},${clamp(c.y)}`;
              }).join(' ')}
              fill="none"
              stroke="rgba(255,165,0,0.5)"
              strokeWidth="1.5"
            />
          )}

          {/* POI 마커 */}
          {nearbyPOIs.map((poi) => {
            const c = toMapCoord(poi.lat, poi.lon);
            const visited = visitedPOIIds.includes(poi.id);
            return (
              <g key={poi.id}>
                <circle cx={clamp(c.x)} cy={clamp(c.y)} r={3.5}
                  fill={visited ? '#22c55e' : '#3b82f6'} opacity={0.8} />
                <circle cx={clamp(c.x)} cy={clamp(c.y)} r={6}
                  fill="none" stroke={visited ? '#22c55e' : '#3b82f6'} opacity={0.3} strokeWidth={0.8} />
              </g>
            );
          })}

          {/* 현재 위치 (중앙) - UAM 기체 */}
          <g transform={`translate(${mapSize / 2}, ${mapSize / 2}) rotate(${heading})`}>
            <polygon points="0,-9 -5,6 0,3 5,6" fill="#f97316" stroke="#fff" strokeWidth="0.8" />
          </g>

          {/* 나침반 (북쪽 표시) */}
          <g transform={`translate(${mapSize - 14}, 14)`}>
            <circle r={10} fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
            <text textAnchor="middle" y={4} fontSize="9" fill="#f97316" fontWeight="bold">N</text>
          </g>
        </svg>

        {/* 범례 */}
        <div className="bg-gray-900/80 px-2 py-1 flex gap-3 text-[8px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500/50 inline-block" /> 금지
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500/50 inline-block rounded-full" /> 위험
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-orange-500/50 inline-block" style={{ transform: 'rotate(45deg)' }} /> 회랑
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500/80 inline-block rounded-full" /> POI
          </span>
        </div>
      </div>
    </div>
  );
}
