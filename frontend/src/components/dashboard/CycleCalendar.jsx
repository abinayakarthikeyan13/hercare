import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Droplet, Clock, Disc, Sparkles, Plus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import AvatarChibi from '../common/AvatarChibi';

/**
 * CycleCalendar
 * Recreates the calendar view from the uploaded design reference:
 * - Monthly grid with previous/next month navigation
 * - Period, Mucus, Ovulation, and Looming indicator markers
 * - 4 Legend cards (Periods, Mucus, Ovulation, Looming)
 * - "Any Symptoms - How Are You Feeling Today?" quick check-in card
 */
export default function CycleCalendar({
  cycles = [],
  symptomLogs = [],
  selectedDate,
  onSelectDate,
  onOpenCheckIn
}) {
  const { language, t } = useLanguage();

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(selectedDate || new Date()));

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthNamesTa = [
    'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
    'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'
  ];

  const daysOfWeekEn = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const daysOfWeekTa = ['சனி', 'ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி'];

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const prevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Days in month
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun, 6 is Sat
  // Map Sun (0) to index in [Sat, Sun, Mon, Tue, Wed, Thu, Fri] -> Sat is 0, Sun is 1, etc.
  const offset = (firstDayIndex + 1) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const formattedMonth = language === 'ta' ? `${monthNamesTa[month]}, ${year}` : `${monthNamesEn[month]}, ${year}`;

  // Helper to check if a day is marked as period, mucus, ovulation, or looming
  const getDayStatus = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check if recorded period
    const isPeriod = cycles.some((c) => {
      if (!c.startDate) return false;
      const start = new Date(c.startDate);
      const end = c.endDate ? new Date(c.endDate) : new Date(start.getTime() + 4 * 86400000);
      const target = new Date(dateStr);
      return target >= start && target <= end;
    });

    // Check if logged symptom
    const hasSymptom = symptomLogs.some((l) => l.date === dateStr);

    // Predict ovulation around Day 14 of typical cycle
    const isOvulation = day >= 13 && day <= 15;
    // Predict looming upcoming period around Day 26-28
    const isLooming = day >= 26 && day <= 28;

    return { isPeriod, hasSymptom, isOvulation, isLooming, dateStr };
  };

  const handleDateClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (onSelectDate) onSelectDate(dateStr);
  };

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-rose-100 flex flex-col space-y-5">
      {/* Calendar Header with Navigation */}
      <div className="bg-[#FFF5ED] rounded-2xl p-4 border border-[#FFE4CC]/60">
        <div className="flex items-center justify-between mb-3 px-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-full hover:bg-rose-100/50 text-slate-600 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-extrabold text-sm sm:text-base text-slate-800 tracking-tight">
            {formattedMonth}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-full hover:bg-rose-100/50 text-slate-600 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
          {(language === 'ta' ? daysOfWeekTa : daysOfWeekEn).map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {/* Leading blank spaces */}
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9" />
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const status = getDayStatus(day);
            const isSelected = selectedDate === status.dateStr;

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(day)}
                className={`h-9 flex flex-col items-center justify-center rounded-xl transition relative group ${
                  isSelected
                    ? 'border-2 border-[#FF668A] text-[#FF668A] font-extrabold bg-rose-50/50'
                    : 'text-slate-700 hover:bg-rose-50/80 font-medium'
                }`}
              >
                <span>{day < 10 ? `0${day}` : day}</span>
                {/* Status indicator dots underneath */}
                <div className="flex space-x-0.5 mt-0.5">
                  {status.isPeriod && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF668A]" title="Period Day" />
                  )}
                  {status.hasSymptom && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFA500]" title="Symptom Logged" />
                  )}
                  {status.isOvulation && !status.isPeriod && (
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-300" title="Ovulation" />
                  )}
                  {status.isLooming && !status.isPeriod && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Looming Period" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Legend Pill Cards (Directly matching reference image) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Periods */}
        <div className="bg-[#FFE2E8] p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs border border-rose-200/50">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[#FF668A] mb-1.5 shadow-xs">
            <Droplet className="w-4 h-4 fill-current" />
          </div>
          <span className="text-xs font-bold text-slate-800">
            {language === 'ta' ? 'மாதவிடாய்' : 'Periods'}
          </span>
        </div>

        {/* 2. Mucus */}
        <div className="bg-[#FFE4CC] p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs border border-orange-200/50">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-amber-600 mb-1.5 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">
            {language === 'ta' ? 'திரவம்' : 'Mucus'}
          </span>
        </div>

        {/* 3. Ovulation */}
        <div className="bg-[#FFE4EC] p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs border border-pink-200/50">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-pink-500 mb-1.5 shadow-xs">
            <Disc className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">
            {language === 'ta' ? 'அண்டவிடுப்பு' : 'Ovulation'}
          </span>
        </div>

        {/* 4. Looming */}
        <div className="bg-[#DDF8F4] p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs border border-teal-200/50">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-teal-600 mb-1.5 shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800">
            {language === 'ta' ? 'விரைவில்' : 'Looming'}
          </span>
        </div>
      </div>

      {/* Any Symptoms / How Are You Feeling Today Card (Bottom of Screen B) */}
      <div className="bg-gradient-to-r from-rose-50/70 via-pink-50/40 to-purple-50/50 rounded-2xl p-4 border border-rose-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AvatarChibi expression="happy" size={48} />
          <div>
            <h4 className="text-xs uppercase font-extrabold tracking-wider text-rose-500">
              {language === 'ta' ? 'அறிகுறிகள்' : 'Any Symptoms'}
            </h4>
            <p className="text-sm font-bold text-slate-800">
              {language === 'ta' ? 'இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?' : 'How Are You Feeling Today?'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenCheckIn}
          className="px-4 py-2 rounded-full border-2 border-[#FF668A] text-[#FF668A] hover:bg-[#FF668A] hover:text-white font-extrabold text-xs shadow-sm transition flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{language === 'ta' ? 'பதிவு செய்' : 'Add Symptoms'}</span>
        </button>
      </div>
    </div>
  );
}
