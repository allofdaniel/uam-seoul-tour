'use client';

import { useEffect, useRef } from 'react';
import { useFlightStore } from '@/stores/useFlightStore';
import { useGameStore } from '@/stores/useGameStore';

const ACCELERATION = 25;       // km/h per second
const DECELERATION = 20;       // km/h per second
const YAW_RATE = 45;           // degrees per second
const ALTITUDE_RATE = 40;      // meters per second
const MIN_SPEED = 30;
const MAX_SPEED = 350;         // UAM 최대속도 350km/h
const MIN_ALTITUDE = 30;
const MAX_ALTITUDE = 800;
const INERTIA_DECAY = 0.95;

// 서울 바운딩 박스
const SEOUL_BOUNDS = {
  minLat: 37.42,
  maxLat: 37.70,
  minLon: 126.76,
  maxLon: 127.18,
};

export default function useFlightControls() {
  const keysRef = useRef<Set<string>>(new Set());
  const lastFrameRef = useRef<number>(0);

  const gamePhase = useGameStore((s) => s.gamePhase);
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const addDistance = useGameStore((s) => s.addDistance);

  useEffect(() => {
    if (gamePhase !== 'flying') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);
      // 방향키, Space, PageUp/Down 기본 동작 방지
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'pageup', 'pagedown'].includes(key)) {
        e.preventDefault();
      }
      if (e.key === ' ') {
        useFlightStore.getState().toggleAutoCruise();
      }
      // M 키 마이크 토글
      if (key === 'm') {
        window.dispatchEvent(new CustomEvent('voice-toggle'));
      }
      // L 키 착륙 (현재 위치에서 착륙)
      if (key === 'l') {
        setGamePhase('landing');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 물리 업데이트 루프
    const update = (timestamp: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp;
      }

      const dt = Math.min((timestamp - lastFrameRef.current) / 1000, 0.1); // 최대 100ms
      lastFrameRef.current = timestamp;

      const state = useFlightStore.getState();
      const keys = keysRef.current;

      let newSpeed = state.speed_kmh;
      let newHeading = state.heading;
      let newAltitude = state.position.altitude_m;
      let newPitch = state.pitch;
      let newRoll = state.roll;

      // 가속/감속 (W/↑, S/↓)
      if (keys.has('w') || keys.has('arrowup')) {
        newSpeed = Math.min(MAX_SPEED, newSpeed + ACCELERATION * dt);
      } else if (keys.has('s') || keys.has('arrowdown')) {
        newSpeed = Math.max(MIN_SPEED, newSpeed - DECELERATION * dt);
      }

      // 회전 (A/←, D/→)
      if (keys.has('a') || keys.has('arrowleft')) {
        newHeading -= YAW_RATE * dt;
        newRoll = Math.max(-30, newRoll - 60 * dt);
      } else if (keys.has('d') || keys.has('arrowright')) {
        newHeading += YAW_RATE * dt;
        newRoll = Math.min(30, newRoll + 60 * dt);
      } else {
        newRoll *= INERTIA_DECAY;
      }

      // 고도 (Q/PgUp/Shift, E/PgDn/Ctrl)
      if (keys.has('q') || keys.has('pageup') || keys.has('shift')) {
        newAltitude = Math.min(MAX_ALTITUDE, newAltitude + ALTITUDE_RATE * dt);
        newPitch = Math.min(15, newPitch + 30 * dt);
      } else if (keys.has('e') || keys.has('pagedown') || keys.has('control')) {
        newAltitude = Math.max(MIN_ALTITUDE, newAltitude - ALTITUDE_RATE * dt);
        newPitch = Math.max(-15, newPitch - 30 * dt);
      } else {
        newPitch *= INERTIA_DECAY;
      }

      // Heading 정규화
      newHeading = ((newHeading % 360) + 360) % 360;

      // 위치 업데이트 (속도 기반)
      const speedMs = (newSpeed / 3.6); // m/s
      const headingRad = (newHeading * Math.PI) / 180;
      const dLat = (speedMs * Math.cos(headingRad) * dt) / 111320;
      const dLon = (speedMs * Math.sin(headingRad) * dt) / (111320 * Math.cos((state.position.lat * Math.PI) / 180));

      let newLat = state.position.lat + dLat;
      let newLon = state.position.lon + dLon;

      // 서울 바운딩 박스 제한 (부드러운 감속)
      if (newLat < SEOUL_BOUNDS.minLat || newLat > SEOUL_BOUNDS.maxLat ||
          newLon < SEOUL_BOUNDS.minLon || newLon > SEOUL_BOUNDS.maxLon) {
        newLat = Math.max(SEOUL_BOUNDS.minLat, Math.min(SEOUL_BOUNDS.maxLat, newLat));
        newLon = Math.max(SEOUL_BOUNDS.minLon, Math.min(SEOUL_BOUNDS.maxLon, newLon));
        newSpeed *= 0.95; // 경계에서 감속
      }

      // 거리 계산 (km)
      const distKm = Math.sqrt(dLat * dLat + dLon * dLon) * 111.32;

      // 상태 업데이트
      useFlightStore.getState().updatePosition({ lat: newLat, lon: newLon, altitude_m: newAltitude });
      useFlightStore.getState().setHeading(newHeading);
      useFlightStore.getState().setSpeed(newSpeed);
      useFlightStore.getState().setPitch(newPitch);
      useFlightStore.getState().setRoll(newRoll);
      addDistance(distKm);

      animationRef.current = requestAnimationFrame(update);
    };

    const animationRef = { current: requestAnimationFrame(update) };

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationRef.current);
      lastFrameRef.current = 0;
    };
  }, [gamePhase, setGamePhase, addDistance]);
}
