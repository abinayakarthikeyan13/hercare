import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import AvatarChibi from '../components/common/AvatarChibi';
import { Globe, ArrowRight, Check } from 'lucide-react';

export default function LanguageSelectPage() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  const handleContinue = () => {
    navigate('/onboarding');
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-5 overflow-hidden bg-[#FAF7FD] dark:bg-slate-950 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] max-w-md w-full h-[96dvh] max-h-[820px] shadow-2xl border border-purple-100 dark:border-slate-800 flex flex-col justify-between p-6 sm:p-8 relative overflow-hidden">
        
        {/* Soft background ambient blurs */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-rose-100/60 dark:bg-rose-950/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-purple-100/60 dark:bg-purple-950/20 blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="text-center z-10">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-pink-100 to-purple-100 dark:from-pink-950 dark:to-purple-950 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md mb-3">
            <AvatarChibi expression="happy" size={54} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF668A] bg-rose-50 dark:bg-rose-950/50 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/40 inline-block mb-1">
            {t('common.step_language')}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('language_select.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {t('language_select.subtitle')}
          </p>
        </div>

        {/* Language Selection Cards (English vs தமிழ்) */}
        <div className="space-y-3.5 my-auto z-10">
          {/* Option 1: English */}
          <div
            onClick={() => setLanguage('en')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
              language === 'en'
                ? 'border-[#FF668A] bg-rose-50/70 dark:bg-rose-950/40 shadow-md shadow-rose-200/40 dark:shadow-none'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${
                  language === 'en'
                    ? 'bg-[#FF668A] text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                EN
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {t('language_select.en_card_title')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('language_select.en_card_desc')}
                </p>
              </div>
            </div>

            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                language === 'en'
                  ? 'border-[#FF668A] bg-[#FF668A] text-white'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {language === 'en' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>

          {/* Option 2: Tamil */}
          <div
            onClick={() => setLanguage('ta')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
              language === 'ta'
                ? 'border-[#FF668A] bg-rose-50/70 dark:bg-rose-950/40 shadow-md shadow-rose-200/40 dark:shadow-none'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center space-x-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black ${
                  language === 'ta'
                    ? 'bg-[#FF668A] text-white shadow-sm'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                த
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {t('language_select.ta_card_title')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('language_select.ta_card_desc')}
                </p>
              </div>
            </div>

            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-2 ${
                language === 'ta'
                  ? 'border-[#FF668A] bg-[#FF668A] text-white'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {language === 'ta' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </div>

        {/* Bottom Continue Action */}
        <div className="z-10 space-y-2">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full py-3.5 px-4 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition flex items-center justify-center space-x-2 active:scale-98"
          >
            <span>{t('language_select.btn_continue')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[11px] text-slate-400 text-center">
            {language === 'ta'
              ? 'பின்னர் சுயவிவரத்தில் (Profile) மொழியை எப்போது வேண்டுமானாலும் மாற்றலாம்.'
              : 'You can change your language anytime from your Profile settings.'}
          </p>
        </div>

      </div>
    </div>
  );
}
