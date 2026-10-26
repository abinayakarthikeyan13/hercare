import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCycle } from '../../context/CycleContext';
import { useAssistant } from '../../context/AssistantContext';
import {
  getLocalPreference,
  saveLocalPreference,
  buildLocalExportPayload,
  wipeLocalData,
  downloadJson
} from '../../lib/db';
import api from '../../lib/api';
import { AGREEMENT_VERSION } from '../../lib/agreement';
import HerCareAvatar from '../common/HerCareAvatar';
import {
  User,
  Sparkles,
  Globe,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Calendar,
  ShieldCheck,
  HardDrive,
  Cloud,
  CloudOff,
  Download,
  Trash2,
  LogOut,
  Check,
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';

export default function ProfileSettingsScreen() {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { cloudSyncEnabled, toggleCloudSync } = useCycle();
  const { registerAction } = useAssistant();
  const navigate = useNavigate();

  const [userName, setUserName] = useState('Gargi');
  const [assistantNickname, setAssistantNickname] = useState('HerCare AI');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);

  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [dataAction, setDataAction] = useState(null); // { type: 'export'|'delete', status, message }

  // Load preferences from IndexedDB on mount
  useEffect(() => {
    async function loadData() {
      const storedUser = await getLocalPreference('nickname', null);
      if (storedUser) setUserName(storedUser);

      const storedAssistant = await getLocalPreference('assistant_nickname', null);
      if (storedAssistant) setAssistantNickname(storedAssistant);

      const storedProf = await getLocalPreference('user_profile', null);
      if (storedProf) {
        if (storedProf.nickname) setUserName(storedProf.nickname);
        if (storedProf.assistant_nickname) setAssistantNickname(storedProf.assistant_nickname);
        if (storedProf.cycle_length) setCycleLength(storedProf.cycle_length);
        if (storedProf.period_length) setPeriodLength(storedProf.period_length);
      }
    }
    loadData();
  }, []);

  // Save changes to local and backend
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const updated = {
      nickname: userName.trim() || 'Friend',
      assistant_nickname: assistantNickname.trim() || 'HerCare AI',
      cycle_length: parseInt(cycleLength, 10),
      period_length: parseInt(periodLength, 10),
      voice_enabled: voiceEnabled,
    };

    await saveLocalPreference('nickname', updated.nickname);
    await saveLocalPreference('assistant_nickname', updated.assistant_nickname);
    await saveLocalPreference('user_profile', updated);

    if (isAuthenticated) {
      try {
        await api.post('/preferences', {
          nickname: updated.nickname,
          food_dislikes: [],
          exercise_pref: 'yoga',
          energy_level: 'medium',
        });
        await api.patch('/profile', {
          preferred_name: updated.nickname,
          preferred_language: language,
        });
      } catch (err) {
        console.warn('Backend profile update deferred:', err);
      }
    }

    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  // Export ALL permitted records: local IndexedDB + (when signed in) decrypted cloud copy
  const handleExportData = async () => {
    setExporting(true);
    setDataAction(null);
    try {
      // 1. Local device data (IndexedDB)
      const localPayload = await buildLocalExportPayload();

      // 2. Cloud copy from PostgreSQL (only when authenticated)
      let cloudPayload = null;
      let cloudError = null;
      if (isAuthenticated) {
        try {
          const res = await api.get('/privacy/export');
          cloudPayload = res.data;
        } catch (err) {
          cloudError = err?.response?.data?.detail || err?.message || 'unknown error';
          console.warn('Cloud export unavailable:', cloudError);
        }
      }

      const exportPayload = {
        app: 'HerCare',
        export_date: new Date().toISOString(),
        user_id: user?.id || 'local_user',
        phone_number: user?.phone_number || null,
        email: user?.email || null,
        preferred_name: userName,
        assistant_nickname: assistantNickname,
        language,
        cloud_sync_enabled: cloudSyncEnabled,
        contains: {
          local_device_data: true,
          cloud_data: Boolean(cloudPayload),
        },
        cloud_export_note: cloudPayload
          ? 'Cloud records decrypted server-side (AES-256-GCM) and included.'
          : cloudError
          ? `Cloud export failed: ${cloudError}`
          : 'Not signed in — export contains this device\u2019s IndexedDB records only.',
        local_device_data: localPayload,
        cloud_data: cloudPayload,
        security_audit: {
          encryption: 'AES-256-GCM (cloud) & IndexedDB (device)',
          integrity_hash: 'SHA-256 per record',
          storage_policy: 'Privacy-first local device isolation',
        },
      };

      downloadJson(
        exportPayload,
        `hercare_health_export_${new Date().toISOString().split('T')[0]}.json`
      );

      setDataAction({
        type: 'export',
        status: 'success',
        message: cloudPayload
          ? language === 'ta'
            ? 'ஏற்றுமதி வெற்றி: சாதனத் தகவல்கள் + மேகக்கணி நகல் இரண்டும் சேர்க்கப்பட்டன.'
            : 'Export complete: local device records plus your cloud copy were included.'
          : language === 'ta'
          ? 'ஏற்றுமதி வெற்றி: இந்த சாதனத்தின் தகவல்கள் மட்டும் சேர்க்கப்பட்டன.'
          : 'Export complete: records from this device were included.',
      });
      return true;
    } catch (err) {
      console.error('Export failed:', err);
      setDataAction({
        type: 'export',
        status: 'error',
        message:
          language === 'ta'
            ? 'ஏற்றுமதி தோல்வியடைந்தது. மீண்டும் முயற்சிக்கவும்.'
            : 'Export failed. Nothing was downloaded — please try again.',
      });
      return false;
    } finally {
      setExporting(false);
    }
  };

  // Permanent Delete: purge cloud FIRST, then local. Report truthfully.
  const handleDeleteMyData = async () => {
    setDeleting(true);
    setDataAction(null);

    // 1. Purge encrypted cloud records (authenticated sessions only)
    if (isAuthenticated) {
      try {
        await api.delete('/privacy/data');
      } catch (err) {
        const detail = err?.response?.data?.detail || err?.message || 'unknown error';
        console.error('Cloud purge failed:', detail);
        setDeleting(false);
        setShowDeleteConfirm(false);
        setDataAction({
          type: 'delete',
          status: 'error',
          message:
            language === 'ta'
              ? `மேகக்கணி தகவல்களை அழிக்க முடியவில்லை (${detail}). எதுவும் நீக்கப்படவில்லை; மீண்டும் முயற்சிக்கவும்.`
              : `Cloud records could not be deleted (${detail}). Nothing was removed — please try again.`,
        });
        return;
      }
    }

    // 2. Wipe local IndexedDB (correct Dexie table names)
    try {
      await wipeLocalData();
    } catch (err) {
      console.error('Local wipe failed:', err);
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDataAction({
        type: 'delete',
        status: 'error',
        message:
          language === 'ta'
            ? 'இந்த சாதனத்தின் தகவல்களை அழிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
            : 'Local device records could not be deleted. Please try again.',
      });
      return;
    }

    // 3. Clear session storage and sign out (only after both steps succeeded)
    localStorage.clear();
    sessionStorage.clear();
    await logout();
    window.location.href = '/login';
  };

  // --- Assistant action registry -----------------------------------------
  // Export runs this screen's exact validated flow and reports real success.
  // Delete NEVER runs directly: it only opens this screen's own confirmation
  // dialog, so the app's explicit-delete gate is always the final word.
  const handlersRef = useRef({});
  useEffect(() => {
    handlersRef.current.handleExportData = handleExportData;
  });

  useEffect(() => {
    const unsubs = [
      registerAction({
        id: 'export_data',
        label: t('assistant.export_data_label'),
        needsConfirm: true,
        run: async () => {
          const ok = await handlersRef.current.handleExportData();
          return ok === false ? { ok: false } : { ok: true };
        },
      }),
      registerAction({
        id: 'delete_data',
        label: t('assistant.delete_data_label'),
        needsConfirm: true,
        run: () => {
          setShowDeleteConfirm(true);
          return { ok: true, message: t('assistant.confirm_opened') };
        },
      }),
      registerAction({
        id: 'sign_out',
        label: t('assistant.sign_out_label'),
        needsConfirm: true,
        run: async () => {
          await logout();
          return { ok: true, message: t('assistant.signed_out') };
        },
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [registerAction, t, logout]);

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto px-4 py-3 select-none text-slate-800 dark:text-slate-100">
      
      {/* Header Profile Identity */}
      <div className="flex items-center space-x-3.5 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800 shadow-sm shrink-0 mb-3">
        <HerCareAvatar size={54} state="idle" expression="happy" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold truncate text-slate-900 dark:text-slate-100">
              {userName || 'Friend'}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {user?.email || user?.phone_number || 'Local Session'}
            </span>
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-0.5">
            Companion: {assistantNickname}
          </p>
        </div>
      </div>

      {savedFeedback && (
        <div className="p-2.5 mb-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center space-x-1.5 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>{t('common.profile_saved')}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-3 pb-6">
        
        {/* SECTION 1: Identity & Companion */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-purple-100 dark:border-slate-800 shadow-xs space-y-3 text-xs">
          <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider text-purple-900 dark:text-purple-300 flex items-center space-x-1.5">
            <User className="w-3.5 h-3.5 text-purple-600" />
            <span>{t('profile.title')}</span>
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                {t('profile.user_name')}
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                {t('profile.assistant_nickname')}
              </label>
              <input
                type="text"
                value={assistantNickname}
                onChange={(e) => setAssistantNickname(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Language & Display Theme */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-purple-100 dark:border-slate-800 shadow-xs space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-purple-600" />
              <span className="font-bold">{t('profile.language_label')}</span>
            </div>
            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-purple-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  language === 'en'
                    ? 'bg-[#FF668A] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                  language === 'ta'
                    ? 'bg-[#FF668A] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-purple-50 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span className="font-bold">{t('profile.theme_label')}</span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-purple-100 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 transition"
            >
              {isDark ? t('profile.theme_dark') : t('profile.theme_light')}
            </button>
          </div>
        </div>

        {/* SECTION 3: Cycle Preferences */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-purple-100 dark:border-slate-800 shadow-xs space-y-3 text-xs">
          <div className="flex items-center space-x-1.5 text-purple-900 dark:text-purple-300 font-extrabold uppercase tracking-wider text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-rose-500" />
            <span>{t('profile.cycle_heading')}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                {t('profile.cycle_length_lbl')}: {cycleLength}d
              </span>
              <input
                type="range"
                min="21"
                max="38"
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                className="w-full accent-[#FF668A]"
              />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                {t('profile.period_length_lbl')}: {periodLength}d
              </span>
              <input
                type="range"
                min="3"
                max="8"
                value={periodLength}
                onChange={(e) => setPeriodLength(e.target.value)}
                className="w-full accent-[#FF668A]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: CIA & Privacy Review */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-purple-100 dark:border-slate-800 shadow-xs space-y-2.5 text-xs">
          <div className="flex items-center space-x-1.5 text-purple-900 dark:text-purple-300 font-extrabold uppercase tracking-wider text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('profile.storage_heading')}</span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('profile.storage_explanation')}
          </p>

          <button
            type="button"
            onClick={() => setShowAgreementModal(true)}
            className="w-full py-2 px-3 rounded-xl border border-purple-200 dark:border-slate-700 bg-purple-50/50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center space-x-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('profile.agreement_btn')}</span>
          </button>
        </div>

        {/* SECTION 5: Cloud Sync Toggle (OFF by default) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-purple-100 dark:border-slate-800 shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {cloudSyncEnabled ? (
                <Cloud className="w-4 h-4 text-rose-500" />
              ) : (
                <CloudOff className="w-4 h-4 text-slate-400" />
              )}
              <span className="font-bold text-xs">{t('profile.cloud_sync_lbl')}</span>
            </div>

            <button
              type="button"
              onClick={() => toggleCloudSync(!cloudSyncEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                cloudSyncEnabled ? 'bg-[#FF668A]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  cloudSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <p className="text-[10px] text-slate-400 leading-snug">
            {cloudSyncEnabled
              ? t('profile.cloud_sync_status_on')
              : t('profile.cloud_sync_desc')}
          </p>
        </div>

        {/* Save Preferences Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/25 transition active:scale-98"
        >
          {t('common.save_profile')}
        </button>

        {/* Export / Delete result feedback (only shown after a real result) */}
        {dataAction && (
          <div
            className={`mt-2 p-2.5 rounded-2xl border text-[11px] font-bold flex items-start space-x-1.5 ${
              dataAction.status === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300'
            }`}
            role="status"
          >
            {dataAction.status === 'success' ? (
              <Check className="w-3.5 h-3.5 shrink-0 mt-px" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            )}
            <span className="flex-1">{dataAction.message}</span>
            <button
              type="button"
              onClick={() => setDataAction(null)}
              className="p-0.5 rounded hover:bg-black/5"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* SECTION 6: Data Portability (Export & Delete) */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportData}
            className="p-3 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 font-bold text-xs text-purple-700 dark:text-purple-300 flex items-center justify-center space-x-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Exporting...' : t('profile.export_btn')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center justify-center space-x-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('profile.delete_btn')}</span>
          </button>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={logout}
          className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center justify-center space-x-2"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('profile.sign_out_btn')}</span>
        </button>
      </form>

      {/* CIA Privacy Agreement Review Modal */}
      {showAgreementModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col p-5 shadow-2xl border border-purple-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-purple-50 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t('agreement.title')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAgreementModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              {/* Consent record (status + timestamp from the device record) */}
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-[10px] text-emerald-800 dark:text-emerald-300">
                <span className="font-bold">{t('agreement.consent_version')} {AGREEMENT_VERSION}</span>
                {' — '}
                {localStorage.getItem('hercare_agreement_timestamp')
                  ? `${t('agreement.consent_recorded')} ${new Date(localStorage.getItem('hercare_agreement_timestamp')).toLocaleString()}`
                  : t('agreement.consent_not_recorded')}
              </div>
              <div>
                <span className="font-extrabold text-rose-600 dark:text-rose-400 block">{t('agreement.purpose_title')}</span>
                <p className="mt-0.5 text-[11px]">{t('agreement.purpose_desc')}</p>
              </div>
              <div>
                <span className="font-extrabold text-purple-700 dark:text-purple-400 block">{t('agreement.confidentiality_title')}</span>
                <p className="mt-0.5 text-[11px]">{t('agreement.confidentiality_desc')}</p>
              </div>
              <div>
                <span className="font-extrabold text-rose-600 dark:text-rose-400 block">{t('agreement.integrity_title')}</span>
                <p className="mt-0.5 text-[11px]">{t('agreement.integrity_desc')}</p>
              </div>
              <div>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block">{t('agreement.availability_title')}</span>
                <p className="mt-0.5 text-[11px]">{t('agreement.availability_desc')}</p>
              </div>
              <div>
                <span className="font-extrabold text-sky-600 dark:text-sky-400 block">{t('agreement.ai_voice_title')}</span>
                <p className="mt-0.5 text-[11px]">{t('agreement.ai_voice_desc')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px]">
                <span className="font-bold">{t('agreement.disclaimer_title')} </span>
                <span>{t('agreement.disclaimer_desc')}</span>
              </div>
            </div>

            {/* Read-only full Terms page (view mode) */}
            <button
              type="button"
              onClick={() => {
                setShowAgreementModal(false);
                navigate('/privacy-agreement?view=1');
              }}
              className="w-full py-2.5 rounded-xl border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center space-x-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('agreement.btn_view_full')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAgreementModal(false)}
              className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete My Data Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 dark:border-rose-900/60 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
              {t('profile.delete_btn')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('profile.delete_confirm')}
            </p>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteMyData}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/30"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
