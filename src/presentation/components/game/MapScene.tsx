'use client';

import { Suspense, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Sky, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';

// GPS → Local 좌표 변환 (원점: 여의도)
const ORIGIN = { lat: 37.5219, lon: 126.9245 };
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LON = M_PER_DEG_LAT * Math.cos(ORIGIN.lat * Math.PI / 180);
const SCALE = 1; // 1 Three.js unit = 1 meter

function gpsToLocal(lat: number, lon: number, alt: number = 0): [number, number, number] {
  const x = (lon - ORIGIN.lon) * M_PER_DEG_LON * SCALE;
  const z = -(lat - ORIGIN.lat) * M_PER_DEG_LAT * SCALE;
  return [x, alt * SCALE, z];
}

// ── UAM 기체 (Archer EVTOL) ──
function UAMModel() {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF('/models/archer-evtol.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  useFrame(() => {
    if (!ref.current) return;
    const state = useFlightStore.getState();
    const [x, y, z] = gpsToLocal(state.position.lat, state.position.lon, state.position.altitude_m);

    // 부드러운 위치 이동
    ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.15);

    // 회전 (heading: Y축, pitch: X축, roll: Z축)
    const targetQuat = new THREE.Quaternion();
    const euler = new THREE.Euler(
      -state.pitch * Math.PI / 180 * 0.3,
      -(state.heading - 90) * Math.PI / 180,
      -state.roll * Math.PI / 180 * 0.5,
      'YXZ'
    );
    targetQuat.setFromEuler(euler);
    ref.current.quaternion.slerp(targetQuat, 0.1);
  });

  return (
    <group ref={ref}>
      <primitive object={clonedScene} scale={[3, 3, 3]} />
      {/* 기체 아래 그림자 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.5, 0]}>
        <circleGeometry args={[8, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

// ── 헬리패드 ──
function Helipad({ lat, lon, name }: { lat: number; lon: number; name: string }) {
  const { scene } = useGLTF('/models/helipad.glb');
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const [x, y, z] = useMemo(() => gpsToLocal(lat, lon, 0), [lat, lon]);

  return (
    <group position={[x, y, z]}>
      <primitive object={clonedScene} scale={[4, 4, 4]} />
      {/* 패드 조명 */}
      <pointLight color="#f97316" intensity={50} distance={100} position={[0, 10, 0]} />
      {/* 이름 라벨 */}
      <Html position={[0, 20, 0]} center distanceFactor={300}>
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
    const [x, y, z] = gpsToLocal(state.position.lat, state.position.lon, state.position.altitude_m);

    // 카메라 위치: 기체 뒤쪽 위에서 따라감
    const headingRad = -(state.heading - 90) * Math.PI / 180;
    const chaseDist = 60;
    const chaseHeight = 25;
    const lookAheadDist = 30;

    const camX = x - Math.sin(headingRad) * chaseDist;
    const camZ = z - Math.cos(headingRad) * chaseDist;
    const camY = y + chaseHeight;

    // 카메라가 바라보는 지점: 기체 앞쪽
    const targetX = x + Math.sin(headingRad) * lookAheadDist;
    const targetZ = z + Math.cos(headingRad) * lookAheadDist;
    const targetY = y;

    if (!initialized.current) {
      smoothPos.current.set(camX, camY, camZ);
      smoothTarget.current.set(targetX, targetY, targetZ);
      initialized.current = true;
    }

    // 부드러운 추적
    smoothPos.current.lerp(new THREE.Vector3(camX, camY, camZ), 0.04);
    smoothTarget.current.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.06);

    camera.position.copy(smoothPos.current);
    camera.lookAt(smoothTarget.current);
  });

  return null;
}

// ── 지형 (서울 지면 - V-World StaticMap API 위성사진) ──
function Terrain() {
  const apiKey = process.env.NEXT_PUBLIC_VWORLD_API_KEY;
  const textureRef = useRef<THREE.Texture | null>(null);

  // V-World StaticMap API로 서울 중심 위성사진 로드
  const texture = useMemo(() => {
    if (!apiKey) return null;
    const loader = new THREE.TextureLoader();
    // V-World StaticMap API: 여의도~잠실 영역 위성사진 (1024x1024)
    // center: 서울 중심(126.98, 37.54), zoom 13으로 서울 전역 커버
    const url = `https://api.vworld.kr/req/image?service=image&request=getmap&key=${apiKey}&basemap=PHOTO&center=126.98,37.54&crs=EPSG:4326&zoom=13&size=1024,1024&format=jpeg`;
    const tex = loader.load(url, undefined, undefined, () => {
      console.warn('V-World StaticMap load failed, using fallback');
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    textureRef.current = tex;
    return tex;
  }, [apiKey]);

  // 지면 크기: zoom 13에서 1024px ≈ 약 20km
  const groundSize = 20000; // 20km

  return (
    <group>
      {/* 위성사진 지면 (V-World) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial
          color={texture ? '#ffffff' : '#1a2a1a'}
          map={texture}
          roughness={0.9}
        />
      </mesh>

      {/* V-World 로드 실패 시 보조 그리드 */}
      {!texture && (
        <gridHelper args={[20000, 200, '#1a3a1a', '#152515']} position={[0, -1, 0]} />
      )}

      {/* 한강 */}
      <HanRiver />
    </group>
  );
}

// ── 한강 ──
function HanRiver() {
  const riverPoints = useMemo(() => {
    const points = [
      { lat: 37.535, lon: 126.78 }, { lat: 37.538, lon: 126.82 },
      { lat: 37.535, lon: 126.86 }, { lat: 37.532, lon: 126.90 },
      { lat: 37.527, lon: 126.93 }, { lat: 37.522, lon: 126.95 },
      { lat: 37.520, lon: 126.97 }, { lat: 37.518, lon: 127.00 },
      { lat: 37.519, lon: 127.03 }, { lat: 37.521, lon: 127.06 },
      { lat: 37.519, lon: 127.08 }, { lat: 37.515, lon: 127.10 },
      { lat: 37.512, lon: 127.12 }, { lat: 37.510, lon: 127.15 },
    ];
    return points.map(p => {
      const [x, , z] = gpsToLocal(p.lat, p.lon, 0);
      return new THREE.Vector3(x, 0, z);
    });
  }, []);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(riverPoints), [riverPoints]);
  const geometry = useMemo(() => {
    const pts = curve.getPoints(200);
    const shape = new THREE.Shape();
    // 강 너비 약 800m
    shape.moveTo(-400, 0);
    shape.lineTo(400, 0);
    shape.lineTo(400, 1);
    shape.lineTo(-400, 1);
    shape.closePath();

    const frames = curve.computeFrenetFrames(200, false);
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= 200; i++) {
      const pt = pts[i];
      const normal = frames.normals[i];
      const binormal = frames.binormals[i];

      // 강 양쪽 꼭짓점
      for (const side of [-400, 400]) {
        const px = pt.x + binormal.x * side;
        const py = -1;
        const pz = pt.z + binormal.z * side;
        positions.push(px, py, pz);
      }

      if (i < 200) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [curve]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#1a3a5a" transparent opacity={0.8} roughness={0.3} metalness={0.1} />
    </mesh>
  );
}

// ── POI 3D 마커 ──
function POIMarker({ name, lat, lon, altitude, visited }: {
  name: string; lat: number; lon: number; altitude: number; visited: boolean;
}) {
  const [x, , z] = useMemo(() => gpsToLocal(lat, lon, 0), [lat, lon]);
  const markerHeight = Math.max(altitude * SCALE, 50);
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      // 부유 애니메이션
      ref.current.position.y = markerHeight + Math.sin(clock.elapsedTime * 2) * 3;
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* 지면에서 마커까지 연결선 */}
      <mesh position={[0, markerHeight / 2, 0]}>
        <cylinderGeometry args={[0.3, 0.3, markerHeight, 8]} />
        <meshBasicMaterial color={visited ? '#22c55e' : '#3b82f6'} transparent opacity={0.3} />
      </mesh>

      {/* 마커 구체 */}
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[8, 16, 16]} />
          <meshStandardMaterial
            color={visited ? '#22c55e' : '#f97316'}
            emissive={visited ? '#22c55e' : '#f97316'}
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </mesh>
        {/* 외곽 링 */}
        <mesh rotation-x={Math.PI / 2}>
          <ringGeometry args={[10, 12, 32]} />
          <meshBasicMaterial color={visited ? '#22c55e' : '#f97316'} transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>

        {/* 라벨 */}
        <Html position={[0, 18, 0]} center distanceFactor={500} occlude={false}>
          <div className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap border ${
            visited
              ? 'bg-green-900/80 text-green-300 border-green-500/50'
              : 'bg-black/80 text-white border-orange-500/50'
          }`}>
            {name}
          </div>
        </Html>
      </group>

      {/* 지면 원 표시 */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.5, 0]}>
        <ringGeometry args={[15, 20, 32]} />
        <meshBasicMaterial color={visited ? '#22c55e' : '#f97316'} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── POI 전체 로드 ──
function POIMarkers() {
  const visitedPOIIds = useGameStore((s) => s.visitedPOIIds);
  // Dynamic import to avoid circular deps
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

// ── 건물 (주요 랜드마크 높이 표현) ──
function Buildings() {
  const buildings = useMemo(() => [
    { lat: 37.5137, lon: 127.1025, height: 555, name: '롯데월드타워', color: '#4a5568' },
    { lat: 37.5512, lon: 126.9882, height: 480, name: 'N서울타워', color: '#6b7280' },
    { lat: 37.5197, lon: 126.9399, height: 250, name: '63빌딩', color: '#d4a017' },
    { lat: 37.5108, lon: 127.0610, height: 230, name: '무역센터', color: '#4a5568' },
    { lat: 37.5668, lon: 127.0096, height: 100, name: 'DDP', color: '#9ca3af' },
    { lat: 37.5580, lon: 126.9698, height: 17, name: '서울로7017', color: '#6b8c42' },
  ], []);

  return (
    <>
      {buildings.map((b) => {
        const [x, , z] = gpsToLocal(b.lat, b.lon, 0);
        return (
          <mesh key={b.name} position={[x, b.height * SCALE / 2, z]} castShadow>
            <boxGeometry args={[30, b.height * SCALE, 30]} />
            <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.3} />
          </mesh>
        );
      })}
    </>
  );
}

// ── 조명 ──
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5000, 8000, 3000]}
        intensity={1.5}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={30000}
        shadow-camera-left={-10000}
        shadow-camera-right={10000}
        shadow-camera-top={10000}
        shadow-camera-bottom={-10000}
      />
      <hemisphereLight args={['#87ceeb', '#3a5a2a', 0.3]} />
    </>
  );
}

// ── 안개 효과 ──
function FogEffect() {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2('#b8cfe6', 0.00008);
    scene.background = new THREE.Color('#87ceeb');
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
}

// ── 메인 3D 씬 ──
function Scene3DContent() {
  return (
    <>
      <ChaseCamera />
      <FogEffect />
      <Lighting />
      <Sky sunPosition={[5000, 4000, 3000]} turbidity={3} rayleigh={0.5} />

      <Terrain />
      <Buildings />

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
        <p className="text-white/70 text-sm">3D 씬 로딩 중...</p>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 (SSR 방지) ──
export default function MapScene() {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ fov: 60, near: 1, far: 50000, position: [0, 300, 100] }}
        shadows
        gl={{
          antialias: true,
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
