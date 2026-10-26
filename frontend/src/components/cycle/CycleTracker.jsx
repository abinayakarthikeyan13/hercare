import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCycle } from '../../context/CycleContext';
import {
  Calendar,
  Heart,
  Droplet,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  PlusCircle
} from 'lucide-react';

export default function CycleTracker() {
  const { t, language } = useLanguage();
  const { cycles, addCycle, cloudSyncEnabled, getCurrentPhase } = useCycle();
  const currentPhaseInfo = getCurrentPhase();

  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [flow, setFlow] = useState('medium');
  const [crampsLevel, setCrampsLevel] = useState(2);
  const [mood, setMood] = useState('calm');
  const [selectedSymptoms, setSelectedSymptoms] = useState(['cramps']);
  const [notes, setNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const symptomOptions = [
    { id: 'cramps', labelEn: 'Cramps', labelTa: 'வயிற்று வலி' },
    { id: 'fatigue', labelEn: 'Fatigue', labelTa: 'சோர்வு' },
    { id: 'headache', labelEn: 'Headache', labelTa: 'தலைவலி' },
    { id: 'bloating', labelEn: 'Bloating', labelTa: 'வயிறு உப்புசம்' },
    { id: 'back_pain', labelEn: 'Back Pain', labelTa: 'முதுகு வலி' },
    { id: 'acne', labelEn: 'Skin Breakouts', labelTa: 'முகப்பரு' },
  ];

  const toggleSymptom = (id) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSaveCycle = async (e) => {
    e.preventDefault();
    await addCycle({
      startDate,
      endDate: endDate || null,
      cycleLength: parseInt(cycleLength, 10),
      periodLength: parseInt(periodLength, 10),
      flow,
      mood,
      symptoms: selectedSymptoms,
      notes,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Phase Card */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-rose-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold uppercase tracking-wider inline-block mb-2">
              {currentPhaseInfo.hasRecords ? t(`cycle.phases.${currentPhaseInfo.phase}`) : (language === 'ta' ? 'பதிவு இல்லை' : 'No records yet')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {currentPhaseInfo.hasRecords
                ? (language === 'ta' ? `சுழற்சி நாள் ${currentPhaseInfo.dayOfCycle}` : `Cycle Day ${currentPhaseInfo.dayOfCycle}`)
                : (language === 'ta' ? 'மாதவிடாய் தேதியைப் பதிவு செய்யவும்' : 'Log a period to see your cycle day')}
            </h2>
            <p className="mt-1 text-sm text-rose-100">
              {currentPhaseInfo.hasRecords
                ? (language === 'ta'
                    ? `அடுத்த மாதவிடாய்க்கு இன்னும் ${currentPhaseInfo.daysToNext} நாட்கள் (மதிப்பீடு)`
                    : `Approximately ${currentPhaseInfo.daysToNext} days until your next period (estimate)`) 
                : (language === 'ta'
                    ? 'உங்கள் முதல் பதிவைச் சேமித்த பிறகு சுழற்சி நாள் கணக்கிடப்படும்.'
                    : 'Your cycle day will appear once you save your first period record.')}
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/20 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <div className="font-bold">
                {cloudSyncEnabled ? 'AES-256 Cloud Synced' : '100% Offline IndexedDB'}
              </div>
              <div className="text-[10px] text-white/80">
                {cloudSyncEnabled ? 'Backed up to PostgreSQL' : 'Stored locally in browser'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Logging Form (Offline First) */}
      <div className="bg-white border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{t('cycle.title')}</h3>
              <p className="text-xs text-slate-500">{t('cycle.subtitle')}</p>
            </div>
          </div>

          {savedSuccess && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 animate-pulse">
              <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> {t('common.saved_locally')}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveCycle} className="space-y-6">
          {/* Dates & Cycle Length */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t('cycle.start_date')}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {t('cycle.end_date')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {language === 'ta' ? 'சுழற்சி நீளம் (நாட்கள்)' : 'Cycle Length (Days)'}
              </label>
              <input
                type="number"
                min="20"
                max="45"
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {language === 'ta' ? 'ரத்தப்போக்கு நாட்கள்' : 'Period Duration'}
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={periodLength}
                onChange={(e) => setPeriodLength(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 text-sm"
              />
            </div>
          </div>

          {/* Flow Level Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {t('cycle.flow')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['spotting', 'light', 'medium', 'heavy'].map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFlow(f)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    flow === f
                      ? 'border-rose-500 bg-rose-500 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Droplet className={`w-3.5 h-3.5 inline mr-1 ${flow === f ? 'text-white' : 'text-rose-500'}`} />
                  {t(`cycle.flow_options.${f}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Cramps Pain Slider (0-5) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                {t('cycle.cramps_level')}
              </label>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                {crampsLevel} / 5
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={crampsLevel}
              onChange={(e) => setCrampsLevel(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Symptoms Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              {language === 'ta' ? 'அறிகுறிகள்' : 'Symptoms Experienced'}
            </label>
            <div className="flex flex-wrap gap-2">
              {symptomOptions.map((sym) => {
                const isSelected = selectedSymptoms.includes(sym.id);
                return (
                  <button
                    type="button"
                    key={sym.id}
                    onClick={() => toggleSymptom(sym.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'ta' ? sym.labelTa : sym.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Private Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {t('cycle.notes')}
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'ta' ? 'உங்கள் தனிப்பட்ட குறிப்புகளை இங்கு எழுதவும்...' : 'Private personal health notes...'}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 text-sm"
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md shadow-rose-500/20 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 transition"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            <span>{t('cycle.save_entry')}</span>
          </button>
        </form>
      </div>

      {/* Local IndexedDB History List */}
      <div className="bg-white border border-rose-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-rose-500" />
          <span>{t('cycle.recent_history')}</span>
        </h3>

        {cycles.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-4 text-center">
            {t('cycle.no_cycles_yet')}
          </p>
        ) : (
          <div className="space-y-3">
            {cycles.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {c.startDate} {c.endDate ? `→ ${c.endDate}` : ''}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {c.cycleLength} days cycle • Flow: <span className="font-semibold">{c.flow}</span>
                    {c.symptoms && c.symptoms.length > 0 && ` • Symptoms: ${c.symptoms.join(', ')}`}
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[11px]">
                  <span
                    className={`px-2.5 py-1 rounded-full font-medium ${
                      c.syncStatus === 'synced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {c.syncStatus === 'synced' ? 'Cloud Encrypted' : 'Local IndexedDB'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
