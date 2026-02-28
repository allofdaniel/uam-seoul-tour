'use client';

import { useState } from 'react';
import { useGameStore } from '@/stores/useGameStore';
import { POICategoryCode } from '@/domain/types';
import Image from 'next/image';

const CATEGORIES: { code: POICategoryCode; name: string; icon: string; description: string; bgImage: string }[] = [
  { code: 'landmark', name: '랜드마크 관광', icon: '🏛️', description: '세계적인 명소를 하늘에서 감상하세요', bgImage: '/images/onboarding/onboarding2.png' },
  { code: 'restaurant', name: '맛집 탐방', icon: '🍽️', description: '현지 미식 명소를 찾아 비행하세요', bgImage: '/images/onboarding/onboarding3.png' },
  { code: 'culture', name: '도시 탐험', icon: '🏙️', description: '세계 주요 도시의 스카이라인을 탐험하세요', bgImage: '/images/onboarding/onboarding2.png' },
  { code: 'nature', name: '자연 탐사', icon: '🏔️', description: '웅장한 산과 숲 위를 비행하세요', bgImage: '/images/onboarding/onboarding2.png' },
  { code: 'shopping', name: '휴양지 비행', icon: '🏖️', description: '아름다운 해변과 리조트를 하늘에서 만나세요', bgImage: '/images/onboarding/onboarding2.png' },
];

const EXPERIENCE_LEVELS = [
  { value: 'beginner' as const, name: '초보 조종사', description: '처음이에요, 기본부터 알려주세요' },
  { value: 'intermediate' as const, name: '중급 조종사', description: '비행 경험이 조금 있어요' },
  { value: 'veteran' as const, name: '베테랑 파일럿', description: '하늘은 제 놀이터입니다' },
];

type OnboardingStep = 'welcome' | 'purpose' | 'profile' | 'boarding-pass' | 'complete';

export default function OnboardingFlow() {
  const { setPreferences, setPilotProfile, setGamePhase, setLanguage } = useGameStore();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [selectedCategories, setSelectedCategories] = useState<POICategoryCode[]>([]);
  const [callsign, setCallsign] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'veteran'>('beginner');

  const handleCategoryToggle = (code: POICategoryCode) => {
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleComplete = () => {
    const finalCallsign = callsign.trim() || 'PILOT';
    setPreferences(selectedCategories.length > 0 ? selectedCategories : ['landmark', 'restaurant', 'culture', 'nature', 'shopping']);
    setPilotProfile({ callsign: finalCallsign, experienceLevel });
    setStep('complete');
    setTimeout(() => {
      setGamePhase('takeoff');
    }, 2000);
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* 배경 이미지 */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-900/30 via-black/80 to-black z-0" />

      {/* 프로그레스 바 */}
      {step !== 'welcome' && step !== 'complete' && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {['purpose', 'profile', 'boarding-pass'].map((s, i) => (
            <div
              key={s}
              className={`h-1 w-16 rounded-full transition-colors ${
                ['purpose', 'profile', 'boarding-pass'].indexOf(step) >= i
                  ? 'bg-orange-500'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        {/* Welcome */}
        {step === 'welcome' && (
          <div className="flex flex-col items-center text-center animate-fadeIn">
            <div className="text-5xl mb-4">✈️</div>
            <h1 className="text-xl tracking-widest text-orange-400 mb-6">SKYBOUND</h1>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              당신만의 하늘을<br />비행하세요
            </h2>
            <p className="text-gray-400 mb-2">원하는 목적에 맞춘 맞춤형 비행 시뮬레이션.</p>
            <p className="text-gray-400 mb-10">지금 바로 이륙 준비를 시작하세요.</p>
            <button
              onClick={() => setStep('purpose')}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full text-white font-semibold text-lg hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25"
            >
              비행 시작하기 ✈️
            </button>
            <p className="text-gray-600 text-xs mt-16 tracking-wider">SCROLL</p>
          </div>
        )}

        {/* STEP 01: 비행 목적 선택 */}
        {step === 'purpose' && (
          <div className="w-full max-w-4xl animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">STEP 01</p>
            <h2 className="text-3xl font-bold mb-2">비행의 목적을 선택하세요</h2>
            <p className="text-gray-400 mb-8">
              어떤 경험을 원하시나요? 목적에 따라 최적의 비행 루트와 시나리오를 추천해드립니다.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => handleCategoryToggle(cat.code)}
                  className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                    selectedCategories.includes(cat.code)
                      ? 'border-orange-500 bg-orange-500/10 scale-105'
                      : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'
                  }`}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <h3 className="font-semibold text-sm mb-1">{cat.name}</h3>
                  <p className="text-gray-400 text-xs text-center">{cat.description}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep('welcome')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← 이전
              </button>
              <button
                onClick={() => setStep('profile')}
                className="px-6 py-3 bg-orange-500 rounded-full text-white font-medium hover:bg-orange-600 transition-colors"
              >
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* STEP 02: 조종사 프로필 */}
        {step === 'profile' && (
          <div className="w-full max-w-md animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">STEP 02</p>
            <h2 className="text-3xl font-bold mb-2">조종사 프로필</h2>
            <p className="text-gray-400 mb-8">당신의 콜사인과 비행 경험을 알려주세요.</p>

            <div className="mb-6">
              <label className="text-gray-400 text-sm mb-2 block">콜사인 (조종사 이름)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">👤</span>
                <input
                  type="text"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  placeholder="captain"
                  maxLength={20}
                  className="w-full pl-12 pr-4 py-3 bg-gray-900/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="mb-10">
              <label className="text-gray-400 text-sm mb-3 block">비행 경험</label>
              <div className="flex flex-col gap-3">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setExperienceLevel(level.value)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      experienceLevel === level.value
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      experienceLevel === level.value ? 'border-orange-500' : 'border-gray-600'
                    }`}>
                      {experienceLevel === level.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{level.name}</p>
                      <p className="text-gray-400 text-sm">{level.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep('purpose')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← 이전
              </button>
              <button
                onClick={() => setStep('boarding-pass')}
                className="px-6 py-3 bg-orange-500 rounded-full text-white font-medium hover:bg-orange-600 transition-colors"
              >
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* 보딩패스 */}
        {step === 'boarding-pass' && (
          <div className="flex flex-col items-center animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">READY FOR TAKEOFF</p>
            <h2 className="text-4xl font-bold mb-8">비행 준비 완료</h2>

            <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 w-full max-w-md mb-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-orange-400">✈️</span>
                <span className="font-bold tracking-wider">SKYBOUND AIRLINES</span>
                <span className="ml-auto text-gray-400 text-sm">BOARDING PASS</span>
              </div>
              <div className="border-t border-gray-700 pt-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-400 text-xs">PILOT</p>
                  <p className="font-bold">{callsign || 'PILOT'}</p>
                  <p className="text-gray-400 text-xs">
                    {EXPERIENCE_LEVELS.find((l) => l.value === experienceLevel)?.name}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">MISSION</p>
                  <p className="font-bold">
                    {selectedCategories.length > 0
                      ? CATEGORIES.find((c) => c.code === selectedCategories[0])?.name
                      : '자유 비행'}
                  </p>
                  <p className="text-gray-400 text-xs">맞춤 루트 생성됨</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">STATUS</p>
                  <p className="font-bold text-green-400">CLEARED</p>
                  <p className="text-gray-400 text-xs">이륙 승인 완료</p>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-700 pt-3 flex justify-end">
                <p className="text-gray-500 text-xs">SKB-2026</p>
              </div>
            </div>

            <div className="flex justify-between items-center w-full max-w-md">
              <button
                onClick={() => setStep('profile')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← 이전
              </button>
              <button
                onClick={handleComplete}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full text-white font-semibold text-lg hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25"
              >
                이륙하기 ✈️
              </button>
            </div>
          </div>
        )}

        {/* 온보딩 완료 */}
        {step === 'complete' && (
          <div className="flex flex-col items-center text-center animate-fadeIn">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-3xl text-orange-400">✈️</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">온보딩 완료!</h2>
            <p className="text-gray-400">
              {callsign || 'PILOT'} 조종사님, {
                selectedCategories.length > 0
                  ? CATEGORIES.find((c) => c.code === selectedCategories[0])?.name
                  : '자유 비행'
              } 비행 시뮬레이션이 곧 시작됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
