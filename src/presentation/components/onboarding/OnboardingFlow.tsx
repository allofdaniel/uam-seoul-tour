"use client";

import { useState, useEffect } from "react";

/**
 * 외부 파일 의존성을 제거하기 위해 내부 타입 및 모킹 스토어를 정의합니다.
 */
type POICategoryCode = "landmark" | "restaurant" | "culture" | "nature" | "shopping";

// 모킹된 스토어 훅
const useGameStore = () => {
  return {
    setPreferences: (prefs: POICategoryCode[]) => console.log("Preferences saved:", prefs),
    setPilotProfile: (profile: any) => console.log("Profile saved:", profile),
    setGamePhase: (phase: string) => console.log("Game phase changed to:", phase),
    setLanguage: (lang: string) => console.log("Language set to:", lang),
  };
};

const CATEGORIES: { code: POICategoryCode; name: string; icon: string; description: string }[] = [
  { code: "landmark", name: "랜드마크 관광", icon: "🏛️", description: "세계적인 명소를 감상하세요" },
  { code: "restaurant", name: "맛집 탐방", icon: "🍽️", description: "현지 미식 명소를 찾으세요" },
  { code: "culture", name: "도시 탐험", icon: "🏙️", description: "도시의 스카이라인을 탐험하세요" },
  { code: "nature", name: "자연 탐사", icon: "🏔️", description: "웅장한 산과 숲을 비행하세요" },
  { code: "shopping", name: "휴양지 비행", icon: "🏖️", description: "해변과 리조트를 만나세요" },
];

const EXPERIENCE_LEVELS = [
  { value: "beginner", name: "초보", description: "자동 제어 지원" },
  { value: "intermediate", name: "중급", description: "표준 물리 적용" },
  { value: "veteran", name: "베테랑", description: "완전 수동 기동" },
];

const TIME_OPTIONS = [
  { value: "day", name: "맑은 낮", icon: "☀️" },
  { value: "sunset", name: "노을 저녁", icon: "🌅" },
  { value: "night", name: "도시 야경", icon: "🌃" },
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
  const { setPreferences, setPilotProfile, setGamePhase } = useGameStore();

  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [selectedCategories, setSelectedCategories] = useState<POICategoryCode[]>([]);
  const [callsign, setCallsign] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [timeOfDay, setTimeOfDay] = useState("day");
  const [voiceAssistant, setVoiceAssistant] = useState("professional");
  const [heliColor, setHeliColor] = useState("#f97316");

  const handleCategoryToggle = (code: POICategoryCode) => {
    setSelectedCategories((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleComplete = () => {
    const finalCallsign = callsign.trim() || "PILOT";
    setPreferences(selectedCategories.length > 0 ? selectedCategories : ["landmark"]);
    setPilotProfile({
      callsign: finalCallsign,
      experienceLevel,
      timeOfDay,
      voiceAssistant,
      heliColor,
    });
    setStep("complete");
    setTimeout(() => setGamePhase("takeoff"), 2500);
  };

  return (
    <div className="relative w-full h-screen bg-black text-white overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-b from-orange-900/20 via-black/80 to-black z-0" />

      {step !== "welcome" && step !== "complete" && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {["purpose", "profile", "boarding-pass"].map((s, i) => (
            <div
              key={s}
              className={`h-1 w-16 rounded-full transition-all duration-500 ${["purpose", "profile", "boarding-pass"].indexOf(step) >= i ? "bg-orange-500 shadow-[0_0_8px_#f97316]" : "bg-gray-800"}`}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 overflow-y-auto pt-10 pb-10">
        {step === "welcome" && (
          <div className="flex flex-col items-center text-center space-y-6 max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-6xl mb-2">🚁</div>
            <div className="space-y-2">
              <h1 className="text-sm tracking-[0.4em] text-orange-500 font-bold uppercase">Skybound Simulation</h1>
              <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                당신만의 하늘을
                <br />
                비행하세요
              </h2>
            </div>
            <p className="text-gray-400 text-lg">AI 보이스 가이드와 함께 떠나는 지능형 비행 시뮬레이션</p>
            <button
              onClick={() => setStep("purpose")}
              className="mt-4 px-10 py-4 bg-gradient-to-r from-orange-600 to-orange-400 rounded-full text-white font-bold text-lg shadow-xl shadow-orange-500/20 hover:scale-105 transition-all"
            >
              Start Mission ✈️
            </button>
          </div>
        )}

        {step === "purpose" && (
          <div className="w-full max-w-4xl animate-in fade-in slide-in-from-right-4 duration-500">
            <header className="mb-8">
              <p className="text-orange-500 text-xs font-bold tracking-widest mb-1 uppercase">Step 01 / Mission</p>
              <h2 className="text-3xl font-bold mb-2">비행의 목적을 선택하세요</h2>
            </header>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => handleCategoryToggle(cat.code)}
                  className={`group relative flex flex-col items-center p-6 rounded-3xl border-2 transition-all duration-300 ${selectedCategories.includes(cat.code) ? "border-orange-500 bg-orange-500/10 shadow-lg" : "border-gray-800 bg-gray-900/40 hover:border-gray-600"}`}
                >
                  <div className="text-4xl mb-3">{cat.icon}</div>
                  <h3 className="font-bold text-sm mb-1">{cat.name}</h3>
                  <p className="text-gray-500 text-[10px] text-center leading-tight">{cat.description}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <button onClick={() => setStep("welcome")} className="text-gray-500 hover:text-white transition-colors">
                ← 이전으로
              </button>
              <button
                onClick={() => setStep("profile")}
                className="px-8 py-3 bg-orange-500 rounded-full text-white font-bold shadow-lg shadow-orange-500/20"
              >
                다음 단계로 →
              </button>
            </div>
          </div>
        )}

        {step === "profile" && (
          <div className="w-full max-w-4xl animate-in fade-in slide-in-from-right-4 duration-500">
            <header className="mb-8">
              <p className="text-orange-500 text-xs font-bold tracking-widest mb-1 uppercase">Step 02 / Customization</p>
              <h2 className="text-3xl font-bold mb-2">조종사 및 기체 설정</h2>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 block">콜사인 (파일럿 이름)</label>
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    placeholder="예: CAPTAIN ACE"
                    className="w-full px-5 py-3 bg-gray-900/60 border border-gray-800 rounded-2xl text-white outline-none focus:border-orange-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 block">기체 색상 선택</label>
                  <div className="flex gap-3">
                    {HELI_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setHeliColor(c.value)}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${heliColor === c.value ? "border-white scale-110 shadow-lg" : "border-transparent"}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 block">비행 시간대</label>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTimeOfDay(t.value)}
                        className={`p-3 rounded-xl border-2 transition-all text-xs font-bold flex items-center justify-center gap-2 ${timeOfDay === t.value ? "border-orange-500 bg-orange-500/10" : "border-gray-800 bg-gray-900/40"}`}
                      >
                        <span>{t.icon}</span> {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
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

                <div>
                  <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-3 block">조종 숙련도</label>
                  <div className="grid grid-cols-3 gap-2">
                    {EXPERIENCE_LEVELS.map((e) => (
                      <button
                        key={e.value}
                        onClick={() => setExperienceLevel(e.value)}
                        className={`p-3 rounded-xl border-2 transition-all text-[10px] font-bold text-center ${experienceLevel === e.value ? "border-orange-500 bg-orange-500/10" : "border-gray-800 bg-gray-900/40"}`}
                      >
                        {e.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-10">
              <button onClick={() => setStep("purpose")} className="text-gray-500 hover:text-white transition-colors">
                ← 이전
              </button>
              <button onClick={() => setStep("boarding-pass")} className="px-8 py-3 bg-orange-500 rounded-full text-white font-bold">
                조종 준비 완료 →
              </button>
            </div>
          </div>
        )}

        {step === "boarding-pass" && (
          <div className="flex flex-col items-center animate-in zoom-in-95 duration-500">
            <p className="text-orange-500 text-xs font-bold tracking-widest mb-2 uppercase">Confirmation</p>
            <h2 className="text-4xl font-black mb-10">비행 준비 완료</h2>
            <div className="relative bg-gray-900/90 backdrop-blur-xl border-2 border-orange-500/30 border-dashed rounded-[2rem] p-8 w-full max-w-md mb-10 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <span className="text-orange-500 text-xl font-black italic">SKYBOUND</span>
                <div className="w-12 h-12 rounded-full border-4 border-orange-500/20" style={{ backgroundColor: heliColor }}></div>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 pb-8 border-b border-gray-800/60 border-dashed">
                <div>
                  <p className="text-gray-600 text-[9px] font-bold uppercase">Pilot</p>
                  <p className="font-black text-lg truncate">{callsign || "ACE PILOT"}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[9px] font-bold uppercase">AI Guide</p>
                  <p className="font-bold text-gray-300">{VOICE_ASSISTANTS.find((v) => v.value === voiceAssistant)?.name}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-[9px] font-bold uppercase">Mission</p>
                  <p className="font-bold text-gray-300">
                    {selectedCategories.length > 0 ? CATEGORIES.find((c) => c.code === selectedCategories[0])?.name : "자유 비행"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-[9px] font-bold uppercase">Departure</p>
                  <p className="font-black text-orange-500">
                    {TIME_OPTIONS.find((t) => t.value === timeOfDay)?.icon} {TIME_OPTIONS.find((t) => t.value === timeOfDay)?.name}
                  </p>
                </div>
              </div>
              <div className="pt-6 flex justify-between items-center">
                <div className="text-[9px] text-gray-500 uppercase font-bold">Voice Control Enabled</div>
                <div className="text-green-500 font-black text-xs tracking-widest">READY</div>
              </div>
            </div>
            <div className="flex gap-4 w-full max-w-md">
              <button
                onClick={() => setStep("profile")}
                className="flex-1 py-4 bg-gray-900 border border-gray-800 rounded-2xl font-bold text-gray-400"
              >
                정보 수정
              </button>
              <button
                onClick={handleComplete}
                className="flex-[2] py-4 bg-gradient-to-r from-orange-600 to-orange-400 rounded-2xl text-white font-black text-lg shadow-xl shadow-orange-600/20 active:scale-95 transition-all"
              >
                Mission Start! 🚁
              </button>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700">
            <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center border-2 border-orange-500 animate-pulse mb-10">
              <span className="text-5xl">🎙️</span>
            </div>
            <h2 className="text-4xl font-black mb-4">음성 엔진 활성화 중...</h2>
            <p className="text-gray-400 text-lg mb-10">
              {callsign || "PILOT"}님, {VOICE_ASSISTANTS.find((v) => v.value === voiceAssistant)?.name}가<br />
              안전 비행을 돕기 위해 무전을 대기 중입니다.
            </p>
            <div className="w-64 h-1.5 bg-gray-900 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-orange-500 animate-loading-bar origin-left" />
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .animate-loading-bar {
          animation: load 2.5s cubic-bezier(0.65, 0, 0.35, 1) forwards;
        }
        @keyframes load {
          0% {
            transform: scaleX(0);
          }
          100% {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}
