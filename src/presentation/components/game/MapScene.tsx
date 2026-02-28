'use client';

import { useEffect, useRef, useState } from 'react';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';
import poiDataRaw from '@/infrastructure/data/poi-data.json';
import airspaceData from '@/infrastructure/data/airspace-data.json';

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

// POI 핀 마커 SVG
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

      Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

      const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_TILES_API_KEY;
      if (googleApiKey && Cesium.GoogleMaps) {
        Cesium.GoogleMaps.defaultApiKey = googleApiKey;
      }

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

      try {
        const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
        if (creditContainer) creditContainer.style.display = 'none';
      } catch {}

      // 카메라 컨트롤 비활성화
      const sc = viewer.scene.screenSpaceCameraController;
      sc.enableRotate = false;
      sc.enableTranslate = false;
      sc.enableZoom = false;
      sc.enableTilt = false;
      sc.enableLook = false;

      // 글로브 설정
      viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0d1117');
      viewer.scene.globe.depthTestAgainstTerrain = false;

      // 안개/대기
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0002;

      // 시간: 석양 분위기
      viewer.clock.currentTime = Cesium.JulianDate.fromIso8601('2026-02-28T09:00:00Z');
      viewer.clock.shouldAnimate = false;

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
            setTimeout(() => { if (!destroyed) setLoading(false); }, 2500);
          } else if (!destroyed) {
            setLoading(false);
          }
        } catch (err) {
          console.warn('Google 3D Tiles 로딩 실패, OSM Buildings 폴백:', err);
          try {
            const osmBuildings = await Cesium.createOsmBuildingsAsync();
            if (!destroyed) viewer.scene.primitives.add(osmBuildings);
          } catch (e2) {
            console.warn('OSM Buildings도 실패:', e2);
          }
          setTimeout(() => { if (!destroyed) setLoading(false); }, 1500);
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
          // 완전 불투명 + 원본 색상 유지
          colorBlendMode: Cesium.ColorBlendMode.HIGHLIGHT,
          color: Cesium.Color.WHITE,
        },
      });

      // ── 헬리패드 ──
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

      // ── POI 마커 ──
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

      // ── 공역 데이터 시각화 ──
      const corridor = airspaceData.uam_corridors[0];
      if (corridor) {
        const corridorPositions = corridor.waypoints.flatMap((wp: any) => [wp.lon, wp.lat, wp.alt || 300]);
        viewer.entities.add({
          name: corridor.name,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(corridorPositions),
            width: 4,
            material: new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString('#f97316').withAlpha(0.7),
              dashLength: 16,
            }),
            clampToGround: false,
          },
        });

        corridor.waypoints.forEach((wp: any) => {
          viewer.entities.add({
            name: wp.name,
            position: Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, wp.alt || 300),
            point: {
              pixelSize: 8,
              color: Cesium.Color.ORANGE,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: wp.name,
              font: 'bold 11px sans-serif',
              fillColor: Cesium.Color.ORANGE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -14),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8000),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });
      }

      // 비행금지/제한구역
      airspaceData.restricted_zones.forEach((zone: any) => {
        const isProhibited = zone.type === 'P';
        const positions = zone.boundary.flatMap(([lon, lat]: [number, number]) => [lon, lat]);
        viewer.entities.add({
          name: zone.name,
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
            height: 0,
            extrudedHeight: isProhibited ? 500 : 400,
            material: Cesium.Color.fromCssColorString(isProhibited ? '#ff0000' : '#ff4444').withAlpha(isProhibited ? 0.08 : 0.05),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString(isProhibited ? '#ff0000' : '#ff4444').withAlpha(0.4),
          },
        });
      });

      // 위험구역
      airspaceData.danger_zones.forEach((dz: any) => {
        const radiusM = dz.radius_nm * 1852;
        viewer.entities.add({
          name: dz.name,
          position: Cesium.Cartesian3.fromDegrees(dz.center[0], dz.center[1], 0),
          ellipse: {
            semiMajorAxis: radiusM,
            semiMinorAxis: radiusM,
            height: 0,
            extrudedHeight: 300,
            material: Cesium.Color.fromCssColorString('#ffc800').withAlpha(0.05),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString('#ffc800').withAlpha(0.3),
          },
        });
      });

      // ── 부드러운 보간 변수 ──
      let smoothLat = initState.position.lat;
      let smoothLon = initState.position.lon;
      let smoothAlt = initState.position.altitude_m || 10;
      let smoothHeading = initState.heading;
      let smoothPitch = 0;
      let smoothRoll = 0;
      let cameraSmoothedHeading = initState.heading;

      // ── 체이스 카메라 + UAM 위치 업데이트 루프 ──
      viewer.scene.preRender.addEventListener(() => {
        if (destroyed) return;

        const state = useFlightStore.getState();
        const { lat, lon, altitude_m } = state.position;

        // ── 위치 부드러운 보간 (덜덜거림 방지) ──
        const posLerp = 0.12;
        const rotLerp = 0.08;

        smoothLat += (lat - smoothLat) * posLerp;
        smoothLon += (lon - smoothLon) * posLerp;
        smoothAlt += (altitude_m - smoothAlt) * posLerp;

        // 헤딩 보간 (360도 래핑 처리)
        let headingDiff = state.heading - smoothHeading;
        while (headingDiff > 180) headingDiff -= 360;
        while (headingDiff < -180) headingDiff += 360;
        smoothHeading += headingDiff * rotLerp;
        smoothHeading = ((smoothHeading % 360) + 360) % 360;

        // 피치, 롤 보간
        smoothPitch += (state.pitch - smoothPitch) * rotLerp;
        smoothRoll += (state.roll - smoothRoll) * rotLerp;

        // UAM 위치
        const pos = Cesium.Cartesian3.fromDegrees(smoothLon, smoothLat, smoothAlt);
        uamEntity.position = pos;

        // ── UAM 방향 ──
        // 모델: +Y=노즈, +Z=상부 (Z-up OBJ, glTF 변환 안 됨)
        // CesiumJS glTF: +Y=위, -Z=앞 으로 해석
        // → pitch=-90° 로 모델 +Y(노즈)를 수평 전방으로 회전
        // → heading 그대로 적용 (PI 오프셋 불필요)
        const hpr = new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(smoothHeading),
          -Math.PI / 2 + Cesium.Math.toRadians(smoothPitch * 0.3),
          Cesium.Math.toRadians(smoothRoll * 0.5)
        );
        uamEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);

        // ── 부드러운 체이스 카메라 ──
        let camHeadingDiff = smoothHeading - cameraSmoothedHeading;
        while (camHeadingDiff > 180) camHeadingDiff -= 360;
        while (camHeadingDiff < -180) camHeadingDiff += 360;
        cameraSmoothedHeading += camHeadingDiff * 0.04; // 카메라는 더 느리게 따라감

        const cameraRange = Math.max(80, 100 + state.speed_kmh * 0.4);
        const cameraHeading = Cesium.Math.toRadians(cameraSmoothedHeading) + Math.PI;
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

      // 초기 카메라 뷰
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(126.9245, 37.5219, 500),
        orientation: {
          heading: Cesium.Math.toRadians(90),
          pitch: Cesium.Math.toRadians(-25),
          roll: 0,
        },
      });

      // 8초 폴백 타이머
      setTimeout(() => { if (!destroyed && loading) setLoading(false); }, 8000);
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
