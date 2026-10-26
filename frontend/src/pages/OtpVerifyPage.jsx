import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalPreference } from '../lib/db';
import { hasValidAgreement } from '../lib/agreement';
import { Heart, KeyRound, ArrowLeft, Clock, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function OtpVerifyPage() {
  const navigate = useNavigate();
  const { pendingPhone, lastDemoOtp, verifyOtp, sendOtp } = useAuth();
  const { t } = useLanguage();

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes (300 seconds)
  const [resendCooldown, setResendCooldown] = useState(60); // 60s cooldown
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const inputRefs = useRef([]);

  // Redirect to login if no pending phone number is set
  useEffect(() => {
    if (!pendingPhone) {
      navigate('/login');
    }
  }, [pendingPhone, navigate]);

  // 5-minute expiry timer & 60s resend timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handle single digit input
  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    const completeCode = newDigits.join('');
    if (completeCode.length === 6 && !newDigits.includes('')) {
      submitOtp(completeCode);
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste full OTP
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setOtpDigits(digits);
      submitOtp(pasted);
    }
  };

  // 1-Click Demo OTP Autofill
  const handleDemoAutofill = () => {
    const code = lastDemoOtp || '123456';
    const digits = code.slice(0, 6).split('');
    setOtpDigits(digits);
    submitOtp(code);
  };

  // Submit OTP Verification
  const submitOtp = async (code) => {
    setLoading(true);
    try {
      const res = await verifyOtp(pendingPhone, code);
      const user = res.user;
      const agreementAccepted = hasValidAgreement(user);

      const onboardingCompleted =
        user?.onboarding_completed ||
        localStorage.getItem('hercare_onboarding_completed') === 'true';

      if (!agreementAccepted) {
        navigate('/privacy-agreement');
      } else if (!onboardingCompleted) {
        navigate('/language-select');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid OTP code. Please try again.';
      setError(msg);

      // Extract remaining attempts if provided in error detail
      const match = msg.match(/(\d+) attempt\(s\) remaining/);
      if (match) {
        setAttemptsRemaining(parseInt(match[1], 10));
      } else if (msg.includes('Maximum attempts exceeded')) {
        setAttemptsRemaining(0);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError('');
    try {
      await sendOtp(pendingPhone);
      setTimeLeft(300);
      setResendCooldown(60);
      setAttemptsRemaining(3);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-pink-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>{t('otp.change_number')}</span>
        </button>

        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-rose-200">
            <KeyRound className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          {t('otp.title')}
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          {t('otp.sent_to')}{' '}
          <span className="font-semibold text-slate-900">{pendingPhone}</span>
        </p>

        {/* Demo OTP Helper Banner */}
        <div className="mt-4 p-3 bg-rose-50/80 border border-rose-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <div className="text-xs">
              <span className="font-bold text-rose-900">{t('common.demo_otp_label')} </span>
              <span className="font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                {lastDemoOtp || '123456'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDemoAutofill}
            className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded-xl shadow-sm transition"
          >
            {t('otp.autofill')}
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-rose-100/50 rounded-3xl sm:px-10 border border-rose-100/80">
          
          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 6 Digit Inputs */}
          <div className="flex justify-between gap-2 sm:gap-3 mb-6" onPaste={handlePaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={loading || timeLeft === 0 || attemptsRemaining === 0}
                className="w-12 h-14 text-center text-xl font-bold text-slate-900 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50 focus:bg-white transition"
              />
            ))}
          </div>

          {/* Timer & Attempt Status */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-6 px-1">
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {t('otp.expires_in')} <strong className={`ml-1 ${timeLeft < 60 ? 'text-rose-600' : 'text-slate-800'}`}>{formatTimer(timeLeft)}</strong>
            </span>
            <span className="font-medium">
              {t('otp.attempts')} <strong className={attemptsRemaining <= 1 ? 'text-rose-600' : 'text-slate-800'}>{attemptsRemaining}/3</strong>
            </span>
          </div>

          {/* Verify Button */}
          <button
            type="button"
            onClick={() => submitOtp(otpDigits.join(''))}
            disabled={loading || otpDigits.includes('') || timeLeft === 0 || attemptsRemaining === 0}
            className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-md shadow-rose-500/20 text-sm font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 disabled:opacity-50 transition"
          >
            {loading ? t('otp.verifying') : t('otp.verify_enter')}
          </button>

          {/* Resend Action */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              {t('otp.no_code')}{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 transition"
              >
                {resendCooldown > 0 ? `${t('otp.resend_in')} ${resendCooldown}s` : t('otp.resend_code')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
