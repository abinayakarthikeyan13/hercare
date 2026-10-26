import React from 'react';
import { Droplet, Info, Sparkles } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * CycleRingDial
 * Precise SVG Menstrual Cycle Visualization reproducing the uploaded design reference:
 * - 28-day perimeter dial with numbers & tick marks
 * - Pink period segment arc with blood droplet icons and curved "Menstrual" label
 * - Inner circular display showing current cycle day, phase, and non-diagnostic estimate
 */
export default function CycleRingDial({
  dayOfCycle = 1,
  cycleLength = 28,
  periodLength = 5,
  phase = 'menstrual',
  onLogClick
}) {
  const { t, language } = useLanguage();

  // SVG Geometry
  const size = 280;
  const center = size / 2;
  const radius = 105;
  const strokeWidth = 26;

  // Day markers to display around the dial (01, 04, 07, 10, 13, 16, 19, 22, 25, 28)
  const displayDays = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28];

  // Calculate arc angles (0 degrees at top = Day 1)
  // Menstrual phase spans from Day 1 to periodLength
  const startAngle = -90; // Top
  const periodSpanFraction = Math.min(periodLength, cycleLength) / cycleLength;
  const endAngle = startAngle + periodSpanFraction * 360;

  // Polar to Cartesian conversion
  const polarToCartesian = (centerX, centerY, r, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x, y, r, startA, endA) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  // Arc path for the pink period segment
  const periodArcPath = describeArc(center, center, radius, 0, periodSpanFraction * 360);

  // Status subtitle based on phase
  const getPhaseSubtitle = () => {
    if (language === 'ta') {
      switch (phase) {
        case 'menstrual':
          return 'கருத்தரிக்கும் வாய்ப்பு குறைவு';
        case 'ovulatory':
          return 'கருத்தரிக்கும் வாய்ப்பு அதிகம் (அண்டவிடுப்பு)';
        case 'luteal':
          return 'மாதவிடாய்க்கு முந்தைய நிலை';
        default:
          return 'கருமுட்டை வளர்ச்சி நிலை';
      }
    }
    switch (phase) {
      case 'menstrual':
        return 'Low chance of getting pregnant';
      case 'ovulatory':
        return 'High chance of conception';
      case 'luteal':
        return 'Pre-menstrual phase';
      default:
        return 'Follicular phase';
    }
  };

  const phaseTitle = () => {
    if (language === 'ta') {
      return phase === 'menstrual' ? 'மாதவிடாய் நிலை' : phase === 'ovulatory' ? 'அண்டவிடுப்பு' : 'சுழற்சி நிலை';
    }
    return phase === 'menstrual' ? 'Menstrual' : phase === 'ovulatory' ? 'Ovulation' : 'Follicular';
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-3 select-none">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          <defs>
            {/* Vivid pink gradient for menstrual arc */}
            <linearGradient id="menstrualGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF7A9A" />
              <stop offset="100%" stopColor="#FF4772" />
            </linearGradient>

            {/* Subtle drop shadow for inner circle */}
            <filter id="dialShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#B6AEDF" floodOpacity="0.25" />
            </filter>

            {/* Circular text path for curved 'Menstrual' label */}
            <path
              id="menstrualTextPath"
              d={describeArc(center, center, radius + 2, 2, periodSpanFraction * 360 - 2)}
              fill="none"
            />
          </defs>

          {/* 1. Background full circle ring track (soft cream/lavender) */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#F5F3FF"
            strokeWidth={strokeWidth}
          />

          {/* 2. Dotted tick marks for all 28 days */}
          {Array.from({ length: cycleLength }).map((_, i) => {
            const angle = (i / cycleLength) * 360;
            const pt = polarToCartesian(center, center, radius + strokeWidth / 2 + 10, angle);
            const isSelected = i + 1 === dayOfCycle;
            return (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 3.5 : 1.5}
                fill={isSelected ? '#FF668A' : '#D1CBEB'}
              />
            );
          })}

          {/* 3. Outer numbers (01, 04, 07, ...) */}
          {displayDays.map((d) => {
            const angle = ((d - 1) / cycleLength) * 360;
            const pt = polarToCartesian(center, center, radius + strokeWidth / 2 + 20, angle);
            const isCurrent = d === dayOfCycle;
            return (
              <text
                key={d}
                x={pt.x}
                y={pt.y + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isCurrent ? '800' : '600'}
                fill={isCurrent ? '#FF668A' : '#77747F'}
                className="font-mono tracking-tighter"
              >
                {d < 10 ? `0${d}` : d}
              </text>
            );
          })}

          {/* 4. Active Menstrual Phase Arc (Pink Curved Segment) */}
          <path
            d={periodArcPath}
            fill="none"
            stroke="url(#menstrualGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* 5. Blood droplet icons inside the menstrual arc */}
          <g>
            {/* Start droplet */}
            {(() => {
              const p1 = polarToCartesian(center, center, radius, 12);
              return (
                <circle cx={p1.x} cy={p1.y} r={7} fill="#FFFFFF" />
              );
            })()}
            {(() => {
              const p1 = polarToCartesian(center, center, radius, 12);
              return (
                <path
                  d={`M${p1.x} ${p1.y - 4} Q${p1.x + 3} ${p1.y} ${p1.x} ${p1.y + 3} Q${p1.x - 3} ${p1.y} ${p1.x} ${p1.y - 4} Z`}
                  fill="#FF4772"
                />
              );
            })()}

            {/* End droplet */}
            {(() => {
              const p2 = polarToCartesian(center, center, radius, (periodLength / cycleLength) * 360 - 12);
              return (
                <circle cx={p2.x} cy={p2.y} r={7} fill="#FFFFFF" />
              );
            })()}
            {(() => {
              const p2 = polarToCartesian(center, center, radius, (periodLength / cycleLength) * 360 - 12);
              return (
                <path
                  d={`M${p2.x} ${p2.y - 4} Q${p2.x + 3} ${p2.y} ${p2.x} ${p2.y + 3} Q${p2.x - 3} ${p2.y} ${p2.x} ${p2.y - 4} Z`}
                  fill="#FF4772"
                />
              );
            })()}
          </g>

          {/* 6. Text along the curved pink arc */}
          <text fill="#FFFFFF" fontSize="9" fontWeight="800" letterSpacing="1.2">
            <textPath href="#menstrualTextPath" startOffset="30%" textAnchor="middle">
              {phaseTitle().toUpperCase()}
            </textPath>
          </text>

          {/* 7. Inner White Circle Surface */}
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 2 - 8}
            fill="#FFFFFF"
            filter="url(#dialShadow)"
          />
        </svg>

        {/* Center Content Overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 cursor-pointer"
          onClick={onLogClick}
          title="Click to log period or symptoms"
        >
          {/* Top droplet badge */}
          <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-1 text-rose-500 shadow-sm">
            <Droplet className="w-4 h-4 fill-current text-rose-500" />
          </div>

          {/* Day count */}
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {language === 'ta' ? `நாள் ${dayOfCycle}` : `Day ${dayOfCycle}`}
          </div>

          {/* Subtitle */}
          <p className="text-[11px] font-semibold text-slate-500 max-w-[130px] leading-tight mt-1">
            {getPhaseSubtitle()}
          </p>

          {/* Non-diagnostic estimate label */}
          <span className="mt-2 text-[9px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            {language === 'ta' ? 'மதிப்பீடு மட்டுமே' : 'Estimated Phase'}
          </span>
        </div>
      </div>

      {/* Reassurance Disclaimer */}
      <div className="mt-2 flex items-center text-[10px] text-slate-400 space-x-1">
        <Info className="w-3 h-3 text-slate-400 flex-shrink-0" />
        <span>{t('common.predictions_disclaimer')}</span>
      </div>
    </div>
  );
}
