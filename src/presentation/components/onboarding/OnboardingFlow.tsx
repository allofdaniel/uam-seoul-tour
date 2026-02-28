"use client";

import { useState } from "react";
import { useGameStore } from "@/stores/useGameStore";
import { POICategoryCode, Language } from "@/domain/types";

const T = {
  ko: {
    categories: [
      { code: "landmark" as POICategoryCode, name: "랜드마크 관광", icon: "🏛️", description: "세계적인 명소를 하늘에서 감상하세요" },
      { code: "restaurant" as POICategoryCode, name: "맛집 탐방", icon: "🍽️", description: "현지 미식 명소를 찾아 비행하세요" },
      { code: "nature" as POICategoryCode, name: "자연 탐사", icon: "🏔️", description: "웅장한 산과 숲 위를 비행하세요" },
    ],
    experienceLevels: [
      { value: "beginner" as const, name: "초보 조종사", description: "처음이에요, 기본부터 알려주세요" },
      { value: "intermediate" as const, name: "중급 조종사", description: "비행 경험이 조금 있어요" },
      { value: "veteran" as const, name: "베테랑 파일럿", description: "하늘은 제 놀이터입니다" },
    ],
    timeOptions: [
      { value: "day" as const, name: "맑은 낮", icon: "☀️", description: "선명한 시야" },
      { value: "sunset" as const, name: "노을 저녁", icon: "🌅", description: "낭만적인 비행" },
      { value: "night" as const, name: "도시 야경", icon: "🌃", description: "화려한 불빛" },
    ],
    voiceAssistants: [
      { value: "professional", name: "브리핑 스타일", icon: "🎙️", desc: "차분하고 전문적인 안내" },
      { value: "friendly", name: "가이드 스타일", icon: "😊", desc: "친절하고 다정한 설명" },
      { value: "humorous", name: "위트 스타일", icon: "😜", desc: "재치 있는 농담과 비행" },
    ],
    welcome: { title1: "서울 하늘을", title2: "비행하세요", desc1: "Gemini AI 가이드와 함께 떠나는", desc2: "도심항공교통(UAM) 서울 관광 시뮬레이션" },
    step01: { label: "STEP 01", title: "어떤 관광을 하고 싶으신가요?", desc: "목적에 따라 Gemini가 최적의 비행 루트를 안내합니다." },
    step02: { label: "STEP 02", title: "조종사 프로필", desc: "콜사인과 비행 경험을 알려주세요.", callsign: "콜사인 (조종사 이름)", time: "비행 시간대", voice: "AI 보이스 어시스턴트", exp: "비행 경험 수준" },
    boarding: { label: "BOARDING PASS", title: "비행 준비 완료", mission: "Mission", route: "Route", routeVal: "여의도 → 잠실", guide: "AI Guide", pilotName: "Pilot Name", ready: "READY", geminiNote: "Gemini AI Guide Enabled" },
    nav: { prev: "← 이전", next: "다음 →", edit: "← 수정", takeoff: "이륙하기 ✈️", freeFlight: "자유 비행" },
    complete: { title: "Gemini 가이드 연결 중...", desc1: "조종사님, Gemini가", desc2: "서울 관광 안내를 준비하고 있습니다." },
  },
  en: {
    categories: [
      { code: "landmark" as POICategoryCode, name: "Landmarks", icon: "🏛️", description: "Explore world-famous landmarks from the sky" },
      { code: "restaurant" as POICategoryCode, name: "Restaurants", icon: "🍽️", description: "Discover local culinary hotspots" },
      { code: "nature" as POICategoryCode, name: "Nature", icon: "🏔️", description: "Fly over mountains and forests" },
    ],
    experienceLevels: [
      { value: "beginner" as const, name: "Beginner Pilot", description: "First time, teach me the basics" },
      { value: "intermediate" as const, name: "Intermediate Pilot", description: "I have some flight experience" },
      { value: "veteran" as const, name: "Veteran Pilot", description: "The sky is my playground" },
    ],
    timeOptions: [
      { value: "day" as const, name: "Daytime", icon: "☀️", description: "Clear view" },
      { value: "sunset" as const, name: "Sunset", icon: "🌅", description: "Romantic flight" },
      { value: "night" as const, name: "Night", icon: "🌃", description: "City lights" },
    ],
    voiceAssistants: [
      { value: "professional", name: "Professional", icon: "🎙️", desc: "Calm and professional guidance" },
      { value: "friendly", name: "Friendly", icon: "😊", desc: "Warm and friendly narration" },
      { value: "humorous", name: "Witty", icon: "😜", desc: "Fun jokes during flight" },
    ],
    welcome: { title1: "Fly Over", title2: "Seoul Sky", desc1: "An AI-guided Urban Air Mobility", desc2: "Seoul tourism simulation with Gemini" },
    step01: { label: "STEP 01", title: "What type of tour do you want?", desc: "Gemini will guide the best flight route for you." },
    step02: { label: "STEP 02", title: "Pilot Profile", desc: "Enter your callsign and experience.", callsign: "Callsign (Pilot Name)", time: "Time of Day", voice: "AI Voice Assistant", exp: "Experience Level" },
    boarding: { label: "BOARDING PASS", title: "Ready for Takeoff", mission: "Mission", route: "Route", routeVal: "Yeouido → Jamsil", guide: "AI Guide", pilotName: "Pilot Name", ready: "READY", geminiNote: "Gemini AI Guide Enabled" },
    nav: { prev: "← Back", next: "Next →", edit: "← Edit", takeoff: "Take Off ✈️", freeFlight: "Free Flight" },
    complete: { title: "Connecting Gemini Guide...", desc1: "Pilot, Gemini is preparing", desc2: "your Seoul tour guide." },
  },
};

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
  const { setPreferences, setPilotProfile, setGamePhase, setLanguage } = useGameStore();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [selectedCategories, setSelectedCategories] = useState<POICategoryCode[]>([]);
  const [callsign, setCallsign] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "veteran">("beginner");
  const [timeOfDay, setTimeOfDay] = useState<"day" | "sunset" | "night">("day");
  const [voiceAssistant, setVoiceAssistant] = useState("professional");
  const [lang, setLang] = useState<Language>("ko");

  const t = T[lang];

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
              {t.welcome.title1}
              <br />
              {t.welcome.title2}
            </h2>
            <p className="text-gray-400 mb-4">
              {t.welcome.desc1}
              <br />
              {t.welcome.desc2}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
              <GeminiLogo size={14} />
              <span>Powered by Google Gemini</span>
            </div>

            {/* 언어 선택 */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setLang("ko")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all ${
                  lang === "ko"
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500"
                }`}
              >
                <span className="text-lg">🇰🇷</span>
                <span className="font-semibold text-sm">한국어</span>
              </button>
              <button
                onClick={() => setLang("en")}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all ${
                  lang === "en"
                    ? "border-orange-500 bg-orange-500/10 text-white"
                    : "border-gray-700 bg-gray-900/50 text-gray-400 hover:border-gray-500"
                }`}
              >
                <span className="text-lg">🇺🇸</span>
                <span className="font-semibold text-sm">English</span>
              </button>
            </div>

            <button
              onClick={() => { setLanguage(lang); setStep("purpose"); }}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full text-white font-semibold text-lg hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25"
            >
              Start Tour ✈️
            </button>
          </div>
        )}

        {/* STEP 01: 비행 목적 선택 */}
        {step === "purpose" && (
          <div className="w-full max-w-4xl animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">{t.step01.label}</p>
            <h2 className="text-3xl font-bold mb-2">{t.step01.title}</h2>
            <p className="text-gray-400 mb-8">{t.step01.desc}</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {t.categories.map((cat) => (
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
                {t.nav.prev}
              </button>
              <button
                onClick={() => setStep("profile")}
                className="px-6 py-3 bg-orange-500 rounded-full text-white font-medium hover:bg-orange-600 transition-colors"
              >
                {t.nav.next}
              </button>
            </div>
          </div>
        )}

        {/* STEP 02: 조종사 프로필 */}
        {step === "profile" && (
          <div className="w-full max-w-md animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">{t.step02.label}</p>
            <h2 className="text-3xl font-bold mb-2">{t.step02.title}</h2>
            <p className="text-gray-400 mb-6">{t.step02.desc}</p>

            <div className="mb-6">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2 block">{t.step02.callsign}</label>
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
              <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 block">{t.step02.time}</label>
              <div className="grid grid-cols-3 gap-3">
                {t.timeOptions.map((time) => (
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

            <div className="mb-8">
              <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 block">{t.step02.voice}</label>
              <div className="space-y-2">
                {t.voiceAssistants.map((v) => (
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
              <label className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3 block">{t.step02.exp}</label>
              <div className="flex flex-col gap-2">
                {t.experienceLevels.map((level) => (
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
                {t.nav.prev}
              </button>
              <button
                onClick={() => setStep("boarding-pass")}
                className="px-6 py-3 bg-orange-500 rounded-full text-white font-medium hover:bg-orange-600 transition-colors"
              >
                {t.nav.next}
              </button>
            </div>
          </div>
        )}

        {/* 보딩패스 - Gemini 브랜딩 */}
        {step === "boarding-pass" && (
          <div className="flex flex-col items-center animate-fadeIn">
            <p className="text-orange-400 text-sm mb-2 tracking-wider">{t.boarding.label}</p>
            <h2 className="text-4xl font-bold mb-8">{t.boarding.title}</h2>

            <div className="bg-gray-900/80 backdrop-blur-sm border border-orange-500/30 border-dashed rounded-2xl p-6 w-full max-w-md mb-8 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-orange-500 text-xl font-black italic">UAM TOUR</span>
                <span className="text-gray-500 text-sm">with</span>
                <GeminiLogo size={20} />
                <span className="ml-auto text-gray-400 text-[10px] border border-gray-700 px-2 py-1 rounded">BOARDING PASS</span>
              </div>

              <div className="grid grid-cols-2 gap-y-6 border-t border-gray-700 pt-6">
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">{t.boarding.pilotName}</p>
                  <p className="font-bold text-lg">{callsign || "PILOT"}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">{t.boarding.guide}</p>
                  <p className="font-bold">Gemini</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">{t.boarding.mission}</p>
                  <p className="font-bold">
                    {selectedCategories.length > 0 ? t.categories.find((c) => c.code === selectedCategories[0])?.name : t.nav.freeFlight}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] uppercase">{t.boarding.route}</p>
                  <p className="font-bold text-orange-400">{t.boarding.routeVal}</p>
                </div>
              </div>

              <div className="mt-8 border-t border-gray-700 pt-4 flex justify-between items-center">
                <div className="text-[9px] text-gray-500 uppercase font-bold">{t.boarding.geminiNote}</div>
                <div className="font-bold text-green-400 tracking-widest text-xs">{t.boarding.ready}</div>
              </div>
            </div>

            <div className="flex justify-between items-center w-full max-w-md">
              <button onClick={() => setStep("profile")} className="text-gray-400 hover:text-white transition-colors">
                {t.nav.edit}
              </button>
              <button
                onClick={handleComplete}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full text-white font-semibold text-lg hover:from-orange-600 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25"
              >
                {t.nav.takeoff}
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
            <h2 className="text-3xl font-bold mb-4">{t.complete.title}</h2>
            <p className="text-gray-400 max-w-xs">
              {callsign || "PILOT"} {t.complete.desc1}
              <br />
              {t.complete.desc2}
            </p>
            <div className="mt-10 w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-[loading_2s_ease-in-out_forwards]" />
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
