import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Heart, Globe, Lock, HardDrive, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import AvatarChibi from '../components/common/AvatarChibi';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#B6AEDF] flex items-center justify-center p-4 sm:p-6 select-none">
      {/* Smartphone Card Surface */}
      <div className="bg-white rounded-[32px] max-w-md w-full shadow-2xl border border-white/60 p-6 sm:p-8 flex flex-col items-center text-center relative overflow-hidden">
        {/* Soft decorative background glows */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-rose-100/60 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-purple-100/60 blur-2xl pointer-events-none" />

        {/* Language Selection Pill at Top */}
        <div className="w-full flex justify-end mb-4">
          <button
            type="button"
            onClick={() => setLanguage(language === 'ta' ? 'en' : 'ta')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-[#E9E5FF] hover:bg-purple-200 text-purple-900 border border-purple-200 transition shadow-xs"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'ta' ? 'English' : 'தமிழ் (Tamil)'}</span>
          </button>
        </div>

        {/* Chibi Female Avatar & Brand */}
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#FFE2E8] to-[#FFF5ED] flex items-center justify-center shadow-lg shadow-rose-200/50 border-2 border-white">
            <AvatarChibi expression="happy" size={72} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#FF668A] text-white flex items-center justify-center shadow-sm">
            <Heart className="w-4 h-4 fill-current" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-[#24232B] tracking-tight">
          {language === 'ta' ? 'ஹெர்கேர்' : 'HerCare'}
        </h1>
        <p className="text-xs font-bold text-[#FF668A] mt-1 uppercase tracking-wider">
          {language === 'ta' ? 'பாதுகாப்பான ஏஐ மாதவிடாய் நல்வாழ்வுத் துணை' : 'Privacy-First AI Menstrual Companion'}
        </p>

        {/* Tagline specified in requirements */}
        <div className="mt-4 p-3.5 bg-[#FFF5ED] rounded-2xl border border-[#FFE4CC] text-xs font-bold text-[#77747F] leading-relaxed">
          {language === 'ta'
            ? '“உங்கள் நல்வாழ்வு. உங்கள் மொழி. உங்கள் தகவல். உங்கள் கட்டுப்பாடு.”'
            : '“Your health. Your language. Your data. Your control.”'}
        </div>

        {/* CIA Triad / Privacy Badges */}
        <div className="grid grid-cols-3 gap-2 w-full mt-5">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
            <HardDrive className="w-4 h-4 text-purple-600 mb-1" />
            <span className="text-[10px] font-bold text-slate-700">IndexedDB</span>
            <span className="text-[9px] text-slate-400">{t('welcome.local_first')}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
            <Lock className="w-4 h-4 text-rose-500 mb-1" />
            <span className="text-[10px] font-bold text-slate-700">AES-256</span>
            <span className="text-[9px] text-slate-400">{t('welcome.encrypted')}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center">
            <Sparkles className="w-4 h-4 text-emerald-600 mb-1" />
            <span className="text-[10px] font-bold text-slate-700">{t('welcome.voice_ai')}</span>
            <span className="text-[9px] text-slate-400">{t('welcome.tamil_eng')}</span>
          </div>
        </div>

        {/* Action Buttons: Get Started & Login */}
        <div className="w-full mt-6 space-y-3">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3.5 px-4 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition flex items-center justify-center space-x-2"
          >
            <span>{language === 'ta' ? 'தொடங்கவும்' : 'Get Started'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition"
          >
            {language === 'ta' ? 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழையவும்' : 'Already have an account? Log In'}
          </button>
        </div>

        {/* Medical disclaimer note */}
        <p className="mt-5 text-[10px] text-slate-400 max-w-xs">
          {language === 'ta'
            ? 'இது பொதுவான நல்வாழ்வு வழிகாட்டுதல் மட்டுமே; மருத்துவ ஆலோசனை அல்ல.'
            : 'This is general wellness guidance, not medical advice.'}
        </p>
      </div>
    </div>
  );
}
