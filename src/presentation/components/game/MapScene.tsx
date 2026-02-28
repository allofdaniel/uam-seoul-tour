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
  const altitude = useFlightStore((s) => s.position.altitude_m);

  // 한강 라인 (간략화)
  const hangang = [
    { lat: 37.530, lon: 126.85 },
    { lat: 37.535, lon: 126.90 },
    { lat: 37.527, lon: 126.93 },
    { lat: 37.520, lon: 126.96 },
    { lat: 37.517, lon: 127.00 },
    { lat: 37.520, lon: 127.04 },
    { lat: 37.518, lon: 127.08 },
    { lat: 37.512, lon: 127.10 },
  ];

  // 랜드마크 좌표
  const landmarks = [
    { name: '여의도', lat: 37.5219, lon: 126.9245, emoji: '🏢' },
    { name: '남산타워', lat: 37.5512, lon: 126.9882, emoji: '🗼' },
    { name: '롯데타워', lat: 37.5126, lon: 127.1025, emoji: '🏗️' },
    { name: '국회', lat: 37.5313, lon: 126.9145, emoji: '🏛️' },
  ];

  const viewRange = 0.08;
  const mapW = '100%';
  const svgSize = 600;

  const toSvg = (lat: number, lon: number) => ({
    x: ((lon - position.lon + viewRange) / (viewRange * 2)) * svgSize,
    y: ((position.lat + viewRange - lat) / (viewRange * 2)) * svgSize,
  });

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-gray-900 via-[#0a0a1a] to-black overflow-hidden">
      {/* SVG 지도 배경 */}
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* 그리드 */}
        {Array.from({ length: 20 }, (_, i) => i * (svgSize / 20)).map((v) => (
          <g key={v}>
            <line x1={v} y1={0} x2={v} y2={svgSize} stroke="rgba(100,130,180,0.08)" strokeWidth="0.5" />
            <line x1={0} y1={v} x2={svgSize} y2={v} stroke="rgba(100,130,180,0.08)" strokeWidth="0.5" />
          </g>
        ))}

        {/* 한강 */}
        <polyline
          points={hangang.map((p) => { const s = toSvg(p.lat, p.lon); return `${s.x},${s.y}`; }).join(' ')}
          fill="none" stroke="rgba(59,130,246,0.3)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"
        />

        {/* 랜드마크 */}
        {landmarks.map((lm) => {
          const s = toSvg(lm.lat, lm.lon);
          return (
            <g key={lm.name}>
              <circle cx={s.x} cy={s.y} r={12} fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
              <text x={s.x} y={s.y + 5} textAnchor="middle" fontSize="14">{lm.emoji}</text>
              <text x={s.x} y={s.y + 22} textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.6)">{lm.name}</text>
            </g>
          );
        })}

        {/* 현재 위치 - UAM 기체 */}
        <g transform={`translate(${svgSize / 2}, ${svgSize / 2}) rotate(${heading})`}>
          <polygon points="0,-18 -10,12 0,6 10,12" fill="#f97316" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
        </g>

        {/* 고도 표시 원 */}
        <circle cx={svgSize / 2} cy={svgSize / 2} r={30} fill="none" stroke="rgba(249,115,22,0.3)" strokeWidth="1" strokeDasharray="4,3" />
      </svg>

      {/* HUD 오버레이 정보 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-black/60 backdrop-blur-sm border border-gray-700/50 rounded-xl px-6 py-3 text-center">
          <div className="text-orange-400 font-mono text-xs mb-1">
            <span>LAT {position.lat.toFixed(4)}°N</span>
            <span className="mx-3 text-gray-600">|</span>
            <span>LON {position.lon.toFixed(4)}°E</span>
          </div>
          <div className="text-white font-mono text-sm font-bold">
            ALT {altitude.toFixed(0)}m · SPD {speed.toFixed(0)}km/h · HDG {heading.toFixed(0)}°
          </div>
        </div>
      </div>

      {/* 상단 구역 표시 */}
      <div className="absolute top-4 left-4 z-10 text-xs font-mono text-gray-500">
        <div className="bg-black/40 rounded px-2 py-1">Seoul TMA · FL185/1000ft AGL</div>
      </div>
    </div>
  );
}
