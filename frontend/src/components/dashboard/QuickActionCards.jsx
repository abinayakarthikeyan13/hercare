import React from 'react';
import { Pill, MessageSquareHeart, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import AvatarChibi from '../common/AvatarChibi';

/**
 * QuickActionCards
 * Recreates the 3 cute quick action cards from the bottom of Screen A in the design reference:
 * 1. Peach card: Mood ("how are you feeling?")
 * 2. Soft pink card: Cramps ("Any Symptoms?")
 * 3. Light mint/blue card: Drugs ("Took any supplements?")
 */
export default function QuickActionCards({
  onOpenMood,
  onOpenCramps,
  onOpenSupplements,
  onOpenAiCompanion
}) {
  const { language } = useLanguage();

  return (
    <div className="grid grid-cols-3 gap-3 w-full select-none">
      {/* 1. Mood Card (Peach) */}
      <button
        type="button"
        onClick={onOpenMood}
        className="bg-[#FFE4CC] hover:bg-[#FFDAC0] p-3.5 rounded-3xl flex flex-col items-center justify-between text-center transition transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm border border-orange-200/50 group h-36"
      >
        <AvatarChibi expression="happy" size={44} className="group-hover:scale-110 transition" />
        <div className="mt-1">
          <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">
            {language === 'ta' ? 'மனநிலை' : 'Mood'}
          </h4>
          <p className="text-[10px] font-semibold text-slate-600 leading-tight mt-0.5">
            {language === 'ta' ? 'உணர்வு எப்படி?' : 'how are you feeling?'}
          </p>
        </div>
      </button>

      {/* 2. Cramps / Symptoms Card (Soft Pink) */}
      <button
        type="button"
        onClick={onOpenCramps}
        className="bg-[#FFE2E8] hover:bg-[#FFD5DF] p-3.5 rounded-3xl flex flex-col items-center justify-between text-center transition transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm border border-rose-200/50 group h-36"
      >
        <AvatarChibi expression="cramps" size={44} className="group-hover:scale-110 transition" />
        <div className="mt-1">
          <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">
            {language === 'ta' ? 'வலிகள்' : 'Cramps'}
          </h4>
          <p className="text-[10px] font-semibold text-slate-600 leading-tight mt-0.5">
            {language === 'ta' ? 'அறிகுறிகள் ஏதேனும்?' : 'Any Symptoms?'}
          </p>
        </div>
      </button>

      {/* 3. Drugs / Supplements Card (Mint / Light Blue) */}
      <button
        type="button"
        onClick={onOpenSupplements}
        className="bg-[#DDF8F4] hover:bg-[#CDF4EE] p-3.5 rounded-3xl flex flex-col items-center justify-between text-center transition transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm border border-teal-200/50 group h-36"
      >
        <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-teal-600 shadow-xs group-hover:scale-110 transition">
          <Pill className="w-6 h-6 transform -rotate-45" />
        </div>
        <div className="mt-1">
          <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight">
            {language === 'ta' ? 'மருந்துகள்' : 'Drugs'}
          </h4>
          <p className="text-[10px] font-semibold text-slate-600 leading-tight mt-0.5">
            {language === 'ta' ? 'சத்து மாத்திரைகள்?' : 'Took any supplements?'}
          </p>
        </div>
      </button>
    </div>
  );
}
