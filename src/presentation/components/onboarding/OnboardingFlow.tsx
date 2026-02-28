"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/useGameStore";
import { POICategoryCode } from "@/domain/types";

const CATEGORIES: { code: POICategoryCode; name: string; icon: string; description: string }[] = [
  { code: "landmark", name: "랜드마크 관광", icon: "🏛️", description: "세계적인 명소를 하늘에서 감상하세요" },
  { code: "restaurant", name: "맛집 탐방", icon: "🍽️", description: "현지 미식 명소를 찾아 비행하세요" },
  { code: "culture", name: "도시 탐험", icon: "🏙️", description: "도시의 스카이라인을 탐험하세요" },
  { code: "nature", name: "자연 탐사", icon: "🏔️", description: "웅장한 산과 숲 위를 비행하세요" },
  { code: "shopping", name: "휴양지 비행", icon: "🏖️", description: "해변과 리조트를 만나세요" },
];

const EXPERIENCE_LEVELS = [
  { value: "beginner" as const, name: "초보 조종사", description: "처음이에요, 기본부터 알려주세요" },
  { value: "intermediate" as const, name: "중급 조종사", description: "비행 경험이 조금 있어요" },
  { value: "veteran" as const, name: "베테랑 파일럿", description: "하늘은 제 놀이터입니다" },
];

type OnboardingStep = "welcome" | "purpose" | "profile" | "boarding-pass" | "complete";

// Gemini 로고 SVG
function GeminiLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 0C14 7.732 7.732 14 0 14c7.732 0 14 6.268 14 14 0-7.732 6.268-14 14-14-7.732 0-14-6.268-14-14Z"
        fill="url(#gemini-gradient)"
      />
      <defs>
        <linearGradient id="gemini-gradient" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4285F4" />
          <stop offset="0.5" stopColor="#9B72CB" />
          <stop offset="1" stopColor="#D96570" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function OnboardingFlow() {
  const { setPreferences, setPilotProfile, setGamePhase } = useGameStore();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [selectedCategories, setSelectedCategories] = useState<POICategoryCode[]>([]);
  const [callsign, setCallsign] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "veteran">("beginner");

  const handleCategoryToggle = (code: POICategoryCode) => {
    setSelectedCategories((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleComplete = () => {
    const finalCallsign = callsign.trim() || "PILOT";
    setPreferences(selectedCategories.length > 0 ? selectedCategories : ["landmark", "restaurant", "culture", "nature", "shopping"]);
    setPilotProfile({ callsign: finalCallsign, experienceLevel });
    setStep("complete");
    setTimeout(() => setGamePhase("takeoff"), 2000);
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-black/80 to-black z-0" />

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
        {/* Welcome - Gemini 브랜딩 */}
        {step === "welcome" && (
          <div className="flex flex-col items-center text-center animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <GeminiLogo size={40} />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Gemini
              </span>
            </div>
            <div className="text-5xl mb-4">✈️</div>
            <h1 className="text-sm tracking-[0.3em] text-orange-400 font-bold uppercase mb-4">UAM Tour with Gemini</h1>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              서울 하늘을
              <br />
              비행하세요
            </h2>
            <p className="text-gray-400 mb-4">
              Gemini AI 가이드와 함께 떠나는
              <br />
              도심항공교통(UAM) 서울 관광 시뮬레이션
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-8">
              <GeminiLogo size={14} />
              <span>Powered by Google Gemini</span>
            </div>
            <button
              onClick={() => setStep("purpose")}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full text-white font-semibold text-lg hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25"
            >
              Start Tour ✈️
            </button>
          </div>
        )}

        {/* STEP 01: 비행 목적 선택 */}
        {step === "purpose" && (
          <div className="w-full max-w-4xl animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">STEP 01</p>
            <h2 className="text-3xl font-bold mb-2">어떤 관광을 하고 싶으신가요?</h2>
            <p className="text-gray-400 mb-8">목적에 따라 Gemini가 최적의 비행 루트를 안내합니다.</p>

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

        {/* STEP 02: 조종사 프로필 */}
        {step === "profile" && (
          <div className="w-full max-w-md animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">STEP 02</p>
            <h2 className="text-3xl font-bold mb-2">조종사 프로필</h2>
            <p className="text-gray-400 mb-6">콜사인과 비행 경험을 알려주세요.</p>

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

        {/* 보딩패스 - Gemini 브랜딩 */}
        {step === "boarding-pass" && (
          <div className="flex flex-col items-center animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">BOARDING PASS</p>
            <h2 className="text-4xl font-bold mb-8">비행 준비 완료</h2>

            <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 border-dashed rounded-2xl p-6 w-full max-w-md mb-8 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-orange-500 text-xl font-black italic">UAM TOUR</span>
                <span className="text-gray-500 text-sm">with</span>
                <GeminiLogo size={20} />
                <span className="ml-auto text-gray-400 text-[10px] border border-gray-700 px-2 py-1 rounded">BOARDING PASS</span>
              </div>

              <div className="grid grid-cols-2 gap-y-6 border-t border-gray-700 pt-6">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Pilot Name</p>
                  <p className="font-bold text-lg">{callsign || "PILOT"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">AI Guide</p>
                  <p className="font-bold">Gemini</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Mission</p>
                  <p className="font-bold">
                    {selectedCategories.length > 0 ? CATEGORIES.find((c) => c.code === selectedCategories[0])?.name : "자유 비행"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">Route</p>
                  <p className="font-bold text-orange-400">여의도 → 잠실</p>
                </div>
              </div>

              <div className="mt-8 border-t border-gray-700 pt-4 flex justify-between items-center">
                <div className="text-[9px] text-gray-500 uppercase font-bold">Gemini AI Guide Enabled</div>
                <div className="font-bold text-green-400 tracking-widest text-xs">READY</div>
              </div>
            </div>

            <div className="flex justify-between items-center w-full max-w-md">
              <button onClick={() => setStep("profile")} className="text-gray-400 hover:text-white transition-colors">
                ← 수정
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

        {/* 온보딩 완료 - Gemini 연결 */}
        {step === "complete" && (
          <div className="flex flex-col items-center text-center animate-fadeIn">
            <div className="mb-6">
              <GeminiLogo size={56} />
            </div>
            <h2 className="text-3xl font-bold mb-4">Gemini 가이드 연결 중...</h2>
            <p className="text-gray-400 max-w-xs">
              {callsign || "PILOT"} 조종사님, Gemini가
              <br />
              서울 관광 안내를 준비하고 있습니다.
            </p>
            <div className="mt-10 w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-[loading_2s_ease-in-out_forwards]" />
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
