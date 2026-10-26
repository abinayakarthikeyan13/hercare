import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasValidAgreement } from '../lib/agreement';
import { useLanguage } from '../context/LanguageContext';
import AvatarChibi from '../components/common/AvatarChibi';
import {
  Mail,
  Smartphone,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Globe2,
  Heart
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sendOtp, loginWithPassword, registerWithPassword } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Mode: 'email' | 'phone_otp'
  const [authMode, setAuthMode] = useState('email');
  // Sub-mode for email: 'signin' | 'register'
  const [isRegister, setIsRegister] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [preferredName, setPreferredName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Handle post-auth navigation based on user progress in required sequence:
  // 1. Login -> 2. Privacy Agreement -> 3. Language -> 4. Onboarding -> 5. Recap -> 6. Dashboard
  const handlePostAuthRouting = (userData) => {
    const agreementAccepted = hasValidAgreement(userData);

    const onboardingCompleted =
      userData?.onboarding_completed ||
      localStorage.getItem('hercare_onboarding_completed') === 'true';

    if (!agreementAccepted) {
      navigate('/privacy-agreement');
    } else if (!onboardingCompleted) {
      navigate('/language-select');
    } else {
      navigate('/dashboard');
    }
  };

  // Submit Email & Password (Login or Register)
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email.trim() || !password) {
      setError(t('auth.err_missing_fields'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.err_pwd_short'));
      return;
    }

    setLoading(true);

    try {
      let res;
      if (isRegister) {
        res = await registerWithPassword({
          email: email.trim().toLowerCase(),
          password,
          preferred_name: preferredName.trim() || null,
        });
      } else {
        res = await loginWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
      }

      handlePostAuthRouting(res.user);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Submit Phone OTP request
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!phone.trim()) {
      setError(language === 'ta' ? 'தயவுசெய்து உங்கள் கைபேசி எண்ணை உள்ளிடவும்.' : 'Please enter your mobile number.');
      return;
    }

    setLoading(true);

    try {
      const res = await sendOtp(phone.trim());
      setInfoMessage(t('auth.otp_sent_msg'));
      navigate('/verify-otp');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to request OTP. Please verify phone number format.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Judge Demo Quick-Fill
  const fillJudgeDemoEmail = () => {
    setEmail('judge@hercare.app');
    setPassword('HerCare@2026');
    setPreferredName('Gargi');
    setError('');
  };

  const fillJudgeDemoPhone = () => {
    setPhone('+919876543210');
    setError('');
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-5 overflow-hidden bg-[#FAF7FD] dark:bg-slate-950 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] max-w-md w-full h-[96dvh] max-h-[820px] shadow-2xl border border-purple-100 dark:border-slate-800 flex flex-col justify-between p-5 sm:p-7 relative overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Soft decorative background blurs */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-rose-100/60 dark:bg-rose-950/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-purple-100/60 dark:bg-purple-950/20 blur-2xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#FF668A] to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-300/40">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {t('app_name')}
              </h1>
              <span className="text-[9px] font-bold text-[#FF668A]">{t('common.step_signin')}</span>
            </div>
          </div>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'ta' ? 'en' : 'ta')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 transition"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{language === 'ta' ? 'EN' : 'தமிழ்'}</span>
          </button>
        </div>

        {/* Brand Banner with Companion Greeting */}
        <div className="text-center my-auto shrink-0 z-10 py-1">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-pink-100 to-purple-100 dark:from-pink-950 dark:to-purple-950 flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-md mb-2">
            <AvatarChibi expression="happy" size={54} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('auth.welcome_back')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs mx-auto">
            {t('auth.sign_in_desc')}
          </p>
        </div>

        {/* Authentication Mode Tabs: Email & Password vs Phone & Demo OTP */}
        <div className="z-10 shrink-0 mb-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex border border-purple-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setError('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                authMode === 'email'
                  ? 'bg-white dark:bg-slate-900 text-[#FF668A] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t('auth.tab_email')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('phone_otp');
                setError('');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                authMode === 'phone_otp'
                  ? 'bg-white dark:bg-slate-900 text-[#FF668A] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{t('auth.tab_otp')}</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="z-10 flex-1 overflow-y-auto px-1 py-1">
          {authMode === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {isRegister && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    {t('auth.name_optional')}
                  </label>
                  <input
                    type="text"
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    placeholder="e.g. Gargi"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  {t('auth.email_label')}
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-purple-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email_placeholder')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  {t('auth.password_label')}
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-purple-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.password_placeholder')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                </div>
              </div>

              {/* Demo quick fill button */}
              <button
                type="button"
                onClick={fillJudgeDemoEmail}
                className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200/60"
              >
                <Sparkles className="w-3 h-3" />
                <span>{t('common.demo_fill_email')}</span>
              </button>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-700 dark:text-red-300 flex items-start space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/25 transition flex items-center justify-center space-x-2 active:scale-98"
              >
                <span>{loading ? t('common.authenticating') : isRegister ? t('auth.btn_register') : t('auth.btn_login')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError('');
                  }}
                  className="text-xs font-bold text-purple-700 dark:text-purple-300 hover:underline"
                >
                  {isRegister ? t('auth.toggle_existing_user') : t('auth.toggle_new_user')}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRequestOtp} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  {t('auth.phone_label')}
                </label>
                <div className="relative flex items-center">
                  <Smartphone className="w-4 h-4 text-purple-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('auth.phone_placeholder')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                </div>
              </div>

              {/* Demo quick fill button */}
              <button
                type="button"
                onClick={fillJudgeDemoPhone}
                className="inline-flex items-center space-x-1.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200/60"
              >
                <Sparkles className="w-3 h-3" />
                <span>{t('common.demo_fill_phone')}</span>
              </button>

              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 text-[10px] text-amber-800 dark:text-amber-200">
                <span className="font-bold">{language === 'ta' ? 'டெவலப்மெண்ட் முறை: ' : 'Development Mode: '}</span>
                <span>{t('common.dev_mode_note')}</span>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-700 dark:text-red-300 flex items-start space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl text-xs font-extrabold text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/25 transition flex items-center justify-center space-x-2 active:scale-98"
              >
                <span>{loading ? 'Requesting...' : t('auth.btn_send_otp')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Bottom Security Note */}
        <div className="shrink-0 pt-2 text-center border-t border-purple-50 dark:border-slate-800 z-10">
          <p className="text-[10px] text-slate-400">
            {t('medical_disclaimer')}
          </p>
        </div>

      </div>
    </div>
  );
}
