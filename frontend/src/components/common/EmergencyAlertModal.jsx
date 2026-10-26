import React from 'react';
import { AlertTriangle, PhoneCall, ShieldAlert, X, HeartHandshake } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * EmergencyAlertModal
 * Screen 11: Urgent-Symptom Alert
 * Triggered whenever red flags like severe hemorrhage, fainting, acute pain, or pregnancy complications are detected.
 * Provides immediate 1-tap emergency dial buttons (108, 112, 1091) and clear medical advisory.
 */
export default function EmergencyAlertModal({
  isOpen,
  onClose,
  category = 'SEVERE_SYMPTOM',
  customMessage
}) {
  const { language, t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/70 backdrop-blur-xs animate-fadeIn select-none">
      <div className="bg-white rounded-[28px] max-w-md w-full shadow-2xl border-2 border-red-300 overflow-hidden flex flex-col">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-100">
                {language === 'ta' ? 'அவசர மருத்துவ எச்சரிக்கை' : 'Medical Safety Alert'}
              </span>
              <h3 className="text-base font-extrabold tracking-tight">
                {language === 'ta' ? 'உடனடி மருத்துவ உதவி தேவை' : 'Urgent Assessment Advised'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Advisory Message */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-950 leading-relaxed font-medium">
            {customMessage ||
              (language === 'ta'
                ? 'நீங்கள் குறிப்பிட்டுள்ள அறிகுறிகளுக்கு (கடுமையான ரத்தப்போக்கு, மயக்கம் அல்லது தீவிர வலி) உடனடி மருத்துவ பரிசோதனை அவசியமாகும். தயவுசெய்து உடனடியாக அருகிலுள்ள அவசர சிகிச்சைப் பிரிவுக்குச் செல்லவும் அல்லது அவசர உதவி எண்களை அழைக்கவும்.'
                : 'Your symptoms may indicate a condition requiring immediate clinical evaluation. If you feel faint, have severe unbearable pain, or are soaking multiple pads an hour, seek urgent medical care right away.')}
          </div>

          {/* Emergency Hotlines */}
          <div>
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-2">
              {language === 'ta' ? '24/7 இலவச அவசர உதவி எண்கள்:' : 'Immediate 24/7 Emergency Helplines:'}
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* 108 Ambulance */}
              <a
                href="tel:108"
                className="flex items-center justify-between p-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/25 transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-extrabold leading-tight">
                      {language === 'ta' ? 'மருத்துவ அவசர ஊர்தி (Ambulance)' : 'Medical Ambulance'}
                    </p>
                    <p className="text-[10px] text-red-100">{t('emergency.ambulance_sub')}</p>
                  </div>
                </div>
                <span className="text-base font-extrabold bg-white text-red-700 px-3 py-1 rounded-xl group-hover:scale-105 transition">
                  108
                </span>
              </a>

              {/* 112 All-in-one */}
              <a
                href="tel:112"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight">{t('emergency.national_helpline')}</p>
                    <p className="text-[10px] text-slate-400">{t('emergency.all_in_one')}</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold bg-white/10 text-white px-2.5 py-1 rounded-xl">
                  112
                </span>
              </a>

              {/* 1091 Women Helpline */}
              <a
                href="tel:1091"
                className="flex items-center justify-between p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200 transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-200 flex items-center justify-center text-purple-800">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold leading-tight">{t('emergency.women_helpline')}</p>
                    <p className="text-[10px] text-purple-600">{t('emergency.women_sub')}</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold bg-purple-600 text-white px-2.5 py-1 rounded-xl">
                  1091
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Disclaimer Note */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-500">
          {language === 'ta'
            ? 'இது பொதுவான நலவாழ்வு வழிகாட்டுதல் மட்டுமே; மருத்துவ ஆலோசனை அல்ல.'
            : 'This is general wellness guidance, not medical advice.'}
        </div>
      </div>
    </div>
  );
}
