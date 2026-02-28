"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/useGameStore";
import { POICategoryCode } from "@/domain/types";
import Image from "next/image";

const CATEGORIES: { code: POICategoryCode; name: string; icon: string; description: string; bgImage: string }[] = [
  {
    code: "landmark",
    name: "랜드마크 관광",
    icon: "🏛️",
    description: "세계적인 명소를 하늘에서 감상하세요",
    bgImage: "/images/onboarding/onboarding2.png",
  },
  {
    code: "restaurant",
    name: "맛집 탐방",
    icon: "🍽️",
    description: "현지 미식 명소를 찾아 비행하세요",
    bgImage: "/images/onboarding/onboarding3.png",
  },
  {
    code: "culture",
    name: "도시 탐험",
    icon: "🏙️",
    description: "세계 주요 도시의 스카이라인을 탐험하세요",
    bgImage: "/images/onboarding/onboarding2.png",
  },
  {
    code: "nature",
    name: "자연 탐사",
    icon: "🏔️",
    description: "웅장한 산과 숲 위를 비행하세요",
    bgImage: "/images/onboarding/onboarding2.png",
  },
  {
    code: "shopping",
    name: "휴양지 비행",
    icon: "🏖️",
    description: "아름다운 해변과 리조트를 하늘에서 만나세요",
    bgImage: "/images/onboarding/onboarding2.png",
  },
];

const EXPERIENCE_LEVELS = [
  { value: "beginner" as const, name: "초보 조종사", description: "처음이에요, 기본부터 알려주세요" },
  { value: "intermediate" as const, name: "중급 조종사", description: "비행 경험이 조금 있어요" },
  { value: "veteran" as const, name: "베테랑 파일럿", description: "하늘은 제 놀이터입니다" },
];

const TIME_OPTIONS = [
  { value: "day" as const, name: "맑은 낮", icon: "☀️", description: "선명한 시야" },
  { value: "sunset" as const, name: "노을 저녁", icon: "🌅", description: "낭만적인 비행" },
  { value: "night" as const, name: "도시 야경", icon: "🌃", description: "화려한 불빛" },
];

const VOICE_ASSISTANTS = [
  { value: "professional", name: "브리핑 스타일", icon: "🎙️", desc: "차분하고 전문적인 안내" },
  { value: "friendly", name: "가이드 스타일", icon: "😊", desc: "친절하고 다정한 설명" },
  { value: "humorous", name: "위트 스타일", icon: "😜", desc: "재치 있는 농담과 비행" },
];

const HELI_COLORS = [
  { name: "Sky Blue", value: "#0ea5e9" },
  { name: "Classic White", value: "#f8fafc" },
  { name: "Tactical Black", value: "#1e293b" },
  { name: "Emergency Red", value: "#ef4444" },
  { name: "Safety Orange", value: "#f97316" },
];

type OnboardingStep = "welcome" | "purpose" | "profile" | "boarding-pass" | "complete";

export default function OnboardingFlow() {
  const { setPreferences, setPilotProfile, setGamePhase, setLanguage } = useGameStore();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [selectedCategories, setSelectedCategories] = useState<POICategoryCode[]>([]);
  const [callsign, setCallsign] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "veteran">("beginner");
  const [timeOfDay, setTimeOfDay] = useState<"day" | "sunset" | "night">("day");
  const [voiceAssistant, setVoiceAssistant] = useState("professional");
  const [heliColor, setHeliColor] = useState("#f97316");

  const handleCategoryToggle = (code: POICategoryCode) => {
    setSelectedCategories((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleComplete = () => {
    const finalCallsign = callsign.trim() || "PILOT";
    setPreferences(selectedCategories.length > 0 ? selectedCategories : ["landmark", "restaurant", "culture", "nature", "shopping"]);
    // 프로필 설정에 시간대 정보를 포함하여 저장 (스토어 구조에 따라 확장 가능)
    setPilotProfile({ callsign: finalCallsign, experienceLevel, timeOfDay });
    setStep("complete");
    setTimeout(() => {
      setGamePhase("takeoff");
    }, 2000);
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      {/* 배경 이미지 */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-900/30 via-black/80 to-black z-0" />

      {/* 프로그레스 바 */}
      {step !== "welcome" && step !== "complete" && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {["purpose", "profile", "boarding-pass"].map((s, i) => (
            <div
              key={s}
              className={`h-1 w-16 rounded-full transition-colors ${
                ["purpose", "profile", "boarding-pass"].indexOf(step) >= i ? "bg-orange-500" : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 overflow-y-auto pt-20 pb-10">
        {/* Welcome */}
        {step === "welcome" && (
          <div className="flex flex-col items-center text-center animate-fadeIn">
            <div className="text-5xl mb-4">✈️</div>
            <h1 className="text-xl tracking-widest text-orange-400 font-bold mb-6">SKYBOUND</h1>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              당신만의 하늘을
              <br />
              비행하세요
            </h2>
            <p className="text-gray-400 mb-10">조종사가 되어 서울을 구경해 보세요.</p>
            <button
              onClick={() => setStep("purpose")}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full text-white font-semibold text-lg hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25"
            >
              Start to Flight ✈️
            </button>
          </div>
        )}

        {/* STEP 01: 비행 목적 선택 */}
        {step === "purpose" && (
          <div className="w-full max-w-4xl animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">STEP 01</p>
            <h2 className="text-3xl font-bold mb-2">비행의 목적을 선택하세요</h2>
            <p className="text-gray-400 mb-8">어떤 경험을 원하시나요? 목적에 따라 최적의 비행 루트를 추천해드립니다.</p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => handleCategoryToggle(cat.code)}
                  className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                    selectedCategories.includes(cat.code)
                      ? "border-orange-500 bg-orange-500/10 scale-105"
                      : "border-gray-700 bg-gray-900/50 hover:border-gray-500"
                  }`}
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <h3 className="font-semibold text-sm mb-1">{cat.name}</h3>
                  <p className="text-gray-400 text-xs text-center">{cat.description}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button onClick={() => setStep("welcome")} className="text-gray-400 hover:text-white transition-colors">
                ← 이전
              </button>
              <button
                onClick={() => setStep("profile")}
                className="px-6 py-3 bg-orange-500 rounded-full text-white font-medium hover:bg-orange-600 transition-colors"
              >
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* STEP 02: 조종사 프로필 및 환경 설정 */}
        {step === "profile" && (
          <div className="w-full max-w-md animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">STEP 02</p>
            <h2 className="text-3xl font-bold mb-2">조종사 프로필 및 환경</h2>
            <p className="text-gray-400 mb-6">당신의 콜사인과 비행 설정을 알려주세요.</p>

            {/* 콜사인 입력 */}
            <div className="mb-6">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 block">콜사인 (조종사 이름)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">👤</span>
                <input
                  type="text"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  placeholder="ACE PILOT"
                  maxLength={20}
                  className="w-full pl-12 pr-4 py-3 bg-gray-900/80 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* 시간대 선택 추가 */}
            <div className="mb-6">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 block">비행 시간대</label>
              <div className="grid grid-cols-3 gap-3">
                {TIME_OPTIONS.map((time) => (
                  <button
                    key={time.value}
                    onClick={() => setTimeOfDay(time.value)}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                      timeOfDay === time.value
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-gray-700 bg-gray-900/50 hover:border-gray-500"
                    }`}
                  >
                    <span className="text-2xl mb-1">{time.icon}</span>
                    <span className="text-sm font-semibold">{time.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 block">AI 보이스 어시스턴트</label>
              <div className="space-y-2">
                {VOICE_ASSISTANTS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setVoiceAssistant(v.value)}
                    className={`w-full flex items-center gap-4 p-3 rounded-2xl border-2 transition-all text-left ${voiceAssistant === v.value ? "border-orange-500 bg-orange-500/10" : "border-gray-800 bg-gray-900/40"}`}
                  >
                    <span className="text-xl">{v.icon}</span>
                    <div>
                      <p className="font-bold text-xs">{v.name}</p>
                      <p className="text-gray-500 text-[10px]">{v.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 비행 경험 선택 */}
            <div className="mb-8">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 block">비행 경험 수준</label>
              <div className="flex flex-col gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setExperienceLevel(level.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      experienceLevel === level.value
                        ? "border-orange-500 bg-orange-500/10"
                        : "border-gray-700 bg-gray-900/50 hover:border-gray-500"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mt-1 ${
                        experienceLevel === level.value ? "border-orange-500" : "border-gray-600"
                      }`}
                    >
                      {experienceLevel === level.value && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{level.name}</p>
                      <p className="text-gray-400 text-xs">{level.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button onClick={() => setStep("purpose")} className="text-gray-400 hover:text-white transition-colors">
                ← 이전
              </button>
              <button
                onClick={() => setStep("boarding-pass")}
                className="px-6 py-3 bg-orange-500 rounded-full text-white font-medium hover:bg-orange-600 transition-colors"
              >
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* 보딩패스 */}
        {step === "boarding-pass" && (
          <div className="flex flex-col items-center animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">READY FOR TAKEOFF</p>
            <h2 className="text-4xl font-bold mb-8">비행 준비 완료</h2>

            <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 border-dashed rounded-2xl p-6 w-full max-w-md mb-8 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-orange-400">✈️</span>
                <span className="font-bold tracking-widest text-sm">SKYBOUND AIRLINES</span>
                <span className="ml-auto text-gray-400 text-[10px] border border-gray-700 px-2 py-1 rounded">BOARDING PASS</span>
              </div>

              <div className="grid grid-cols-2 gap-y-6 border-t border-gray-700 pt-6">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Pilot Name</p>
                  <p className="font-bold text-lg">{callsign || "PILOT"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Experience</p>
                  <p className="font-bold">{EXPERIENCE_LEVELS.find((l) => l.value === experienceLevel)?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Mission Type</p>
                  <p className="font-bold">
                    {selectedCategories.length > 0 ? CATEGORIES.find((c) => c.code === selectedCategories[0])?.name : "자유 비행"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Time of Flight</p>
                  <p className="font-bold text-orange-400">
                    {TIME_OPTIONS.find((t) => t.value === timeOfDay)?.icon} {TIME_OPTIONS.find((t) => t.value === timeOfDay)?.name}
                  </p>
                </div>
              </div>

              <div className="mt-8 border-t border-gray-700 pt-4 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-gray-500 text-[10px] uppercase">Gate</span>
                  <span className="font-bold">A-07</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-gray-500 text-[10px] uppercase">Status</span>
                  <span className="font-bold text-green-400 tracking-widest">CLEARED</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center w-full max-w-md">
              <button onClick={() => setStep("profile")} className="text-gray-400 hover:text-white transition-colors">
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
        {step === "complete" && (
          <div className="flex flex-col items-center text-center animate-fadeIn">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 border border-orange-500/50">
              <span className="text-3xl text-orange-400">✈️</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">비행 승인 완료!</h2>
            <p className="text-gray-400 max-w-xs">{callsign || "PILOT"} 조종사님, 곧 서울 상공으로 진입합니다. 안전 비행 하십시오.</p>
            <div className="mt-10 w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 animate-[loading_2s_ease-in-out]"></div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes loading {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
