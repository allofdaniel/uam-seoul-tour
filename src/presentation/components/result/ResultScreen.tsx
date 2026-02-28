'use client';

import { useGameStore } from '@/stores/useGameStore';
import { useFlightStore } from '@/stores/useFlightStore';
import poiData from '@/infrastructure/data/poi-data.json';
import { POI } from '@/domain/types';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}분 ${s}초`;
}

export default function ResultScreen() {
  const { visitedPOIIds, elapsedSeconds, distanceTraveled_km, totalNarrations, pilotProfile, resetGame, setGamePhase } = useGameStore();
  const { trail, resetFlight } = useFlightStore();

  const visitedPOIs = (poiData as unknown as POI[]).filter((p) => visitedPOIIds.includes(p.id));

  const handleRestart = () => {
    resetGame();
    resetFlight();
    setGamePhase('onboarding');
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-y-auto">
      <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 via-black to-black" />

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        {/* 헤더 */}
        <div className="text-center mb-10">
          <p className="text-orange-400 text-sm tracking-wider mb-2">FLIGHT COMPLETE</p>
          <h1 className="text-4xl font-bold mb-2">비행 완료!</h1>
          <p className="text-gray-400">{pilotProfile.callsign} 조종사님의 비행 기록</p>
        </div>

        {/* 비행 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: '비행 시간', value: formatTime(elapsedSeconds), icon: '⏱️' },
            { label: '비행 거리', value: `${distanceTraveled_km.toFixed(1)}km`, icon: '📏' },
            { label: '방문 POI', value: `${visitedPOIs.length}곳`, icon: '📍' },
            { label: '안내 횟수', value: `${totalNarrations}회`, icon: '🎙️' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-gray-400 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 비행 경로 미니 시각화 */}
        {trail.length > 0 && (
          <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-10">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">비행 경로</h3>
            <svg viewBox="0 0 400 200" className="w-full h-40">
              <rect width="400" height="200" fill="rgba(10,10,30,0.8)" rx="8" />
              {trail.length > 1 && (() => {
                const lats = trail.map(t => t.lat);
                const lons = trail.map(t => t.lon);
                const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
                const minLon = Math.min(...lons); const maxLon = Math.max(...lons);
                const padLat = (maxLat - minLat) * 0.1 || 0.01;
                const padLon = (maxLon - minLon) * 0.1 || 0.01;

                const points = trail.map(t => {
                  const x = ((t.lon - minLon + padLon) / (maxLon - minLon + 2 * padLon)) * 380 + 10;
                  const y = 190 - ((t.lat - minLat + padLat) / (maxLat - minLat + 2 * padLat)) * 180;
                  return `${x},${y}`;
                }).join(' ');

                return (
                  <>
                    <polyline points={points} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.8" />
                    {/* 시작점 */}
                    <circle cx={points.split(' ')[0]?.split(',')[0]} cy={points.split(' ')[0]?.split(',')[1]} r="4" fill="#22c55e" />
                    {/* 끝점 */}
                    <circle cx={points.split(' ').pop()?.split(',')[0]} cy={points.split(' ').pop()?.split(',')[1]} r="4" fill="#ef4444" />
                  </>
                );
              })()}
            </svg>
          </div>
        )}

        {/* 방문 POI 목록 */}
        {visitedPOIs.length > 0 && (
          <div className="mb-10">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">방문한 관광지</h3>
            <div className="grid gap-3">
              {visitedPOIs.map((poi) => (
                <div key={poi.id} className="flex items-center gap-4 bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center text-xl">
                    {poi.category_code === 'landmark' ? '🏛️' :
                     poi.category_code === 'restaurant' ? '🍽️' :
                     poi.category_code === 'culture' ? '🎭' :
                     poi.category_code === 'nature' ? '🌿' : '🛍️'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{poi.name}</p>
                    <p className="text-gray-400 text-xs">{poi.name_en}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 다시 비행하기 */}
        <div className="text-center pb-8">
          <button
            onClick={handleRestart}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full text-white font-semibold text-lg hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25"
          >
            다시 비행하기 ✈️
          </button>
        </div>
      </div>
    </div>
  );
}
