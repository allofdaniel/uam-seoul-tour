'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';
import Script from 'next/script';

declare global {
  interface Window {
    vw: any;
    vmap: any;
    Cesium: any;
  }
}

export default function MapScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const position = useFlightStore((s) => s.position);
  const heading = useFlightStore((s) => s.heading);
  const pitch = useFlightStore((s) => s.pitch);
  const apiKey = process.env.NEXT_PUBLIC_VWORLD_API_KEY;

  const initMap = useCallback(() => {
    if (!window.vw || mapRef.current) return;

    try {
      const vw = window.vw;

      const options = {
        mapId: 'vmap',
        initPosition: new vw.CameraPosition(
          new vw.CoordZ(126.9245, 37.5219, 500),
          new vw.Direction(90, -30, 0)
        ),
        logo: false,
        navigation: false,
      };

      const map = new vw.Map();
      map.setOption(options);
      map.setMapId('vmap');
      map.setInitPosition(
        new vw.CameraPosition(
          new vw.CoordZ(126.9245, 37.5219, 500),
          new vw.Direction(90, -30, 0)
        )
      );
      map.setLogoVisible(false);
      map.setNavigationZoomVisible(false);
      map.start();

      mapRef.current = map;

      // 맵 로딩 완료 대기
      setTimeout(() => {
        setMapLoaded(true);
      }, 2000);
    } catch (e) {
      console.error('V-World map init error:', e);
      setMapLoaded(true); // fallback으로 전환
    }
  }, []);

  // 스크립트 로드 후 맵 초기화
  useEffect(() => {
    if (scriptLoaded) {
      // V-World 스크립트가 전역 객체를 설정할 때까지 잠시 대기
      const timer = setTimeout(initMap, 500);
      return () => clearTimeout(timer);
    }
  }, [scriptLoaded, initMap]);

  // 카메라 추적 (비행 위치에 따라)
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;
    const vw = window.vw;
    if (!vw) return;

    try {
      // V-World 카메라를 현재 비행 위치로 이동
      // 카메라는 기체 뒤쪽에서 약간 위에서 바라보는 3인칭 시점
      const cameraAlt = position.altitude_m + 150; // 기체보다 150m 위
      const cameraPitch = Math.max(-60, -30 + pitch * 0.5); // 피치에 따라 조정

      const newPos = new vw.CameraPosition(
        new vw.CoordZ(position.lon, position.lat, cameraAlt),
        new vw.Direction(heading, cameraPitch, 0)
      );

      // gotoPosition 또는 setInitPosition으로 카메라 이동
      if (typeof map.gotoPosition === 'function') {
        map.gotoPosition(newPos);
      } else if (typeof map.setInitPosition === 'function') {
        map.setInitPosition(newPos);
      }

      // Cesium viewer가 있으면 직접 제어
      if (map.getViewer && typeof map.getViewer === 'function') {
        const viewer = map.getViewer();
        if (viewer && viewer.camera) {
          const Cesium = window.Cesium || (viewer.scene && viewer.scene.globe);
          if (window.Cesium) {
            viewer.camera.setView({
              destination: window.Cesium.Cartesian3.fromDegrees(
                position.lon,
                position.lat,
                cameraAlt
              ),
              orientation: {
                heading: window.Cesium.Math.toRadians(heading),
                pitch: window.Cesium.Math.toRadians(cameraPitch),
                roll: 0,
              },
            });
          }
        }
      }
    } catch {
      // 카메라 이동 실패 시 무시
    }
  }, [position.lat, position.lon, position.altitude_m, heading, pitch, mapLoaded]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          if (typeof mapRef.current.destroy === 'function') {
            mapRef.current.destroy();
          }
        } catch {
          // cleanup 실패 시 무시
        }
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <>
      {/* V-World 3D WebGL Script */}
      {apiKey && (
        <Script
          src={`https://map.vworld.kr/js/webglMapInit.js.do?version=3.0&apiKey=${apiKey}`}
          strategy="afterInteractive"
          onLoad={() => setScriptLoaded(true)}
          onError={() => {
            console.error('V-World script load failed');
            setMapLoaded(true); // fallback
          }}
        />
      )}

      <div className="absolute inset-0 w-full h-full">
        {/* V-World 맵 컨테이너 */}
        {apiKey && (
          <div
            id="vmap"
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
            style={{ display: mapLoaded && mapRef.current ? 'block' : 'none' }}
          />
        )}

        {/* Fallback UI (V-World 로딩 전 또는 토큰 없을 때) */}
        {(!mapLoaded || !apiKey || !mapRef.current) && <FallbackScene />}
      </div>
    </>
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
          backgroundImage:
            'linear-gradient(rgba(255,165,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,165,0,0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          transform: `perspective(500px) rotateX(60deg)`,
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
          <p>
            LAT: {position.lat.toFixed(4)} LON: {position.lon.toFixed(4)}
          </p>
          <p>
            ALT: {position.altitude_m.toFixed(0)}m SPD: {speed.toFixed(0)}km/h HDG:{' '}
            {heading.toFixed(0)}°
          </p>
        </div>
        <p className="text-gray-500 text-xs mt-4">3D 지도 로딩 중...</p>
      </div>
    </div>
  );
}
