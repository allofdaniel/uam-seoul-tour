'use client';

import { useMemo } from 'react';
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
  const mapSize = 220;

  // Mapbox 다크 위성 배경 (~100m 이동 시에만 갱신)
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_TILES_API_KEY;
  const bgUrl = useMemo(() => {
    const roundedLat = Math.round(position.lat * 1000) / 1000;
    const roundedLon = Math.round(position.lon * 1000) / 1000;
    // Mapbox Static API (dark satellite style)
    if (mapboxToken) {
      return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${roundedLon},${roundedLat},13,0/${mapSize}x${mapSize}@2x?access_token=${mapboxToken}&attribution=false&logo=false`;
    }
    // Google Maps Static API fallback
    if (googleApiKey) {
      return `https://maps.googleapis.com/maps/api/staticmap?center=${roundedLat},${roundedLon}&zoom=14&size=${mapSize}x${mapSize}&maptype=satellite&style=feature:all|element:labels|visibility:off&key=${googleApiKey}`;
    }
    return '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(position.lat * 1000), Math.round(position.lon * 1000)]);

  const toMapCoord = (lat: number, lon: number) => {
    const x = ((lon - position.lon + range) / (range * 2)) * mapSize;
    const y = ((position.lat + range - lat) / (range * 2)) * mapSize;
    return { x, y };
  };

  const clamp = (v: number) => Math.max(0, Math.min(mapSize, v));

  const nearbyPOIs = (poiData as any[]).filter((poi) => {
    return Math.abs(poi.lat - position.lat) < range && Math.abs(poi.lon - position.lon) < range;
  });

  const restrictedInRange = airspaceData.restricted_zones.filter((zone) =>
    zone.boundary.some(([lon, lat]) =>
      Math.abs(lat - position.lat) < range && Math.abs(lon - position.lon) < range
    )
  );

  const dangerInRange = airspaceData.danger_zones.filter((dz) =>
    Math.abs(dz.center[1] - position.lat) < range && Math.abs(dz.center[0] - position.lon) < range
  );

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

        <div className="relative" style={{ width: mapSize, height: mapSize }}>
          {/* 위성 배경 이미지 */}
          {bgUrl && (
            <img
              src={bgUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-60"
              draggable={false}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}

          {/* SVG 오버레이 */}
          <svg width={mapSize} height={mapSize} className="absolute inset-0 block">
            {/* 배경이 없을 경우 대체 배경 */}
            {!bgUrl && <rect width={mapSize} height={mapSize} fill="rgba(8,8,24,0.9)" />}

            {/* 그리드 */}
            {[0.2, 0.4, 0.6, 0.8].map((f) => (
              <g key={f}>
                <line x1={f * mapSize} y1={0} x2={f * mapSize} y2={mapSize} stroke="rgba(80,80,130,0.15)" />
                <line x1={0} y1={f * mapSize} x2={mapSize} y2={f * mapSize} stroke="rgba(80,80,130,0.15)" />
              </g>
            ))}

            {/* 거리 원 (1km, 3km) */}
            <circle cx={mapSize / 2} cy={mapSize / 2} r={(1 / (range * 2 * 111.32)) * mapSize}
              fill="none" stroke="rgba(200,200,255,0.15)" strokeWidth="0.5" strokeDasharray="3,3" />
            <circle cx={mapSize / 2} cy={mapSize / 2} r={(3 / (range * 2 * 111.32)) * mapSize}
              fill="none" stroke="rgba(200,200,255,0.15)" strokeWidth="0.5" strokeDasharray="3,3" />

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
                    fill={isProhibited ? 'rgba(255,0,0,0.15)' : 'rgba(255,68,68,0.10)'}
                    stroke={isProhibited ? '#ff0000' : '#ff4444'}
                    strokeWidth="1" strokeDasharray={isProhibited ? '' : '3,2'} opacity={0.8} />
                  <text x={clamp(toMapCoord(
                    zone.boundary.reduce((s, [, lat]) => s + lat, 0) / zone.boundary.length,
                    zone.boundary.reduce((s, [lon]) => s + lon, 0) / zone.boundary.length
                  ).x)} y={clamp(toMapCoord(
                    zone.boundary.reduce((s, [, lat]) => s + lat, 0) / zone.boundary.length,
                    zone.boundary.reduce((s, [lon]) => s + lon, 0) / zone.boundary.length
                  ).y)} textAnchor="middle" fontSize="7" fill={isProhibited ? '#ff4444' : '#ff8888'} opacity={0.9}
                    fontWeight="bold">
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
                  fill="rgba(255,200,0,0.1)" stroke="#ffc800" strokeWidth="0.7" strokeDasharray="2,2" opacity={0.7} />
              );
            })}

            {/* 공항 마커 */}
            {airportsInRange.map((ap) => {
              const c = toMapCoord(ap.coords[1], ap.coords[0]);
              return (
                <g key={ap.id}>
                  <circle cx={clamp(c.x)} cy={clamp(c.y)} r={5} fill="none" stroke="#60a5fa" strokeWidth="1" opacity={0.7} />
                  <line x1={clamp(c.x) - 4} y1={clamp(c.y)} x2={clamp(c.x) + 4} y2={clamp(c.y)} stroke="#60a5fa" strokeWidth="0.8" opacity={0.7} />
                  <line x1={clamp(c.x)} y1={clamp(c.y) - 4} x2={clamp(c.x)} y2={clamp(c.y) + 4} stroke="#60a5fa" strokeWidth="0.8" opacity={0.7} />
                  <text x={clamp(c.x) + 7} y={clamp(c.y) + 3} fontSize="7" fill="#60a5fa" opacity={0.8} fontWeight="bold">{ap.id}</text>
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
                stroke="rgba(255,165,0,0.6)"
                strokeWidth="1.5"
              />
            )}

            {/* POI 마커 + 이름 */}
            {nearbyPOIs.map((poi) => {
              const c = toMapCoord(poi.lat, poi.lon);
              const visited = visitedPOIIds.includes(poi.id);
              return (
                <g key={poi.id}>
                  <circle cx={clamp(c.x)} cy={clamp(c.y)} r={3.5}
                    fill={visited ? '#22c55e' : '#3b82f6'} opacity={0.9} />
                  <circle cx={clamp(c.x)} cy={clamp(c.y)} r={6}
                    fill="none" stroke={visited ? '#22c55e' : '#3b82f6'} opacity={0.4} strokeWidth={0.8} />
                  <text
                    x={clamp(c.x) + 8} y={clamp(c.y) + 3}
                    fontSize="7" fill={visited ? '#22c55e' : '#93c5fd'}
                    opacity={0.95} fontWeight="bold"
                    stroke="rgba(0,0,0,0.7)" strokeWidth="2" paintOrder="stroke"
                  >
                    {poi.name}
                  </text>
                </g>
              );
            })}

            {/* 현재 위치 (중앙) - UAM 기체 */}
            <g transform={`translate(${mapSize / 2}, ${mapSize / 2}) rotate(${heading})`}>
              <polygon points="0,-9 -5,6 0,3 5,6" fill="#f97316" stroke="#fff" strokeWidth="1" />
            </g>

            {/* 나침반 (북쪽 표시) */}
            <g transform={`translate(${mapSize - 16}, 16)`}>
              <circle r={11} fill="rgba(0,0,0,0.6)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
              <text textAnchor="middle" y={4} fontSize="10" fill="#f97316" fontWeight="bold">N</text>
            </g>
          </svg>
        </div>

        {/* 범례 */}
        <div className="bg-gray-900/80 px-2 py-1 flex gap-3 text-[8px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500/50 inline-block" /> 금지
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-500/50 inline-block rounded-full" /> 위험
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500/80 inline-block rounded-full" /> POI
          </span>
        </div>
      </div>
    </div>
  );
}
