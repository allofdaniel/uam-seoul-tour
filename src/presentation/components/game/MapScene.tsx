'use client';

import { useEffect, useRef, useState } from 'react';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';
import poiDataRaw from '@/infrastructure/data/poi-data.json';

const poiData = poiDataRaw as Array<{
  id: string;
  name: string;
  name_en: string;
  lat: number;
  lon: number;
  altitude_m: number;
  category_code: string;
  tags: string[];
  images: Array<{ image_url: string }>;
}>;

const CESIUM_ION_TOKEN = (
  process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YWMwMTA2NC00NzEzLTQ2YmYtYTRjZC0wNjVkMTViZWIxYjkiLCJpZCI6MjU2MTQ5LCJpYXQiOjE3MzE5MzY0NjB9.suBcNNjrHr_5CMOkRKudiPALHhPeqA97jXuMMrUpqp8'
).trim();

// POI 핀 마커 SVG (오렌지/초록)
function createPinDataUri(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
    <defs><filter id="s"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.5"/></filter></defs>
    <path d="M18 0C8 0 0 8 0 18c0 14 18 30 18 30s18-16 18-30C36 8 28 0 18 0z" fill="${color}" filter="url(#s)"/>
    <circle cx="18" cy="18" r="7" fill="white"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export default function MapScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    const initViewer = () => {
      if (destroyed || !containerRef.current) return;

      const Cesium = (window as any).Cesium;
      if (!Cesium) {
        requestAnimationFrame(initViewer);
        return;
      }

      // Cesium Ion 토큰
      Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

      // Google Maps API 키
      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_TILES_API_KEY;
      if (googleApiKey && Cesium.GoogleMaps) {
        Cesium.GoogleMaps.defaultApiKey = googleApiKey;
      }

      // Viewer 생성
      const viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        scene3DOnly: true,
        requestRenderMode: false,
        msaaSamples: 4,
      });

      // 기본 크레딧 숨김
      try {
        const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
        if (creditContainer) creditContainer.style.display = 'none';
      } catch {}

      // 카메라 컨트롤 비활성화 (직접 제어)
      const sc = viewer.scene.screenSpaceCameraController;
      sc.enableRotate = false;
      sc.enableTranslate = false;
      sc.enableZoom = false;
      sc.enableTilt = false;
      sc.enableLook = false;

      // 글로브 설정
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0d1117');
      viewer.scene.globe.depthTestAgainstTerrain = false;

      // 안개/대기 효과
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0002;

      // 시간 설정: 2026년 2월 28일 오후 6시 (KST = UTC+9)
      viewer.clock.currentTime = Cesium.JulianDate.fromIso8601('2026-02-28T09:00:00Z');
      viewer.clock.shouldAnimate = false;

      // 석양 분위기 대기 효과
      try {
        const skyAtm = viewer.scene.skyAtmosphere;
        if (skyAtm && typeof skyAtm === 'object' && typeof skyAtm.hueShift === 'number') {
          skyAtm.hueShift = -0.05;
          skyAtm.saturationShift = 0.2;
          skyAtm.brightnessShift = -0.1;
        }
      } catch {}

      viewerRef.current = viewer;

      // Google 3D Tiles 로딩
      (async () => {
        try {
          let tileset;
          if (Cesium.createGooglePhotorealistic3DTileset) {
            tileset = await Cesium.createGooglePhotorealistic3DTileset();
          } else if (googleApiKey) {
            tileset = await Cesium.Cesium3DTileset.fromUrl(
              `https://tile.googleapis.com/v1/3dtiles/root.json?key=${googleApiKey}`
            );
          }
          if (tileset && !destroyed) {
            viewer.scene.primitives.add(tileset);
          }
        } catch (err) {
          console.warn('Google 3D Tiles 로딩 실패, Cesium OSM Buildings으로 폴백:', err);
          try {
            const osmBuildings = await Cesium.createOsmBuildingsAsync();
            if (!destroyed) viewer.scene.primitives.add(osmBuildings);
          } catch (e2) {
            console.warn('OSM Buildings도 실패:', e2);
          }
        }
      })();

      // ── UAM 엔티티 ──
      const initState = useFlightStore.getState();
      const initPos = Cesium.Cartesian3.fromDegrees(
        initState.position.lon,
        initState.position.lat,
        initState.position.altitude_m || 10
      );

      const uamEntity = viewer.entities.add({
        name: 'UAM',
        position: initPos,
        model: {
          uri: '/models/archer-evtol.glb',
          minimumPixelSize: 64,
          maximumScale: 20,
          scale: 3.0,
          silhouetteColor: Cesium.Color.ORANGE,
          silhouetteSize: 1.5,
          colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
          color: Cesium.Color.WHITE.withAlpha(1.0),
        },
      });

      // ── 헬리패드 엔티티 ──
      [
        { lat: 37.5219, lon: 126.9245, name: '여의도 버티포트' },
        { lat: 37.5133, lon: 127.1001, name: '잠실 버티포트' },
      ].forEach((hp) => {
        viewer.entities.add({
          name: hp.name,
          position: Cesium.Cartesian3.fromDegrees(hp.lon, hp.lat, 3),
          model: {
            uri: '/models/helipad.glb',
            scale: 4.0,
          },
          label: {
            text: hp.name,
            font: 'bold 14px sans-serif',
            fillColor: Cesium.Color.ORANGE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -50),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      });

      // ── POI 마커 (지면 고정 핀 + 라벨) ──
      const orangePin = createPinDataUri('#f97316');
      const greenPin = createPinDataUri('#22c55e');
      const poiEntities = new Map<string, any>();

      poiData.forEach((poi) => {
        const e = viewer.entities.add({
          name: poi.name,
          position: Cesium.Cartesian3.fromDegrees(poi.lon, poi.lat, 25),
          billboard: {
            image: orangePin,
            scale: 0.8,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000),
          },
          label: {
            text: poi.name,
            font: 'bold 13px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -52),
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString('#000000').withAlpha(0.6),
            backgroundPadding: new Cesium.Cartesian2(8, 4),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 6000),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        poiEntities.set(poi.id, e);
      });

      // ── 체이스 카메라 + UAM 위치 업데이트 루프 ──
      let smoothHeading = initState.heading;

      viewer.scene.preRender.addEventListener(() => {
        if (destroyed) return;

        const state = useFlightStore.getState();
        const { lat, lon, altitude_m } = state.position;

        // UAM 위치
        const pos = Cesium.Cartesian3.fromDegrees(lon, lat, altitude_m);
        uamEntity.position = pos;

        // ── UAM 방향 (모델 보정: GLB의 +Y축이 기수 → pitch -90°로 수평 배치) ──
        const hpr = new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(state.heading),
          -Math.PI / 2 + Cesium.Math.toRadians(state.pitch * 0.3),
          Cesium.Math.toRadians(-state.roll * 0.5)
        );
        uamEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);

        // ── 부드러운 체이스 카메라 ──
        let headingDiff = state.heading - smoothHeading;
        while (headingDiff > 180) headingDiff -= 360;
        while (headingDiff < -180) headingDiff += 360;
        smoothHeading += headingDiff * 0.06;

        const cameraRange = Math.max(80, 100 + state.speed_kmh * 0.4);
        const cameraHeading = Cesium.Math.toRadians(smoothHeading) + Math.PI;
        const cameraPitch = Cesium.Math.toRadians(-15);

        viewer.camera.lookAt(
          pos,
          new Cesium.HeadingPitchRange(cameraHeading, cameraPitch, cameraRange)
        );

        // 방문한 POI 핀 색상 업데이트
        const visitedIds = useGameStore.getState().visitedPOIIds;
        poiEntities.forEach((entity, id) => {
          if (visitedIds.includes(id) && entity.billboard) {
            entity.billboard.image = greenPin;
          }
        });
      });

      // 초기 카메라 뷰 (여의도 상공)
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(126.9245, 37.5219, 500),
        orientation: {
          heading: Cesium.Math.toRadians(90),
          pitch: Cesium.Math.toRadians(-25),
          roll: 0,
        },
      });

      setLoading(false);
    };

    initViewer();

    return () => {
      destroyed = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-sky-950 to-gray-900 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-5xl mb-4 animate-pulse">✈️</div>
            <p className="text-white/80 text-sm font-medium">서울 3D 디지털 트윈 로딩 중...</p>
            <div className="mt-3 w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
