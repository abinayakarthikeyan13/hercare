import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { saveLocalPreference } from '../lib/db';
import { AGREEMENT_VERSION, hasValidAgreement } from '../lib/agreement';
import api from '../lib/api';
import AvatarChibi from '../components/common/AvatarChibi';

// Re-exported for backwards compatibility with earlier imports.
export { AGREEMENT_VERSION };

import {
  ShieldCheck,
  Lock,
  HardDrive,
  Database,
  Download,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Globe2,
  Sparkles,
  HeartPulse,
  Bot,
} from 'lucide-react';

/** Formats an ISO timestamp for display; falls back gracefully. */
function formatConsentDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PrivacyAgreementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();

  // View mode: read-only review launched from Settings ("View Terms & Conditions").
  const isViewMode = searchParams.get('view') === '1';

  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Existing consent record for display in view mode (never auto-accepted).
  const [consentAt] = useState(() => localStorage.getItem('hercare_agreement_timestamp'));

  const handleContinue = async () => {
    if (!agreed) return;
    setSubmitting(true);
    setError('');

    try {
      // 1. Save locally — consent status, version, and timestamp
      const consentedAt = new Date().toISOString();
      await saveLocalPreference('privacy_agreement_accepted', true);
      await saveLocalPreference('privacy_agreement_version', AGREEMENT_VERSION);
      await saveLocalPreference('privacy_agreement_timestamp', consentedAt);
      localStorage.setItem('hercare_agreement_accepted', 'true');
      localStorage.setItem('hercare_agreement_version', AGREEMENT_VERSION);
      localStorage.setItem('hercare_agreement_timestamp', consentedAt);

      // 2. Push to backend if authenticated (the server also stamps its own
      //    UTC acceptance date on the account record)
      try {
        await api.post('/auth/privacy-agreement', { accepted: true, version: AGREEMENT_VERSION });
      } catch (err) {
        console.warn('Backend agreement sync deferred:', err);
      }

      // Move to Step 3: Language Selection
      navigate('/language-select');
    } catch (e) {
      setError(language === 'ta' ? 'பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.' : 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-5 overflow-hidden bg-[#FAF7FD] dark:bg-slate-950 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] max-w-md w-full h-[96dvh] max-h-[820px] shadow-2xl border border-purple-100 dark:border-slate-800 flex flex-col overflow-hidden relative">
        
        {/* Top Header Bar */}
        <div className="p-4 border-b border-purple-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {t('agreement.title')}
              </h1>
              <p className="text-[10px] text-[#FF668A] font-bold">
                {isViewMode
                  ? (language === 'ta' ? `பதிப்பு ${AGREEMENT_VERSION}` : `Version ${AGREEMENT_VERSION}`)
                  : (language === 'ta' ? 'படி 2/5 • விதிமுறைகள், தனியுரிமை & ஒப்பந்தம்' : 'Step 2 of 5 • Terms, Privacy & Consent')}
              </p>
            </div>
          </div>

          {/* Quick Language Toggle Pill */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'ta' ? 'en' : 'ta')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 transition"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{language === 'ta' ? 'English' : 'தமிழ்'}</span>
          </button>
        </div>

        {/* Scrollable Terms Content Region */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          
          <div className="bg-rose-50/70 dark:bg-rose-950/30 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/40 text-center">
            <div className="inline-block p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm mb-1.5">
              <AvatarChibi expression="happy" size={32} />
            </div>
            <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
              {t('agreement.subtitle')}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'ta'
                ? 'உங்கள் ஆரோக்கியத் தகவல்கள் உங்கள் கட்டுப்பாட்டிலேயே இருக்கின்றன.'
                : 'Empowering you with complete privacy, zero ad-tracking, and full transparency.'}
            </p>
          </div>

          {/* A. Purpose of HerCare */}
          <div className="space-y-2.5">
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center space-x-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
              <span>{t('agreement.purpose_title')}</span>
            </h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              {t('agreement.purpose_desc')}
            </p>
          </div>

          {/* B. Medical Disclaimer */}
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{t('agreement.disclaimer_title')} </span>
              <span>{t('agreement.disclaimer_desc')}</span>
            </div>
          </div>

          {/* C. Privacy and Data Control */}
          <div className="space-y-2.5">
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-rose-500" />
              <span>{t('agreement.privacy_title')}</span>
            </h2>

            <div className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-[11px] space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {t('agreement.storage_location_title')}
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {t('agreement.storage_location_desc')}
              </p>
              <div className="font-bold text-slate-800 dark:text-slate-200 pt-1">
                {t('agreement.storage_limits_title')}
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {t('agreement.storage_limits_desc')}
              </p>
              <div className="font-bold text-slate-800 dark:text-slate-200 pt-1">
                {t('agreement.cloud_sync_title')}
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {t('agreement.cloud_sync_desc')}
              </p>
            </div>

            {/* External AI Processing Disclosure */}
            <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-900/50 text-[11px] space-y-1">
              <div className="font-extrabold text-sky-800 dark:text-sky-300 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('agreement.ai_processing_title')}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                {t('agreement.ai_processing_desc')}
              </p>
            </div>

            {/* Rights to Export and Deletion */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col">
                <div className="flex items-center space-x-1 text-purple-700 dark:text-purple-400 font-bold mb-1">
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('common.export_json')}</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t('agreement.export_desc')}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col">
                <div className="flex items-center space-x-1 text-rose-600 dark:text-rose-400 font-bold mb-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('common.delete_all')}</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t('agreement.delete_desc')}
                </span>
              </div>
            </div>
          </div>

          {/* D. CIA Triad Section */}
          <div className="space-y-2.5">
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>{language === 'ta' ? 'CIA பாதுகாப்புத் தூண்கள்' : 'Core CIA Security Principles'}</span>
            </h2>

            {/* C */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="font-extrabold text-purple-700 dark:text-purple-400 flex items-center space-x-1">
                <span>🔐</span>
                <span>{t('agreement.confidentiality_title')}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                {t('agreement.confidentiality_desc')}
              </p>
            </div>

            {/* I */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="font-extrabold text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                <span>🛡️</span>
                <span>{t('agreement.integrity_title')}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                {t('agreement.integrity_desc')}
              </p>
            </div>

            {/* A */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
              <div className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                <span>⚡</span>
                <span>{t('agreement.availability_title')}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                {t('agreement.availability_desc')}
              </p>
            </div>
          </div>

          {/* E. AI and Voice Features */}
          <div className="space-y-2.5">
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center space-x-1.5">
              <Bot className="w-3.5 h-3.5 text-sky-600" />
              <span>{t('agreement.ai_voice_title')}</span>
            </h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              {t('agreement.ai_voice_desc')}
            </p>
          </div>

          {/* Consent record (view mode only) */}
          {isViewMode && (
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 text-[11px]">
              <div className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center space-x-1 mb-1">
                <Database className="w-3.5 h-3.5" />
                <span>{t('agreement.consent_version')} {AGREEMENT_VERSION}</span>
              </div>
              {consentAt ? (
                <p className="text-emerald-700 dark:text-emerald-300">
                  {t('agreement.consent_recorded')} {formatConsentDate(consentAt)}
                </p>
              ) : (
                <p className="text-slate-500 dark:text-slate-400">
                  {t('agreement.consent_not_recorded')}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 font-bold text-center">{error}</p>
          )}
        </div>

        {/* Fixed Bottom Action Surface */}
        <div className="p-4 pb-5 border-t border-purple-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-3 z-10">
          {isViewMode ? (
            /* View mode: read-only — just return to Settings */
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 transition shadow-md bg-purple-600 text-white shadow-purple-500/25 hover:bg-purple-700 active:scale-98"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('agreement.btn_back_settings')}</span>
            </button>
          ) : (
            <>
              {/* Required Agreement Checkbox (never pre-checked) */}
              <label className="flex items-start space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="privacyAgreementCheckbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-purple-300 text-rose-500 focus:ring-rose-400 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  {t('agreement.checkbox_label')}
                </span>
              </label>

              {/* I Agree & Continue — disabled until the box is checked */}
              <button
                type="button"
                disabled={!agreed || submitting}
                onClick={handleContinue}
                className={`w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 transition shadow-md ${
                  agreed && !submitting
                    ? 'bg-gradient-to-r from-[#FF668A] to-pink-600 text-white shadow-rose-500/25 hover:from-rose-600 hover:to-pink-700 active:scale-98'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
              >
                <span>{submitting ? t('common.saving') : t('agreement.btn_continue')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
