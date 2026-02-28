'use client';

import { Suspense, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';

// ── WGS84 타원체 상수 ──
const WGS84_A = 6378137.0;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F;

// ── GPS → ECEF → Scene 좌표 변환 ──
// tiles.group.rotation.x = -PI/2 이므로 ECEF(x,y,z) → Scene(x, z, -y)
function gpsToScene(lat: number, lon: number, alt: number): THREE.Vector3 {
  const latRad = lat * Math.PI / 180;
  const lonRad = lon * Math.PI / 180;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);
  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * sinLat * sinLat);
  const ecefX = (N + alt) * cosLat * cosLon;
  const ecefY = (N + alt) * cosLat * sinLon;
  const ecefZ = (N * (1 - WGS84_E2) + alt) * sinLat;
  return new THREE.Vector3(ecefX, ecefZ, -ecefY);
}

// 로컬 UP 벡터 (지구 표면 수직 방향, scene 좌표계)
function getLocalUp(lat: number, lon: number): THREE.Vector3 {
  return gpsToScene(lat, lon, 0).normalize();
}

// 로컬 EAST 벡터 (scene 좌표계)
function getLocalEast(lon: number): THREE.Vector3 {
  const lonRad = lon * Math.PI / 180;
  // ECEF East: (-sin(lon), cos(lon), 0) → Scene: (-sin(lon), 0, -cos(lon))
  return new THREE.Vector3(-Math.sin(lonRad), 0, -Math.cos(lonRad)).normalize();
}

// 로컬 NORTH 벡터 = UP × EAST
function getLocalNorth(lat: number, lon: number): THREE.Vector3 {
  const up = getLocalUp(lat, lon);
  const east = getLocalEast(lon);
  return new THREE.Vector3().crossVectors(up, east).normalize();
}

// 재사용 벡터 (GC pressure 감소)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();

// ── Module-level tiles renderer ref ──
let _tilesRenderer: any = null;
let _tilesLoaded = false;

// ── Google Photorealistic 3D Tiles ──
function Google3DTiles() {
  const { scene, camera, gl } = useThree();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let disposed = false;

    (async () => {
      try {
        const { TilesRenderer } = await import('3d-tiles-renderer');
        const {
          GoogleCloudAuthPlugin,
          TileCompressionPlugin,
          UpdateOnChangePlugin,
          UnloadTilesPlugin,
          TilesFadePlugin,
          GLTFExtensionsPlugin,
        } = await import('3d-tiles-renderer/plugins');
        const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');

        if (disposed) return;

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_TILES_API_KEY;
        if (!apiKey) {
          console.warn('Google Tiles API key not found');
          return;
        }

        const tiles = new TilesRenderer();
        tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: apiKey, autoRefreshToken: true }));
        tiles.registerPlugin(new TileCompressionPlugin());
        tiles.registerPlugin(new UpdateOnChangePlugin());
        tiles.registerPlugin(new UnloadTilesPlugin());
        tiles.registerPlugin(new TilesFadePlugin());
        tiles.registerPlugin(new GLTFExtensionsPlugin({
          dracoLoader: new DRACOLoader().setDecoderPath(
            'https://unpkg.com/three@0.170.0/examples/jsm/libs/draco/gltf/'
          ),
        }));

        tiles.errorTarget = 2;
        tiles.group.rotation.x = -Math.PI / 2; // ECEF Z-up → Y-up

        scene.add(tiles.group);
        tiles.setCamera(camera);
        tiles.setResolutionFromRenderer(camera, gl);

        _tilesRenderer = tiles;
        _tilesLoaded = true;
        setLoaded(true);
      } catch (err) {
        console.error('Failed to load Google 3D Tiles:', err);
      }
    })();

    return () => {
      disposed = true;
      if (_tilesRenderer) {
        scene.remove(_tilesRenderer.group);
        _tilesRenderer.dispose();
        _tilesRenderer = null;
        _tilesLoaded = false;
      }
    };
  }, [scene, camera, gl]);

  useFrame(() => {
    if (_tilesRenderer) {
      _tilesRenderer.setCamera(camera);
      _tilesRenderer.setResolutionFromRenderer(camera, gl);
      camera.updateMatrixWorld();
      _tilesRenderer.update();
    }
  });

  return null;
}

// ── 폴백 지형 (Google Tiles 로딩 전/실패 시) ──
function FallbackTerrain() {
  const vworldKey = process.env.NEXT_PUBLIC_VWORLD_API_KEY;

  const texture = useMemo(() => {
    if (!vworldKey) return null;
    const loader = new THREE.TextureLoader();
    const url = `https://api.vworld.kr/req/image?service=image&request=getmap&key=${vworldKey}&basemap=PHOTO&center=126.98,37.54&crs=EPSG:4326&zoom=13&size=1024,1024&format=jpeg`;
    const tex = loader.load(url, undefined, undefined, () => {
      console.warn('V-World fallback texture failed');
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [vworldKey]);

  // 폴백 지면: 서울 중심의 20km x 20km 평면 (ECEF 좌표)
  const { pos, quat, size } = useMemo(() => {
    const center = gpsToScene(37.54, 126.98, -5);
    const up = getLocalUp(37.54, 126.98);
    const east = getLocalEast(126.98);
    const north = new THREE.Vector3().crossVectors(up, east).normalize();
    const m = new THREE.Matrix4().makeBasis(east, up, north.clone().negate());
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    return { pos: center, quat: q, size: 25000 };
  }, []);

  return (
    <group position={pos} quaternion={quat}>
      {/* 위성사진 또는 녹색 지면 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color={texture ? '#ffffff' : '#2d5a1e'}
          map={texture}
          roughness={0.9}
        />
      </mesh>
      {/* 한강 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 1500]}>
        <planeGeometry args={[size, 800]} />
        <meshStandardMaterial color="#1a4a6a" transparent opacity={0.7} roughness={0.3} />
      </mesh>
      {/* 그리드 */}
      <gridHelper args={[size, 100, '#3a6a3a', '#2a4a2a']} position={[0, 0.5, 0]} />
    </group>
  );
}

// ── UAM 기체 (Archer EVTOL) ──
function UAMModel() {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/archer-evtol.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useFrame(() => {
    if (!ref.current) return;
    const state = useFlightStore.getState();
    const { lat, lon, altitude_m: alt } = state.position;

    // Scene 위치
    const pos = gpsToScene(lat, lon, alt);
    ref.current.position.lerp(pos, 0.15);

    // 로컬 ENU 프레임
    const up = getLocalUp(lat, lon);
    const east = getLocalEast(lon);
    const north = _v1.crossVectors(up, east).normalize();

    // 헤딩 방향
    const headingRad = state.heading * Math.PI / 180;
    const forward = _v2.set(0, 0, 0)
      .addScaledVector(north, Math.cos(headingRad))
      .addScaledVector(east, Math.sin(headingRad))
      .normalize();

    // 오른쪽 벡터
    const right = _v3.crossVectors(forward, up).normalize();

    // 방향 행렬: right=X, up=Y, -forward=Z (Three.js 규칙)
    _mat4.makeBasis(right, up, forward.clone().negate());
    const targetQuat = _quat.setFromRotationMatrix(_mat4);

    // 피치/롤 적용
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(right, -state.pitch * Math.PI / 180 * 0.3);
    const rollQ = new THREE.Quaternion().setFromAxisAngle(forward, -state.roll * Math.PI / 180 * 0.5);
    targetQuat.multiply(pitchQ).multiply(rollQ);

    ref.current.quaternion.slerp(targetQuat, 0.1);
  });

  return (
    <group ref={ref}>
      {/* 모델 보정: GLB 기체 방향(Y축 fuselage) → -Z축(Three.js forward) */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <primitive object={clonedScene} scale={[3, 3, 3]} />
      </group>
      {/* 기체 아래 그림자 */}
      <mesh>
        <sphereGeometry args={[2, 8, 8]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

// ── 헬리패드 ──
function Helipad({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const { scene } = useGLTF('/models/helipad.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  const { pos, quat } = useMemo(() => {
    const p = gpsToScene(lat, lon, 2); // 지면 약간 위
    const up = getLocalUp(lat, lon);
    const east = getLocalEast(lon);
    const north = new THREE.Vector3().crossVectors(up, east).normalize();
    const m = new THREE.Matrix4().makeBasis(east, up, north.clone().negate());
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    return { pos: p, quat: q };
  }, [lat, lon]);

  return (
    <group position={pos} quaternion={quat}>
      <primitive object={clonedScene} scale={[4, 4, 4]} />
      <pointLight color="#f97316" intensity={50} distance={100} position={[0, 10, 0]} />
      <Html position={[0, 25, 0]} center distanceFactor={400}>
        <div className="bg-black/70 backdrop-blur px-3 py-1 rounded-full text-orange-400 text-xs font-bold whitespace-nowrap border border-orange-500/30">
          {name}
        </div>
      </Html>
    </group>
  );
}

// ── 체이스 카메라 (3인칭 조종사 뷰) ──
function ChaseCamera() {
  const { camera } = useThree();
  const smoothPos = useRef(new THREE.Vector3());
  const smoothTarget = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useFrame(() => {
    const state = useFlightStore.getState();
    const { lat, lon, altitude_m: alt } = state.position;

    const uamPos = gpsToScene(lat, lon, alt);
    const up = getLocalUp(lat, lon);
    const east = getLocalEast(lon);
    const north = new THREE.Vector3().crossVectors(up, east).normalize();

    const headingRad = state.heading * Math.PI / 180;
    const forward = new THREE.Vector3()
      .addScaledVector(north, Math.cos(headingRad))
      .addScaledVector(east, Math.sin(headingRad))
      .normalize();

    // 카메라: 기체 뒤쪽 위
    const chaseDist = 60;
    const chaseHeight = 25;
    const lookAheadDist = 30;

    const camPos = uamPos.clone()
      .addScaledVector(forward, -chaseDist)
      .addScaledVector(up, chaseHeight);

    const lookTarget = uamPos.clone()
      .addScaledVector(forward, lookAheadDist);

    if (!initialized.current) {
      smoothPos.current.copy(camPos);
      smoothTarget.current.copy(lookTarget);
      camera.position.copy(camPos);
      camera.up.copy(up);
      camera.lookAt(lookTarget);
      initialized.current = true;
      return;
    }

    smoothPos.current.lerp(camPos, 0.04);
    smoothTarget.current.lerp(lookTarget, 0.06);

    camera.position.copy(smoothPos.current);
    camera.up.copy(up);
    camera.lookAt(smoothTarget.current);
  });

  return null;
}

// ── POI 3D 마커 ──
function POIMarker({ name, lat, lon, altitude, visited }: {
  name: string; lat: number; lon: number; altitude: number; visited: boolean;
}) {
  const markerAlt = Math.max(altitude, 30) + 40; // 건물 위에 떠있게
  const pos = useMemo(() => gpsToScene(lat, lon, markerAlt), [lat, lon, markerAlt]);
  const ref = useRef<THREE.Group>(null);
  const upDir = useMemo(() => getLocalUp(lat, lon), [lat, lon]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.copy(pos);
      // 부유 애니메이션 (로컬 up 방향)
      ref.current.position.addScaledVector(upDir, Math.sin(clock.elapsedTime * 2) * 3);
    }
  });

  return (
    <group ref={ref}>
      {/* 마커 구체 */}
      <mesh>
        <sphereGeometry args={[6, 16, 16]} />
        <meshStandardMaterial
          color={visited ? '#22c55e' : '#f97316'}
          emissive={visited ? '#22c55e' : '#f97316'}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* 외곽 링 */}
      <mesh>
        <ringGeometry args={[8, 10, 32]} />
        <meshBasicMaterial color={visited ? '#22c55e' : '#f97316'} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* 라벨 */}
      <Html position={[0, 15, 0]} center distanceFactor={600} occlude={false}>
        <div className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap border ${
          visited
            ? 'bg-green-900/80 text-green-300 border-green-500/50'
            : 'bg-black/80 text-white border-orange-500/50'
        }`}>
          {name}
        </div>
      </Html>
    </group>
  );
}

// ── POI 전체 로드 ──
function POIMarkers() {
  const visitedPOIIds = useGameStore((s) => s.visitedPOIIds);
  const poiData = useMemo(() => {
    try {
      return require('@/infrastructure/data/poi-data.json') as any[];
    } catch {
      return [];
    }
  }, []);

  return (
    <>
      {poiData.map((poi: any) => (
        <POIMarker
          key={poi.id}
          name={poi.name}
          lat={poi.lat}
          lon={poi.lon}
          altitude={poi.altitude_m || 30}
          visited={visitedPOIIds.includes(poi.id)}
        />
      ))}
    </>
  );
}

// ── 조명 ──
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[1, 2, 1]} intensity={2.0} />
    </>
  );
}

// ── Scene 배경 설정 ──
function SceneSetup() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color('#87ceeb');
    return () => { scene.background = null; };
  }, [scene]);
  return null;
}

// ── 메인 3D 씬 ──
function Scene3DContent() {
  return (
    <>
      <SceneSetup />
      <ChaseCamera />
      <Lighting />
      <Google3DTiles />
      <FallbackTerrain />

      <Suspense fallback={null}>
        <UAMModel />
        <Helipad lat={37.5219} lon={126.9245} name="여의도 버티포트" />
        <Helipad lat={37.5133} lon={127.1001} name="잠실 버티포트" />
        <POIMarkers />
      </Suspense>
    </>
  );
}

// ── 로딩 Fallback ──
function LoadingFallback() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-sky-900 via-sky-800 to-green-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">✈️</div>
        <p className="text-white/70 text-sm">3D Seoul 로딩 중...</p>
      </div>
    </div>
  );
}

// ── 초기 카메라 위치 (여의도 300m 상공) ──
const INIT_POS = gpsToScene(37.5219, 126.9245, 300);

// ── 메인 컴포넌트 ──
export default function MapScene() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{
          fov: 60,
          near: 1,
          far: 160000000,
          position: [INIT_POS.x, INIT_POS.y, INIT_POS.z],
        }}
        gl={{
          antialias: true,
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          powerPreference: 'high-performance',
        }}
        fallback={<LoadingFallback />}
      >
        <Suspense fallback={null}>
          <Scene3DContent />
        </Suspense>
      </Canvas>
    </div>
  );
}

// GLB 모델 프리로드
useGLTF.preload('/models/archer-evtol.glb');
useGLTF.preload('/models/helipad.glb');
