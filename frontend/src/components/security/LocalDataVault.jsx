import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCycle } from '../../context/CycleContext';
import { exportLocalData, wipeLocalData } from '../../lib/db';
import {
  ShieldCheck,
  Download,
  Trash2,
  Cloud,
  CloudOff,
  CheckCircle2,
  HardDrive,
  AlertTriangle,
  Lock
} from 'lucide-react';

export default function LocalDataVault() {
  const { t } = useLanguage();
  const { cloudSyncEnabled, toggleCloudSync, cycles, refreshCycles } = useCycle();

  const [exporting, setExporting] = useState(false);
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportLocalData();
      setAlertMsg({ type: 'success', text: 'Local health data exported successfully as JSON!' });
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'Failed to export local data.' });
    } finally {
      setExporting(false);
      setTimeout(() => setAlertMsg(null), 4000);
    }
  };

  const handleWipe = async () => {
    await wipeLocalData();
    await refreshCycles();
    setShowConfirmWipe(false);
    setAlertMsg({ type: 'success', text: 'All local IndexedDB data permanently wiped.' });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Alert Banner */}
      {alertMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center space-x-2 ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{alertMsg.text}</span>
        </div>
      )}

      {/* CIA Architecture Card */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex items-center space-x-3 mb-3">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">{t('privacy.title')}</h2>
            <p className="text-xs text-purple-200">{t('privacy.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-xs">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
            <div className="font-bold text-sm text-pink-300 mb-1">Confidentiality</div>
            <p className="text-white/80 leading-relaxed">
              {t('security.aes_desc')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
            <div className="font-bold text-sm text-purple-300 mb-1">Integrity</div>
            <p className="text-white/80 leading-relaxed">
              {t('security.sha_desc')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
            <div className="font-bold text-sm text-emerald-300 mb-1">Availability</div>
            <p className="text-white/80 leading-relaxed">
              {t('security.offline_desc')}
            </p>
          </div>
        </div>
      </div>

      {/* Storage & Consent Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Storage Card */}
        <div className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <HardDrive className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-slate-900">{t('privacy.local_storage_title')}</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">{t('privacy.local_storage_desc')}</p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1 mb-4">
              <div className="flex justify-between">
                <span>{t('common.db_engine')}</span>
                <strong className="font-mono">Dexie.js (IndexedDB)</strong>
              </div>
              <div className="flex justify-between">
                <span>{t('common.local_records')}</span>
                <strong>{cycles.length} {t('common.saved_entries')}</strong>
              </div>
              <div className="flex justify-between">
                <span>{t('common.offline_capability')}</span>
                <strong className="text-emerald-600">{t('common.functional_100')}</strong>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('privacy.export_data')}</span>
            </button>

            <button
              onClick={() => setShowConfirmWipe(true)}
              className="inline-flex items-center justify-center space-x-1 py-2.5 px-3 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('privacy.wipe_data')}</span>
            </button>
          </div>
        </div>

        {/* Cloud Sync Consent Card */}
        <div className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2.5">
                {cloudSyncEnabled ? (
                  <Cloud className="w-5 h-5 text-purple-600" />
                ) : (
                  <CloudOff className="w-5 h-5 text-slate-400" />
                )}
                <h3 className="font-bold text-slate-900">{t('privacy.cloud_sync_title')}</h3>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => toggleCloudSync(!cloudSyncEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  cloudSyncEnabled ? 'bg-purple-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    cloudSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">{t('privacy.cloud_sync_desc')}</p>

            <div
              className={`p-3 rounded-2xl border text-xs space-y-1 mb-4 ${
                cloudSyncEnabled
                  ? 'bg-purple-50 text-purple-900 border-purple-200'
                  : 'bg-slate-50 text-slate-700 border-slate-100'
              }`}
            >
              <div className="font-semibold">
                {cloudSyncEnabled ? t('privacy.sync_on') : t('privacy.sync_off')}
              </div>
              <p className="text-[11px] opacity-80">
                {cloudSyncEnabled
                  ? t('security.consent_on')
                  : t('security.consent_off')}
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('common.master_key_note')}</span>
          </div>
        </div>
      </div>

      {/* Wipe Confirmation Modal */}
      {showConfirmWipe && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">{t('common.confirm_wipe_title')}</h4>
              <p className="text-xs text-slate-600 mt-1">{t('privacy.confirm_wipe')}</p>
            </div>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmWipe(false)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                {t('security.cancel')}
              </button>
              <button
                type="button"
                onClick={handleWipe}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition"
              >
                {t('security.delete_data')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
