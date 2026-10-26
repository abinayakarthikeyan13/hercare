import React from 'react';
import { Sparkles, Mic, ShieldCheck, ArrowRight, Volume2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import AvatarChibi from '../common/AvatarChibi';

/**
 * AiCompanionCard
 * Home Dashboard AI Companion Widget:
 * - Cute 2D female avatar
 * - Ask HerCare voice button
 * - Privacy indicator (IndexedDB Local-First)
 */
export default function AiCompanionCard({ onOpenChat, nickname = 'Friend' }) {
  const { language, t } = useLanguage();

  return (
    <div className="bg-gradient-to-r from-[#E9E5FF] via-[#F5F3FF] to-[#FFE2E8] rounded-3xl p-5 border border-purple-200/60 shadow-sm flex items-center justify-between">
      <div className="flex items-center space-x-3.5">
        <div className="relative">
          <AvatarChibi expression="happy" size={56} />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white" title="Voice AI Ready">
            <Mic className="w-2.5 h-2.5" />
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-1.5 mb-0.5">
            <span className="text-sm font-extrabold text-slate-900">
              {language === 'ta' ? 'ஹெர்கேர் ஏஐ தோழி' : 'HerCare Companion'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
              {language === 'ta' ? 'தமிழ் ஒலி' : 'Voice AI'}
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-xs">
            {language === 'ta'
              ? `வணக்கம் ${nickname}! இன்று உங்கள் உடல் நலம் எப்படி இருக்கிறது?`
              : `Hi ${nickname}! Ask me about gentle cramp relief, food, or cycle questions.`}
          </p>
          <div className="flex items-center space-x-1 text-[10px] text-slate-500 mt-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>{t('common.zero_cloud')}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenChat}
        className="px-4 py-2.5 rounded-2xl bg-[#24232B] hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition flex items-center space-x-1.5 flex-shrink-0"
      >
        <span>{language === 'ta' ? 'உரையாடு' : 'Ask HerCare'}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
