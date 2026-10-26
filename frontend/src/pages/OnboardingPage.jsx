import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useCycle } from '../context/CycleContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { saveLocalPreference } from '../lib/db';
import api from '../lib/api';
import HerCareAvatar from '../components/common/HerCareAvatar';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Edit2,
  Mic,
  MicOff,
  Sparkles,
  Heart,
  ShieldCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { addCycle } = useCycle();

  // Current Step: 1 to 7 are questions, 8 is the Recap screen
  const [currentStep, setCurrentStep] = useState(1);
  const totalQuestionSteps = 7;

  // Stored state for all questions (preserved when navigating back and forth)
  const [assistantNickname, setAssistantNickname] = useState('HerCare AI');
  const [customAssistantNickname, setCustomAssistantNickname] = useState('');
  const [userName, setUserName] = useState('');
  
  const [regularity, setRegularity] = useState('regular'); // 'regular' | 'irregular' | 'unsure' | 'other'
  const [customRegularity, setCustomRegularity] = useState('');

  const [periodDuration, setPeriodDuration] = useState('5-7'); // '3-4' | '5-7' | '8+' | 'other'
  const [customPeriodDuration, setCustomPeriodDuration] = useState('');

  const [painLevel, setPainLevel] = useState('moderate'); // 'mild' | 'moderate' | 'severe' | 'other'
  const [customPainLevel, setCustomPainLevel] = useState('');

  const [selectedSymptoms, setSelectedSymptoms] = useState(['cramps', 'fatigue']);
  const [customSymptom, setCustomSymptom] = useState('');

  const [conversationStyle, setConversationStyle] = useState('warm'); // 'warm' | 'short' | 'science' | 'other'
  const [customConversationStyle, setCustomConversationStyle] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Voice speech-to-text hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: sttSupported
  } = useSpeechRecognition({
    language,
    onResult: (text) => {
      if (currentStep === 1 && assistantNickname === 'other') {
        setCustomAssistantNickname(text);
      } else if (currentStep === 2) {
        setUserName(text);
      } else if (currentStep === 3 && regularity === 'other') {
        setCustomRegularity(text);
      } else if (currentStep === 4 && periodDuration === 'other') {
        setCustomPeriodDuration(text);
      } else if (currentStep === 5 && painLevel === 'other') {
        setCustomPainLevel(text);
      } else if (currentStep === 6) {
        setCustomSymptom(text);
      } else if (currentStep === 7 && conversationStyle === 'other') {
        setCustomConversationStyle(text);
      }
    }
  });

  const handleNext = () => {
    if (isListening) stopListening();
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (isListening) stopListening();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const jumpToStep = (stepNumber) => {
    setCurrentStep(stepNumber);
  };

  const toggleSymptom = (key) => {
    setSelectedSymptoms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Explicit confirmation and saving on Recap screen
  const handleConfirmAndSave = async () => {
    setSaving(true);
    setErrorMessage('');

    try {
      const finalAssistantNickname =
        assistantNickname === 'other'
          ? customAssistantNickname.trim() || 'HerCare AI'
          : assistantNickname;

      const finalUserName = userName.trim() || (language === 'ta' ? 'தோழி' : 'Friend');

      const finalRegularity =
        regularity === 'other' ? customRegularity.trim() || 'Custom regularity' : regularity;

      const parsedPeriodDays =
        periodDuration === '3-4' ? 4 : periodDuration === '8+' ? 8 : 5;

      const allSymptoms = [...selectedSymptoms];
      if (customSymptom.trim() && !allSymptoms.includes(customSymptom.trim())) {
        allSymptoms.push(customSymptom.trim());
      }

      const preferencesData = {
        assistant_nickname: finalAssistantNickname,
        nickname: finalUserName,
        regularity: finalRegularity,
        period_length: parsedPeriodDays,
        cycle_length: 28,
        pain_level: painLevel === 'other' ? customPainLevel.trim() : painLevel,
        symptoms: allSymptoms,
        conversation_style:
          conversationStyle === 'other' ? customConversationStyle.trim() : conversationStyle,
        onboarding_completed: true,
      };

      // 1. Save locally in browser IndexedDB
      await saveLocalPreference('user_profile', preferencesData);
      await saveLocalPreference('nickname', finalUserName);
      await saveLocalPreference('assistant_nickname', finalAssistantNickname);
      await saveLocalPreference('onboarding_completed', true);
      localStorage.setItem('hercare_onboarding_completed', 'true');

      // 2. Add initial default cycle record in IndexedDB
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 2);
      const twoDaysLater = new Date(today);
      twoDaysLater.setDate(today.getDate() + 2);

      await addCycle({
        startDate: threeDaysAgo.toISOString().split('T')[0],
        endDate: twoDaysLater.toISOString().split('T')[0],
        cycleLength: 28,
        periodLength: parsedPeriodDays,
        symptoms: allSymptoms,
        mood: 'calm',
        flow: 'medium',
        notes: 'Initial cycle setup during onboarding',
      });

      // 3. Push encrypted preferences to backend if authenticated
      if (isAuthenticated) {
        try {
          await api.post('/preferences', {
            nickname: finalUserName,
            food_dislikes: [],
            exercise_pref: 'yoga',
            energy_level: 'medium',
          });
          await api.post('/auth/complete-onboarding');
        } catch (err) {
          console.warn('Backend preferences save deferred:', err);
        }
      }

      // Step 6: Proceed directly to Dashboard
      navigate('/dashboard');
    } catch (e) {
      console.error('Save error:', e);
      setErrorMessage(
        language === 'ta'
          ? 'விவரங்களைச் சேமிப்பதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
          : 'Failed to save onboarding data. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center p-3 sm:p-5 overflow-hidden bg-[#FAF7FD] dark:bg-slate-950 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-[32px] max-w-md w-full h-[96dvh] max-h-[820px] shadow-2xl border border-purple-100 dark:border-slate-800 flex flex-col justify-between overflow-hidden relative">
        
        {/* Top Progress & Step Bar */}
        <div className="px-5 pt-4 pb-2 border-b border-purple-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10">
          <div className="flex items-center space-x-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition"
                title={t('onboarding.btn_back')}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs font-extrabold text-[#FF668A]">
              {currentStep <= 7
                ? `${t('onboarding.step_count')} ${currentStep} ${t('onboarding.of')} ${totalQuestionSteps}`
                : t('onboarding.recap_title')}
            </span>
          </div>

          {/* 7-Segment Progress Dots */}
          <div className="flex space-x-1.5 items-center">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <div
                key={num}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  num === currentStep
                    ? 'w-6 bg-[#FF668A]'
                    : num < currentStep
                    ? 'w-2 bg-pink-300 dark:bg-pink-800'
                    : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Scrollable Question Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col justify-center">
          
          {/* STEP 1: Assistant Nickname */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center">
                <HerCareAvatar size={74} state="idle" expression="happy" />
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-3 leading-snug">
                  {t('onboarding.q1_title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('onboarding.q1_hint')}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {[
                  { id: 'HerCare AI', label: t('onboarding.q1_opt1') },
                  { id: 'Maya', label: t('onboarding.q1_opt2') },
                  { id: 'Ananya', label: t('onboarding.q1_opt3') },
                  { id: 'other', label: t('onboarding.other_label') },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setAssistantNickname(item.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between text-xs sm:text-sm font-bold ${
                      assistantNickname === item.id
                        ? 'border-[#FF668A] bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-purple-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        assistantNickname === item.id
                          ? 'border-[#FF668A] bg-[#FF668A] text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {assistantNickname === item.id && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                ))}

                {assistantNickname === 'other' && (
                  <div className="pt-2 animate-fadeIn">
                    <input
                      type="text"
                      value={customAssistantNickname}
                      onChange={(e) => setCustomAssistantNickname(e.target.value)}
                      placeholder={t('onboarding.other_placeholder')}
                      className="w-full px-4 py-3 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Preferred Name for User */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn text-center">
              <HerCareAvatar size={74} state="idle" expression="happy" />
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-snug">
                  {t('onboarding.q2_title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('onboarding.q2_hint')}
                </p>
              </div>

              <div className="pt-2">
                <div className="relative">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={t('onboarding.q2_placeholder')}
                    className="w-full px-4 py-3.5 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100 text-center focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                  {sttSupported && (
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      className={`absolute right-3 top-2.5 p-2 rounded-xl transition ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-purple-50 dark:bg-slate-700 text-purple-600 dark:text-purple-300'
                      }`}
                      title="Speak your name"
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {language === 'ta'
                    ? 'விரும்பினால் இதை தவிர்க்கலாம். நான் உங்களை "தோழி" என்று அழைப்பேன்.'
                    : 'Optional. If left blank, I will affectionately call you "Friend".'}
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: Cycle Regularity */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center">
                <HerCareAvatar size={66} state="idle" expression="happy" />
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 leading-snug">
                  {t('onboarding.q3_title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('onboarding.q3_hint')}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {[
                  { id: 'regular', label: t('onboarding.q3_opt1') },
                  { id: 'irregular', label: t('onboarding.q3_opt2') },
                  { id: 'unsure', label: t('onboarding.q3_opt3') },
                  { id: 'other', label: t('onboarding.other_label') },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setRegularity(item.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between text-xs sm:text-sm font-bold ${
                      regularity === item.id
                        ? 'border-[#FF668A] bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-purple-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        regularity === item.id
                          ? 'border-[#FF668A] bg-[#FF668A] text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {regularity === item.id && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                ))}

                {regularity === 'other' && (
                  <input
                    type="text"
                    value={customRegularity}
                    onChange={(e) => setCustomRegularity(e.target.value)}
                    placeholder={t('onboarding.other_placeholder')}
                    className="w-full px-4 py-3 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Period Duration */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center">
                <HerCareAvatar size={66} state="idle" expression="happy" />
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 leading-snug">
                  {t('onboarding.q4_title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('onboarding.q4_hint')}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {[
                  { id: '3-4', label: t('onboarding.q4_opt1') },
                  { id: '5-7', label: t('onboarding.q4_opt2') },
                  { id: '8+', label: t('onboarding.q4_opt3') },
                  { id: 'other', label: t('onboarding.other_label') },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPeriodDuration(item.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between text-xs sm:text-sm font-bold ${
                      periodDuration === item.id
                        ? 'border-[#FF668A] bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-purple-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        periodDuration === item.id
                          ? 'border-[#FF668A] bg-[#FF668A] text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {periodDuration === item.id && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                ))}

                {periodDuration === 'other' && (
                  <input
                    type="text"
                    value={customPeriodDuration}
                    onChange={(e) => setCustomPeriodDuration(e.target.value)}
                    placeholder={t('onboarding.other_placeholder')}
                    className="w-full px-4 py-3 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Discomfort / Pain Level */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center">
                <HerCareAvatar size={66} state="idle" expression="happy" />
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 leading-snug">
                  {t('onboarding.q5_title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('onboarding.q5_hint')}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {[
                  { id: 'mild', label: t('onboarding.q5_opt1') },
                  { id: 'moderate', label: t('onboarding.q5_opt2') },
                  { id: 'severe', label: t('onboarding.q5_opt3') },
                  { id: 'other', label: t('onboarding.other_label') },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setPainLevel(item.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between text-xs sm:text-sm font-bold ${
                      painLevel === item.id
                        ? 'border-[#FF668A] bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-purple-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        painLevel === item.id
                          ? 'border-[#FF668A] bg-[#FF668A] text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {painLevel === item.id && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                ))}

                {painLevel === 'other' && (
                  <input
                    type="text"
                    value={customPainLevel}
                    onChange={(e) => setCustomPainLevel(e.target.value)}
                    placeholder={t('onboarding.other_placeholder')}
                    className="w-full px-4 py-3 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 6: Common Symptoms (Multi-Select) */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center">
                <HerCareAvatar size={66} state="idle" expression="happy" />
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 leading-snug">
                  {t('onboarding.q6_title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('onboarding.q6_hint')}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {[
                  { id: 'cramps', label: t('onboarding.q6_opt1') },
                  { id: 'fatigue', label: t('onboarding.q6_opt2') },
                  { id: 'mood', label: t('onboarding.q6_opt3') },
                ].map((item) => {
                  const isSelected = selectedSymptoms.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSymptom(item.id)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between text-xs sm:text-sm font-bold ${
                        isSelected
                          ? 'border-[#FF668A] bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-purple-200'
                      }`}
                    >
                      <span>{item.label}</span>
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-[#FF668A] bg-[#FF668A] text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-1">
                  <input
                    type="text"
                    value={customSymptom}
                    onChange={(e) => setCustomSymptom(e.target.value)}
                    placeholder={t('onboarding.other_label')}
                    className="w-full px-4 py-3 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Conversation Style */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center">
                <HerCareAvatar size={66} state="idle" expression="happy" />
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-2 leading-snug">
                  {t('onboarding.q7_title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('onboarding.q7_hint')}
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                {[
                  { id: 'warm', label: t('onboarding.q7_opt1') },
                  { id: 'short', label: t('onboarding.q7_opt2') },
                  { id: 'science', label: t('onboarding.q7_opt3') },
                  { id: 'other', label: t('onboarding.other_label') },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setConversationStyle(item.id)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between text-xs sm:text-sm font-bold ${
                      conversationStyle === item.id
                        ? 'border-[#FF668A] bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-purple-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        conversationStyle === item.id
                          ? 'border-[#FF668A] bg-[#FF668A] text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {conversationStyle === item.id && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                ))}

                {conversationStyle === 'other' && (
                  <input
                    type="text"
                    value={customConversationStyle}
                    onChange={(e) => setCustomConversationStyle(e.target.value)}
                    placeholder={t('onboarding.other_placeholder')}
                    className="w-full px-4 py-3 rounded-2xl border border-purple-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#FF668A]"
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 8: ONBOARDING RECAP SCREEN */}
          {currentStep === 8 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center">
                <div className="inline-block p-1 rounded-full bg-rose-100 dark:bg-rose-950/50 mb-1">
                  <Sparkles className="w-6 h-6 text-[#FF668A]" />
                </div>
                <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {t('onboarding.recap_title')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('onboarding.recap_subtitle')}
                </p>
              </div>

              {/* Summary Items with Edit Buttons */}
              <div className="bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-purple-100 dark:border-slate-700/60 divide-y divide-purple-100/60 dark:divide-slate-700/60 text-xs">
                
                {/* 1. Assistant Nickname */}
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">{t('onboarding.lbl_assistant_nickname')}</span>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200">
                      {assistantNickname === 'other' ? customAssistantNickname || 'HerCare AI' : assistantNickname}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(1)}
                    className="p-1 text-purple-600 hover:text-purple-800 font-bold flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t('onboarding.btn_edit')}</span>
                  </button>
                </div>

                {/* 2. User Name */}
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">{t('onboarding.lbl_user_name')}</span>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200">
                      {userName.trim() || (language === 'ta' ? 'தோழி' : 'Friend')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(2)}
                    className="p-1 text-purple-600 hover:text-purple-800 font-bold flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t('onboarding.btn_edit')}</span>
                  </button>
                </div>

                {/* 3. Regularity */}
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">{t('onboarding.lbl_regularity')}</span>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 capitalize">
                      {regularity === 'other' ? customRegularity || 'Custom' : regularity}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(3)}
                    className="p-1 text-purple-600 hover:text-purple-800 font-bold flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t('onboarding.btn_edit')}</span>
                  </button>
                </div>

                {/* 4. Duration */}
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">{t('onboarding.lbl_duration')}</span>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200">
                      {periodDuration === 'other' ? customPeriodDuration || 'Custom' : `${periodDuration} days`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(4)}
                    className="p-1 text-purple-600 hover:text-purple-800 font-bold flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t('onboarding.btn_edit')}</span>
                  </button>
                </div>

                {/* 5. Pain Level */}
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">{t('onboarding.lbl_pain')}</span>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 capitalize">
                      {painLevel === 'other' ? customPainLevel || 'Custom' : painLevel}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(5)}
                    className="p-1 text-purple-600 hover:text-purple-800 font-bold flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t('onboarding.btn_edit')}</span>
                  </button>
                </div>

                {/* 6. Symptoms */}
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">{t('onboarding.lbl_symptoms')}</span>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200">
                      {selectedSymptoms.join(', ') || 'None selected'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(6)}
                    className="p-1 text-purple-600 hover:text-purple-800 font-bold flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t('onboarding.btn_edit')}</span>
                  </button>
                </div>

                {/* 7. Style */}
                <div className="py-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold">{t('onboarding.lbl_style')}</span>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 capitalize">
                      {conversationStyle === 'other' ? customConversationStyle || 'Custom' : conversationStyle}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToStep(7)}
                    className="p-1 text-purple-600 hover:text-purple-800 font-bold flex items-center space-x-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{t('onboarding.btn_edit')}</span>
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-600 font-bold text-center">{errorMessage}</p>
              )}
            </div>
          )}

        </div>

        {/* Fixed Bottom Action Controls (Never Covered by Content) */}
        <div className="p-4 border-t border-purple-50 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2 z-10">
          {currentStep <= 7 ? (
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="py-3.5 px-4 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
                >
                  {t('onboarding.btn_back')}
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/25 transition flex items-center justify-center space-x-2 active:scale-98"
              >
                <span>{currentStep === 7 ? t('onboarding.recap_title') : t('onboarding.btn_continue')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmAndSave}
                className="w-full py-3.5 px-4 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25 transition flex items-center justify-center space-x-2 active:scale-98"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{saving ? t('common.saving') : t('onboarding.btn_confirm_save')}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(7)}
                className="w-full py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 transition"
              >
                {t('onboarding.btn_back')}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
