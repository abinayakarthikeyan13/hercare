import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useCycle } from '../context/CycleContext';
import { useAssistant, usePageContext } from '../context/AssistantContext';
import HerCareAvatar from '../components/common/HerCareAvatar';
import MoodSymptomDrawer from '../components/dashboard/MoodSymptomDrawer';
import { Sparkles, Send, Calendar, Heart, ChevronRight } from 'lucide-react';

/**
 * Home dashboard: avatar, compact text chat entry, cycle card, check-in card,
 * daily wellness guidance and the privacy reassurance badge.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { symptomLogs, addSymptomLog, updateSymptomLog, deleteSymptomLog, getCurrentPhase } = useCycle();

  const phaseInfo = getCurrentPhase();

  const [quickPrompt, setQuickPrompt] = useState('');
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedDateForCheckIn, setSelectedDateForCheckIn] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Today's saved check-in (if any) for a truthful dashboard state
  const todayLog = symptomLogs.find((l) => l.date === selectedDateForCheckIn) || null;

  // Live page context for the assistant: reflect the real check-in state
  const { registerAction } = useAssistant();
  usePageContext({
    // Her spoken opening question reflects the REAL check-in state
    greeting:
      language === 'ta'
        ? todayLog
          ? 'இன்றைய செக்-இன் சேமிக்கப்பட்டது! 🌸 வேறு ஏதேனும் உதவி வேண்டுமா?'
          : 'இன்றைய செக்-இன் இன்னும் பதிவு செய்யப்படவில்லை — இப்போது பதிவு செய்யலாமா? 🌸'
        : todayLog
        ? "Today's check-in is saved! 🌸 Need anything else from me?"
        : "Today's check-in isn't logged yet — shall we log it now? 🌸",
    sections: [
      language === 'ta'
        ? todayLog
          ? 'இன்றைய செக்-இன்: சேமிக்கப்பட்டது ✓'
          : 'இன்றைய செக்-இன்: இதுவரை பதிவு இல்லை'
        : todayLog
        ? "Today's check-in: saved ✓"
        : "Today's check-in: not logged yet",
    ],
  });

  // Real app actions the assistant may propose (confirmation-gated by UI)
  useEffect(() => {
    const unsubs = [
      registerAction({
        id: 'open_dial',
        label: t('assistant.open_dial_label'),
        needsConfirm: false,
        run: () => {
          navigate('/cycle');
          return { ok: true, message: t('assistant.action_opened') };
        },
      }),
      registerAction({
        id: 'open_check_in',
        label: t('assistant.open_check_in_label'),
        needsConfirm: false,
        run: () => {
          setSelectedDateForCheckIn(new Date().toISOString().split('T')[0]);
          setIsCheckInOpen(true);
          return { ok: true, message: t('assistant.checkin_opened') };
        },
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [registerAction, t, navigate]);

  const handleHomeQuickAsk = (e) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    navigate('/ai', { state: { presetMessage: quickPrompt.trim() } });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2.5 flex flex-col justify-between space-y-2.5 animate-fadeIn">
      {/* Product Identity & Tagline */}
      <div className="text-center shrink-0">
        <p className="text-[10px] font-extrabold tracking-wide uppercase text-slate-400 dark:text-slate-500">
          {t('dashboard.welcome_tagline')}
        </p>
      </div>

      {/* Central Circular HerCare AI Avatar & Tap To Talk */}
      <div className="flex flex-col items-center justify-center py-1 shrink-0">
        <HerCareAvatar
          size={92}
          state="idle"
          expression="happy"
          onClick={() => navigate('/ai')}
        />

        <button
          type="button"
          onClick={() => navigate('/ai')}
          className="mt-2.5 px-4 py-1.5 rounded-full text-xs font-black text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/25 flex items-center space-x-1.5 active:scale-95 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('dashboard.tap_to_talk')}</span>
        </button>
      </div>

      {/* Compact Quick Text Input */}
      <form onSubmit={handleHomeQuickAsk} className="shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            placeholder={t('dashboard.quick_prompt_placeholder')}
            aria-label={t('dashboard.quick_prompt_placeholder')}
            className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl border border-purple-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
          />
          <button
            type="submit"
            aria-label={t('chat.btn_send')}
            className="absolute right-1.5 w-8 h-8 rounded-xl bg-[#FF668A] text-white flex items-center justify-center hover:bg-rose-600 transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* 2 Compact Feature Cards */}
      <div className="grid grid-cols-2 gap-2 shrink-0">
        {/* CARD 1: Cycle Tracker Card */}
        <button
          type="button"
          onClick={() => navigate('/cycle')}
          className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-100 dark:border-slate-800 shadow-xs cursor-pointer hover:border-rose-300 transition flex flex-col justify-between text-left"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">
                {t('dashboard.cycle_card_title')}
              </span>
              <Calendar className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">
              {phaseInfo.hasRecords
                ? `${t('dashboard.cycle_day_prefix')} ${phaseInfo.dayOfCycle}`
                : language === 'ta'
                ? 'பதிவு இல்லை'
                : 'No records yet'}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              {!phaseInfo.hasRecords
                ? language === 'ta'
                  ? 'மாதவிடாய் தேதியைப் பதிவு செய்யவும்'
                  : 'Log your period dates to start'
                : phaseInfo.phase === 'menstrual'
                ? t('dashboard.conception_chance_low')
                : phaseInfo.phase === 'ovulatory'
                ? t('dashboard.conception_chance_high')
                : t('dashboard.next_period_estimate') +
                  ' ' +
                  phaseInfo.daysToNext +
                  ' ' +
                  t('dashboard.days')}
            </p>
          </div>

          <div className="mt-2 flex items-center text-[10px] font-extrabold text-[#FF668A]">
            <span>{language === 'ta' ? 'டயலைத் திற' : 'Open Dial'}</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </button>

        {/* CARD 2: How Are You Feeling? Card */}
        <button
          type="button"
          onClick={() => setIsCheckInOpen(true)}
          className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 shadow-xs cursor-pointer hover:border-purple-300 transition flex flex-col justify-between text-left"
        >
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600">
                {language === 'ta' ? 'உணர்வுப் பதிவு' : 'Check-In'}
              </span>
              <Heart className="w-3.5 h-3.5 text-purple-500 fill-current" />
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">
              {t('dashboard.mood_card_title')}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              {todayLog
                ? language === 'ta'
                  ? 'இன்றைய பதிவு சேமிக்கப்பட்டுள்ளது ✓'
                  : "Today's check-in is saved ✓"
                : t('dashboard.mood_card_subtitle')}
            </p>
          </div>

          <div className="mt-2 flex items-center text-[10px] font-extrabold text-purple-600">
            <span>{language === 'ta' ? 'மனநிலையைப் பதிவு' : 'Log Mood'}</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </button>
      </div>

      {/* CARD 3: Daily Wellness Card */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50/80 to-rose-50/80 dark:from-purple-950/30 dark:to-rose-950/30 border border-purple-100/80 dark:border-slate-800 shadow-xs text-xs space-y-1 shrink-0">
        <div className="flex items-center space-x-1 font-bold text-slate-900 dark:text-slate-100 text-[11px]">
          <span>🌸</span>
          <span>{t('dashboard.daily_wellness_title')}</span>
        </div>
        <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-snug">
          {t('dashboard.wellness_tip_1')}
        </p>
        <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-snug">
          {t('dashboard.wellness_tip_2')}
        </p>
      </div>

      {/* Small Privacy Reassurance Badge */}
      <div className="pt-0.5 text-center shrink-0 pb-1">
        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
          {t('dashboard.privacy_badge')}
        </p>
      </div>

      {/* Daily Mood & Symptom Check-in Drawer */}
      <MoodSymptomDrawer
        isOpen={isCheckInOpen}
        initialDate={selectedDateForCheckIn}
        initialData={todayLog || null}
        onClose={() => setIsCheckInOpen(false)}
        onSave={async (logData) => {
          if (todayLog?.id) {
            await updateSymptomLog(todayLog.id, logData);
          } else {
            await addSymptomLog(logData);
          }
        }}
        onDelete={deleteSymptomLog}
      />
    </div>
  );
}
