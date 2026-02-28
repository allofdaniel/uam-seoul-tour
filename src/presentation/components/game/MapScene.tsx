'use client';

import { useEffect, useRef, useState } from 'react';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';

export default function MapScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number>(0);
  const position = useFlightStore((s) => s.position);
  const heading = useFlightStore((s) => s.heading);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Mapbox 토큰이 없으면 fallback UI 표시
    if (!token) {
      setMapLoaded(true);
      return;
    }

    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = token;

      const map = new mapboxgl.default.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [126.9245, 37.5219], // 여의도
        zoom: 14,
        pitch: 60,
        bearing: 90,
        antialias: true,
      });

      map.on('load', () => {
        // 3D 지형 활성화
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

        // 안개 효과
        map.setFog({
          range: [0.5, 10],
          color: '#1a1a2e',
          'horizon-blend': 0.1,
          'high-color': '#1a1a2e',
          'space-color': '#000000',
          'star-intensity': 0.5,
        });

        // 3D 건물 레이어
        const layers = map.getStyle().layers;
        const labelLayerId = layers?.find(
          (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
        )?.id;

        map.addLayer(
          {
            id: '3d-buildings',
            source: 'composite',
            'source-layer': 'building',
            filter: ['==', 'extrude', 'true'],
            type: 'fill-extrusion',
            minzoom: 12,
            paint: {
              'fill-extrusion-color': '#2a2a3e',
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-base': ['get', 'min_height'],
              'fill-extrusion-opacity': 0.7,
            },
          },
          labelLayerId
        );

        setMapLoaded(true);
      });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 카메라 추적
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;
    map.easeTo({
      center: [position.lon, position.lat],
      bearing: heading,
      pitch: 60,
      zoom: 14.5 - (position.altitude_m / 500) * 2,
      duration: 100,
    });
  }, [position.lat, position.lon, position.altitude_m, heading, mapLoaded]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          {/* 맵이 없을 때 3D 에셋과 기본 UI 표시 */}
          <FallbackScene />
        </div>
      )}
    </div>
  );
}

function FallbackScene() {
  const position = useFlightStore((s) => s.position);
  const heading = useFlightStore((s) => s.heading);
  const speed = useFlightStore((s) => s.speed_kmh);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-gray-800 via-gray-900 to-black flex items-center justify-center">
      {/* 그리드 배경 (비행 감각 제공) */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,165,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,165,0,0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          transform: `perspective(500px) rotateX(60deg) translateY(${(Date.now() / 50) % 50}px)`,
        }}
      />

      {/* UAM 기체 표시 */}
      <div className="relative z-10 text-center">
        <div
          className="text-6xl transition-transform duration-200"
          style={{ transform: `rotate(${heading - 90}deg)` }}
        >
          ✈️
        </div>
        <div className="mt-4 text-orange-400 font-mono text-sm">
          <p>LAT: {position.lat.toFixed(4)} LON: {position.lon.toFixed(4)}</p>
          <p>ALT: {position.altitude_m.toFixed(0)}m SPD: {speed.toFixed(0)}km/h HDG: {heading.toFixed(0)}°</p>
        </div>
        <p className="text-gray-500 text-xs mt-4">
          Mapbox 토큰을 설정하면 3D 서울 지형이 표시됩니다
        </p>
      </div>
    </div>
  );
}
