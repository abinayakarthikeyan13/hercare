import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getLocalPreference, saveLocalPreference } from '../../lib/db';
import api from '../../lib/api';
import { Globe, User, Utensils, Activity, BatteryCharging, Bell, Volume2, Check, Sparkles } from 'lucide-react';

export default function PreferencesScreen() {
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated } = useAuth();

  const [nickname, setNickname] = useState('Gargi');
  const [foodDislikes, setFoodDislikes] = useState(['spicy', 'dairy']);
  const [exercisePref, setExercisePref] = useState('yoga');
  const [energyLevel, setEnergyLevel] = useState('moderate');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    async function loadData() {
      const stored = await getLocalPreference('user_profile', null);
      if (stored) {
        if (stored.nickname) setNickname(stored.nickname);
        if (stored.food_dislikes) setFoodDislikes(stored.food_dislikes);
        if (stored.exercise_pref) setExercisePref(stored.exercise_pref);
        if (stored.energy_level) setEnergyLevel(stored.energy_level);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const updated = {
      nickname: nickname.trim() || 'Friend',
      food_dislikes: foodDislikes,
      exercise_pref: exercisePref,
      energy_level: energyLevel,
      voice_speed: voiceSpeed,
      reminders_enabled: remindersEnabled,
    };

    await saveLocalPreference('user_profile', updated);
    await saveLocalPreference('nickname', updated.nickname);

    if (isAuthenticated) {
      try {
        await api.post('/preferences', {
          nickname: updated.nickname,
          food_dislikes: foodDislikes,
          exercise_pref: exercisePref,
          energy_level: energyLevel,
        });
      } catch (err) {
        console.warn('Backend sync deferred:', err);
      }
    }

    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const toggleFood = (item) => {
    if (foodDislikes.includes(item)) {
      setFoodDislikes(foodDislikes.filter((f) => f !== item));
    } else {
      setFoodDislikes([...foodDislikes, item]);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl p-6 shadow-sm border border-rose-100 select-none">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-rose-100">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {language === 'ta' ? 'அமைப்புகள் & விருப்பத்தேர்வுகள்' : 'Preferences & Settings'}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'ta' ? 'உங்கள் தனிப்பட்ட நல்வாழ்வு சுயவிவரம்' : 'Personalize your AI companion experience'}
          </p>
        </div>

        {savedMessage && (
          <div className="flex items-center space-x-1 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full animate-fadeIn">
            <Check className="w-3.5 h-3.5" />
            <span>{t('common.saved')}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Language Selection */}
        <div className="p-4 rounded-2xl bg-[#F5F3FF] border border-purple-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-slate-800">
                {language === 'ta' ? 'பயன்பாட்டு மொழி (Language)' : 'App Language'}
              </h4>
              <p className="text-[11px] text-slate-500">
                {language === 'ta' ? 'தமிழ் மற்றும் ஆங்கிலம்' : 'English & தமிழ்'}
              </p>
            </div>
          </div>

          <div className="flex rounded-xl bg-white p-1 border border-purple-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                language === 'en' ? 'bg-[#FF668A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ta')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                language === 'ta' ? 'bg-[#FF668A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              தமிழ்
            </button>
          </div>
        </div>

        {/* 2. Nickname */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            {language === 'ta' ? 'செல்லப்பெயர் (Nickname)' : 'Preferred Nickname'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-[#FF668A] focus:ring-2 focus:ring-rose-500/20 text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white"
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {language === 'ta' ? 'ஏஐ தோழி உரையாடலில் இந்த பெயரை பயன்படுத்தும்.' : 'HerCare AI uses this name in greetings and advice.'}
          </p>
        </div>

        {/* 3. Food Dislikes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            {language === 'ta' ? 'ஒவ்வாத உணவுகள் (Food Dislikes)' : 'Food Dislikes / Sensitivities'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['dairy', 'spicy', 'caffeine', 'sugar', 'gluten', 'fried'].map((food) => {
              const isSelected = foodDislikes.includes(food);
              return (
                <button
                  key={food}
                  type="button"
                  onClick={() => toggleFood(food)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition ${
                    isSelected
                      ? 'border-[#FF668A] bg-rose-50 text-[#FF668A]'
                      : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                  }`}
                >
                  {food}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Movement Preference */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            {language === 'ta' ? 'விருப்பமான உடற்பயிற்சி' : 'Preferred Movement / Exercise'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['yoga', 'walking', 'rest'].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setExercisePref(ex)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition ${
                  exercisePref === ex
                    ? 'border-[#FF668A] bg-rose-50 text-[#FF668A]'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Energy Level */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            {language === 'ta' ? 'வழக்கமான ஆற்றல் அளவு' : 'Typical Energy Level'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['low', 'moderate', 'high'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setEnergyLevel(lvl)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition ${
                  energyLevel === lvl
                    ? 'border-[#FF668A] bg-rose-50 text-[#FF668A]'
                    : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Voice Settings */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 mb-2">
            <Volume2 className="w-4 h-4 text-[#FF668A]" />
            <span>{language === 'ta' ? 'குரல் வாசிப்பு வேகம்' : 'Voice Speech Rate'}</span>
          </div>
          <input
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={voiceSpeed}
            onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
            className="w-full accent-[#FF668A] h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
            <span>0.75x (Calm)</span>
            <span>1.0x (Normal)</span>
            <span>1.5x (Fast)</span>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-2xl font-extrabold text-xs text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/20 transition"
        >
          {language === 'ta' ? 'விருப்பத்தேர்வுகளை சேமி' : 'Save Preferences'}
        </button>
      </form>
    </div>
  );
}
