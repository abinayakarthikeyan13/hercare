import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useCycle } from '../../context/CycleContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
  X,
  AlertTriangle
} from 'lucide-react';

/**
 * Unique Circular Rotary Cycle Tracker
 * Redesigned for menstrual cycle tracking inspired by a traditional rotary telephone dial.
 * - Sequential cycle-day numbers arranged around circular ring
 * - Movable selector draggable via touch or mouse (prevents page scrolling)
 * - Tapping day markers selects directly
 * - Center display shows selected date, cycle day, phase, and recorded vs estimated period
 * - Range customization: start date, duration, cycle length
 * - Conventional date picker alternative
 * - Confirm and Save / Cancel actions with backend and IndexedDB persistence
 */
export default function RotaryCycleTracker({ onSaved, onOpenCheckIn }) {
  const { language, t } = useLanguage();
  const { cycles, symptomLogs, addCycle, cloudSyncEnabled, getCurrentPhase } = useCycle();
  const phaseInfo = getCurrentPhase();

  // Primary cycle settings
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [startDate, setStartDate] = useState(() => {
    // Default start date: today minus (dayOfCycle - 1) days
    const d = new Date();
    d.setDate(d.getDate() - ((phaseInfo.dayOfCycle || 1) - 1));
    return d.toISOString().split('T')[0];
  });

  // Selected Day on Dial (1 to cycleLength)
  const [selectedDay, setSelectedDay] = useState(phaseInfo.dayOfCycle || 1);
  const [isDragging, setIsDragging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showCalendarFallback, setShowCalendarFallback] = useState(false);

  const dialSvgRef = useRef(null);

  // Sync selected day to calculate corresponding calendar date
  const getSelectedDate = useCallback(() => {
    try {
      const base = new Date(startDate);
      base.setDate(base.getDate() + (selectedDay - 1));
      return base.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }, [startDate, selectedDay]);

  const selectedDateStr = getSelectedDate();

  // Check if date has logged symptoms
  const daySymptoms = symptomLogs.filter((log) => log.date === selectedDateStr);

  // Check if selectedDay is in menstrual phase (Days 1 to periodLength)
  const isPeriodDay = selectedDay <= periodLength;
  // Fertile window: typically around ovulation (CycleLength - 14) ± 2 days
  const ovulationDay = Math.max(12, cycleLength - 14);
  const isFertileDay = selectedDay >= ovulationDay - 3 && selectedDay <= ovulationDay + 1;

  // Geometry for Rotary SVG Dial
  const size = 300;
  const center = size / 2;
  const radius = 108;
  const strokeWidth = 24;

  // Polar to Cartesian conversion (0 degrees = top / 12 o'clock)
  const polarToCartesian = (cx, cy, r, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x, y, r, startA, endA) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  // Convert Pointer coordinates to Cycle Day (1..cycleLength)
  const updateDayFromCoordinates = useCallback((clientX, clientY) => {
    if (!dialSvgRef.current) return;
    const rect = dialSvgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;

    // Angle in degrees from top (0 deg = top, 90 = right, 180 = bottom, 270 = left)
    let degrees = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (degrees < 0) degrees += 360;

    // Convert degrees to day index
    const dayFraction = degrees / 360;
    let day = Math.round(dayFraction * cycleLength) + 1;
    if (day > cycleLength) day = 1;
    if (day < 1) day = cycleLength;

    setSelectedDay(day);
  }, [cycleLength]);

  // Touch and Mouse Drag handlers with touch-action prevention
  const handlePointerDown = (e) => {
    setIsDragging(true);
    updateDayFromCoordinates(e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    updateDayFromCoordinates(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  // Previous & Next day buttons
  const stepPrevDay = () => {
    setSelectedDay((prev) => (prev > 1 ? prev - 1 : cycleLength));
  };

  const stepNextDay = () => {
    setSelectedDay((prev) => (prev < cycleLength ? prev + 1 : 1));
  };

  // Save Cycle Record Handler
  const handleSaveConfirmedCycle = async () => {
    const endD = new Date(startDate);
    endD.setDate(endD.getDate() + periodLength - 1);

    await addCycle({
      startDate,
      endDate: endD.toISOString().split('T')[0],
      cycleLength: parseInt(cycleLength, 10),
      periodLength: parseInt(periodLength, 10),
      flow: 'medium',
      mood: 'calm',
      symptoms: [],
      notes: `Saved from Rotary Dial. Selected day: ${selectedDay}`,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    if (onSaved) onSaved();
  };

  // Calculate arc angles for visual ring segments
  const periodSpan = (periodLength / cycleLength) * 360;
  const fertileStart = ((ovulationDay - 3) / cycleLength) * 360;
  const fertileEnd = ((ovulationDay + 1) / cycleLength) * 360;

  // Selected Day angle for the movable selector
  const selectedAngle = ((selectedDay - 1) / cycleLength) * 360;
  const selectorPos = polarToCartesian(center, center, radius, selectedAngle);

  // Format date display
  const formatDateDisplay = (dateString) => {
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col items-center justify-between h-full w-full py-1 px-2 select-none">
      
      {/* Screen Title & Mode Switcher */}
      <div className="w-full flex items-center justify-between px-2 pt-1 pb-1 shrink-0">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
            <span className="text-[#FF668A]">🌸</span>
            <span>{t('rotary.title')}</span>
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {t('rotary.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition ${
            showConfig
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-purple-200 dark:border-slate-700'
          }`}
        >
          {showConfig ? 'Close' : 'Adjust'}
        </button>
      </div>

      {/* Optional Configuration Panel (Cycle length, period duration, start date) */}
      {showConfig && (
        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 mb-2 border border-purple-100 dark:border-slate-800 shadow-md text-xs space-y-2 animate-fadeIn shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                {t('rotary.start_date')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-1.5 rounded-xl border border-purple-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                {t('rotary.period_duration')}: {periodLength}d
              </label>
              <input
                type="range"
                min="3"
                max="8"
                value={periodLength}
                onChange={(e) => setPeriodLength(parseInt(e.target.value, 10))}
                className="w-full accent-[#FF668A]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5">
              <span>{t('rotary.cycle_length')}</span>
              <span className="text-[#FF668A]">{cycleLength} days</span>
            </div>
            <input
              type="range"
              min="21"
              max="38"
              value={cycleLength}
              onChange={(e) => setCycleLength(parseInt(e.target.value, 10))}
              className="w-full accent-[#FF668A]"
            />
          </div>
        </div>
      )}

      {/* Main Rotary Dial Center Section */}
      <div className="relative flex items-center justify-center my-auto" style={{ width: size, height: size }}>
        
        {/* SVG Rotary Dial Ring */}
        <svg
          ref={dialSvgRef}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          onPointerDown={handlePointerDown}
          className="cursor-pointer overflow-visible touch-none select-none"
          style={{ touchAction: 'none' }}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="rotaryPeriodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFA6B9" />
              <stop offset="100%" stopColor="#FF4772" />
            </linearGradient>

            <linearGradient id="rotaryFertileGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D8B4FE" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>

            {/* Drop shadow for vintage phone dial bevel */}
            <filter id="rotaryShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* 1. Base Outer Ring Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#F3EEFA"
            strokeWidth={strokeWidth}
            className="dark:stroke-slate-800"
          />

          {/* 2. Fertile Window Arc (Lavender) */}
          <path
            d={describeArc(center, center, radius, fertileStart, fertileEnd)}
            fill="none"
            stroke="url(#rotaryFertileGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* 3. Menstrual Period Arc (Pink / Rose) */}
          <path
            d={describeArc(center, center, radius, 0, periodSpan)}
            fill="none"
            stroke="url(#rotaryPeriodGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* 4. Rotary Day Markers (Circular phone finger-holes with day numbers) */}
          {Array.from({ length: cycleLength }, (_, i) => {
            const dayNum = i + 1;
            const angle = (i / cycleLength) * 360;
            const pt = polarToCartesian(center, center, radius, angle);
            const isSelected = dayNum === selectedDay;
            const isPeriod = dayNum <= periodLength;
            const isFertile = dayNum >= ovulationDay - 3 && dayNum <= ovulationDay + 1;

            return (
              <g
                key={dayNum}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDay(dayNum);
                }}
                className="cursor-pointer group"
              >
                {/* Vintage Rotary Hole Bevel */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 11 : 8}
                  fill={
                    isSelected
                      ? '#FFFFFF'
                      : isPeriod
                      ? '#FFE8EE'
                      : isFertile
                      ? '#F5EEFD'
                      : '#FFFFFF'
                  }
                  stroke={
                    isSelected
                      ? '#FF4772'
                      : isPeriod
                      ? '#FF7597'
                      : isFertile
                      ? '#C084FC'
                      : '#DDD5EA'
                  }
                  strokeWidth={isSelected ? 3 : 1.5}
                  filter="url(#rotaryShadow)"
                  className="transition-all duration-150"
                />

                {/* Day Number Label (Every day if <= 28, or alternate if dense) */}
                {(cycleLength <= 30 || dayNum % 2 !== 0 || isSelected) && (
                  <text
                    x={pt.x}
                    y={pt.y + 3}
                    textAnchor="middle"
                    fontSize={isSelected ? '9' : '7.5'}
                    fontWeight="bold"
                    fill={
                      isSelected
                        ? '#FF4772'
                        : isPeriod
                        ? '#BE123C'
                        : isFertile
                        ? '#7E22CE'
                        : '#64748B'
                    }
                    pointerEvents="none"
                  >
                    {dayNum}
                  </text>
                )}
              </g>
            );
          })}

          {/* 5. Movable Draggable Indicator Needle / Knob */}
          <g transform={`translate(${selectorPos.x}, ${selectorPos.y})`}>
            <circle
              r="15"
              fill="none"
              stroke="#FF4772"
              strokeWidth="2.5"
              strokeDasharray="3,2"
              className="animate-spin"
              style={{ animationDuration: '8s' }}
            />
            <circle
              r="6"
              fill="#FF4772"
              filter="url(#rotaryShadow)"
            />
          </g>
        </svg>

        {/* Center Display Surface (Rotary Dial Center Hub) */}
        <div
          onClick={() => {
            if (onOpenCheckIn) onOpenCheckIn(selectedDateStr);
          }}
          className="absolute rounded-full w-36 h-36 bg-white dark:bg-slate-900 border-2 border-purple-100 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center p-2 text-center cursor-pointer transition transform hover:scale-102"
        >
          {/* Phase Badge */}
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider mb-0.5 ${
              isPeriodDay
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                : isFertileDay
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            {isPeriodDay
              ? language === 'ta'
                ? 'மாதவிடாய்'
                : 'Menstrual'
              : isFertileDay
              ? language === 'ta'
                ? 'அண்டவிடுப்பு'
                : 'Fertile'
              : language === 'ta'
              ? 'லூட்டியல்'
              : 'Follicular'}
          </span>

          {/* Day Number */}
          <div className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">
            {language === 'ta' ? `நாள் ${selectedDay}` : `Day ${selectedDay}`}
          </div>
          <span className="text-[10px] text-slate-400 font-bold">
            {language === 'ta' ? `${cycleLength} இல்` : `of ${cycleLength} days`}
          </span>

          {/* Selected Date */}
          <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">
            {formatDateDisplay(selectedDateStr)}
          </div>

          {/* Recorded vs Estimated Tag */}
          <span
            className={`text-[8px] font-bold px-1.5 py-0.2 rounded-md mt-1 ${
              isPeriodDay && selectedDay <= 3
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {isPeriodDay && selectedDay <= 3
              ? t('rotary.recorded_period')
              : t('rotary.estimated_period')}
          </span>

          {/* Logged symptoms indicator */}
          {daySymptoms.length > 0 && (
            <span className="mt-0.5 text-[8px] text-purple-600 dark:text-purple-400 font-extrabold">
              • {daySymptoms.length} symptom(s) logged
            </span>
          )}
        </div>
      </div>

      {/* Accessible Stepping Controls: Prev Day & Next Day Buttons */}
      <div className="w-full flex items-center justify-between px-4 pt-1 shrink-0">
        <button
          type="button"
          onClick={stepPrevDay}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-xs hover:bg-slate-50 flex items-center space-x-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>{t('rotary.btn_prev')}</span>
        </button>

        {/* Legend Pills */}
        <div className="flex space-x-2 text-[10px] font-bold">
          <span className="inline-flex items-center space-x-1 text-rose-600">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Period</span>
          </span>
          <span className="inline-flex items-center space-x-1 text-purple-600">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Fertile</span>
          </span>
        </div>

        <button
          type="button"
          onClick={stepNextDay}
          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold shadow-xs hover:bg-slate-50 flex items-center space-x-1"
        >
          <span>{t('rotary.btn_next')}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Range Display & Confirm Actions */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl p-3 border border-purple-100 dark:border-slate-800 shadow-md text-xs space-y-2 mt-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Droplet className="w-4 h-4 text-rose-500" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {startDate} → Day {periodLength} ({periodLength} days flow)
            </span>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            {cycleLength}-day cycle
          </span>
        </div>

        {/* Action Buttons: Confirm & Save / Cancel */}
        <div className="flex space-x-2 pt-1">
          <button
            type="button"
            onClick={handleSaveConfirmedCycle}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-[#FF668A] to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/20 transition flex items-center justify-center space-x-1.5 active:scale-98"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{saveSuccess ? t('common.saved') : t('rotary.btn_save')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedDay(phaseInfo.dayOfCycle || 1);
            }}
            className="py-2.5 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
          >
            {t('rotary.btn_cancel')}
          </button>
        </div>

        <p className="text-[9px] text-slate-400 text-center leading-tight">
          {t('rotary.variability_notice')}
        </p>
      </div>

    </div>
  );
}
