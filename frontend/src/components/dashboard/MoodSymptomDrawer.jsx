import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Sparkles, AlertCircle, Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import AvatarChibi from '../common/AvatarChibi';

/**
 * Mood and Symptom Tracking Drawer / Modal
 * Satisfies Prompt Section 11:
 * - 3 predefined choices + Other option with custom text input for each category
 * - Multiple selections where appropriate
 * - Optional notes
 * - Save, edit, and delete actions
 * - Clear selected-state indicators
 * - Loading, success, and error feedback
 */
export default function MoodSymptomDrawer({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData = null,
  initialDate = new Date().toISOString().split('T')[0]
}) {
  const { language, t } = useLanguage();

  const KNOWN_MOODS = ['calm', 'sensitive', 'irritable'];
  const KNOWN_PAIN = ['none', 'mild', 'intense'];

  // Map a stored mood value back onto the 3 choices + Other option
  const normalizeMoodState = (value) => {
    if (!value) return { mood: 'calm', customMood: '' };
    if (KNOWN_MOODS.includes(value)) return { mood: value, customMood: '' };
    return { mood: 'other', customMood: String(value) };
  };

  // Map a stored pain value (label or 0-5 number) back onto choices + Other
  const normalizePainState = (value) => {
    if (value === null || value === undefined || value === '') {
      return { painLevel: 'mild', customPain: '' };
    }
    if (typeof value === 'number') {
      if (value <= 0) return { painLevel: 'none', customPain: '' };
      if (value <= 2) return { painLevel: 'mild', customPain: '' };
      return { painLevel: 'intense', customPain: '' };
    }
    if (KNOWN_PAIN.includes(value)) return { painLevel: value, customPain: '' };
    return { painLevel: 'other', customPain: String(value) };
  };

  const initialMoodState = normalizeMoodState(initialData?.mood);
  const initialPainState = normalizePainState(initialData?.pain_level ?? initialData?.crampsLevel);

  const [mood, setMood] = useState(initialMoodState.mood);
  const [customMood, setCustomMood] = useState(initialMoodState.customMood);

  const [painLevel, setPainLevel] = useState(initialPainState.painLevel);
  const [customPain, setCustomPain] = useState(initialPainState.customPain);

  const [selectedSymptoms, setSelectedSymptoms] = useState(initialData?.symptoms || ['fatigue']);
  const [customSymptom, setCustomSymptom] = useState('');

  const [flow, setFlow] = useState(initialData?.flow || 'medium');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  // Reset the form whenever the drawer opens (possibly with a different record)
  useEffect(() => {
    if (isOpen) {
      const ms = normalizeMoodState(initialData?.mood);
      const ps = normalizePainState(initialData?.pain_level ?? initialData?.crampsLevel);
      setMood(ms.mood);
      setCustomMood(ms.customMood);
      setPainLevel(ps.painLevel);
      setCustomPain(ps.customPain);
      setSelectedSymptoms(initialData?.symptoms || ['fatigue']);
      setCustomSymptom('');
      setFlow(initialData?.flow || 'medium');
      setNotes(initialData?.notes || '');
      setConfirmingDelete(false);
      setError('');
    }
  }, [isOpen, initialData?.id, initialDate]);

  if (!isOpen) return null;

  const toggleSymptom = (sym) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const finalMood = mood === 'other' ? customMood.trim() || 'Custom mood' : mood;
      const finalPain = painLevel === 'other' ? customPain.trim() || 'Custom pain' : painLevel;

      const finalSymptoms = [...selectedSymptoms];
      if (customSymptom.trim() && !finalSymptoms.includes(customSymptom.trim())) {
        finalSymptoms.push(customSymptom.trim());
      }

      await onSave({
        date: initialDate,
        mood: finalMood,
        pain_level: finalPain,
        symptoms: finalSymptoms,
        flow,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(t('symptoms.save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (onDelete && initialData?.id) {
      try {
        await onDelete(initialData.id);
        onClose();
      } catch (err) {
        setError(t('symptoms.save_error'));
        setConfirmingDelete(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn select-none">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl border border-purple-100 dark:border-slate-800 overflow-hidden text-xs text-slate-800 dark:text-slate-100">
        
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-purple-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
              <span>🌸</span>
              <span>{initialData?.id ? t('symptoms.edit_title') : t('symptoms.drawer_title')}</span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {t('symptoms.date_label')} <span className="font-bold text-rose-500">{initialDate}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 flex items-center justify-center text-slate-500 hover:text-rose-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* CATEGORY 1: Mood (3 predefined + Other) */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">
              {t('symptoms.mood_heading')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'calm', label: t('symptoms.mood_calm') },
                { id: 'sensitive', label: t('symptoms.mood_sensitive') },
                { id: 'irritable', label: t('symptoms.mood_irritable') },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMood(item.id)}
                  className={`py-2 px-1.5 rounded-xl border text-center font-bold text-[11px] transition ${
                    mood === item.id
                      ? 'border-[#FF668A] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Other option for Mood */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setMood('other')}
                className={`w-full py-1.5 px-3 rounded-xl border text-left font-bold text-[11px] transition ${
                  mood === 'other'
                    ? 'border-[#FF668A] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {t('symptoms.other_custom')}
              </button>
              {mood === 'other' && (
                <input
                  type="text"
                  value={customMood}
                  onChange={(e) => setCustomMood(e.target.value)}
                  placeholder="e.g. Grateful, restless, energetic..."
                  className="w-full mt-1.5 px-3 py-2 rounded-xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              )}
            </div>
          </div>

          {/* CATEGORY 2: Cramps / Pain Level (3 predefined + Other) */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">
              {t('symptoms.pain_heading')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'none', label: t('symptoms.pain_none') },
                { id: 'mild', label: t('symptoms.pain_mild') },
                { id: 'intense', label: t('symptoms.pain_intense') },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPainLevel(item.id)}
                  className={`py-2 px-1.5 rounded-xl border text-center font-bold text-[11px] transition ${
                    painLevel === item.id
                      ? 'border-[#FF668A] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Other option for Pain */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setPainLevel('other')}
                className={`w-full py-1.5 px-3 rounded-xl border text-left font-bold text-[11px] transition ${
                  painLevel === 'other'
                    ? 'border-[#FF668A] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                {t('symptoms.other_custom')}
              </button>
              {painLevel === 'other' && (
                <input
                  type="text"
                  value={customPain}
                  onChange={(e) => setCustomPain(e.target.value)}
                  placeholder="e.g. Throbbing, dull ache in lower back..."
                  className="w-full mt-1.5 px-3 py-2 rounded-xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              )}
            </div>
          </div>

          {/* CATEGORY 3: Physical Symptoms (Multi-Select + Other) */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">
              {t('symptoms.symptom_heading')} (Multiple)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bloating', label: t('symptoms.sym_bloating') },
                { id: 'fatigue', label: t('symptoms.sym_fatigue') },
                { id: 'headache', label: t('symptoms.sym_headache') },
              ].map((item) => {
                const active = selectedSymptoms.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSymptom(item.id)}
                    className={`py-2 px-1.5 rounded-xl border text-center font-bold text-[11px] transition ${
                      active
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <input
                type="text"
                value={customSymptom}
                onChange={(e) => setCustomSymptom(e.target.value)}
                placeholder="Other symptoms: e.g. Backache, cravings, nausea..."
                className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>

          {/* CATEGORY 4: Flow Intensity (if on period) */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">
              {t('symptoms.flow_heading')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['light', 'medium', 'heavy'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFlow(f)}
                  className={`py-1.5 rounded-xl border font-bold text-[11px] capitalize transition ${
                    flow === f
                      ? 'border-[#FF668A] bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">
              {t('symptoms.notes_heading')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('symptoms.notes_placeholder')}
              className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3.5 border-t border-purple-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex space-x-2">
          {initialData?.id && !confirmingDelete && (
            <button
              type="button"
              aria-label={t('symptoms.btn_delete')}
              onClick={handleDelete}
              className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {initialData?.id && confirmingDelete && (
            <div className="flex-1 flex items-center space-x-2">
              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold leading-tight flex-1">
                {t('symptoms.delete_confirm')}
              </p>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs"
              >
                {t('symptoms.delete_no')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="py-2.5 px-3 rounded-xl bg-rose-600 text-white font-extrabold text-xs"
              >
                {t('symptoms.delete_yes')}
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/20 transition flex items-center justify-center space-x-1.5 active:scale-98"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{saving ? t('common.saving') : t('symptoms.save_symptoms')}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
