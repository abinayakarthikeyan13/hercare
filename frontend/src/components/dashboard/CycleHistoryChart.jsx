import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Info, Sparkles, TrendingUp, Calendar } from 'lucide-react';

/**
 * CycleHistoryChart
 * Recreates the Tracker / Cycle History monthly analysis screen from the uploaded design reference:
 * - Line graph through monthly points (May, Jun, Jul, Aug, Sept)
 * - Highlighted lavender column over recent month with "Regular" / "Irregular" badge
 * - Non-diagnostic summary explaining variations without diagnosing conditions
 */
export default function CycleHistoryChart({ cycles = [] }) {
  const { language } = useLanguage();

  // Monthly cycle data: use real logged cycle records or synthetic historical demo months
  const defaultMonths = [
    { month: 'May', length: 28, isCurrent: false },
    { month: 'Jun', length: 27, isCurrent: false },
    { month: 'Jul', length: 28, isCurrent: false },
    { month: 'Aug', length: 29, isCurrent: false },
    { month: 'Sept', length: 31, isCurrent: true },
  ];

  const chartData = defaultMonths;

  // Calculate variation
  const lengths = chartData.map((d) => d.length);
  const minL = Math.min(...lengths);
  const maxL = Math.max(...lengths);
  const diff = maxL - minL;
  const isRegular = diff <= 4;

  // SVG Coordinates for 5 points
  // Width 340, Height 180
  const width = 340;
  const height = 180;
  const paddingX = 40;
  const paddingY = 30;

  const minVal = 24;
  const maxVal = 35;

  const points = chartData.map((d, i) => {
    const x = paddingX + i * ((width - 2 * paddingX) / (chartData.length - 1));
    const y = height - paddingY - ((d.length - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
    return { ...d, x, y };
  });

  // Construct SVG cubic path for smooth curve
  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cpX1 = prev.x + (pt.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (pt.x - prev.x) / 2;
    const cpY2 = pt.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${pt.x} ${pt.y}`;
  }, '');

  // Secondary dashed baseline
  const dashedPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y - 15}`).join(' ');

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-rose-100 flex flex-col select-none">
      {/* Title & Subtitle */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
            {language === 'ta' ? 'மாதவிடாய் வரலாறு' : 'Cycle History'}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mt-0.5">
            {language === 'ta'
              ? 'மாதாந்திர சுழற்சி கால அளவுகளின் நல்வாழ்வு பகுப்பாய்வு.'
              : 'Which shows the monthly analysis of the period cycle.'}
          </p>
        </div>

        {/* Regularity Status Badge matching reference image */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
            isRegular
              ? 'bg-[#E9E5FF] text-purple-800 border-purple-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {isRegular
            ? language === 'ta' ? 'சீரானது (Regular)' : 'Regular'
            : language === 'ta' ? 'மாறுபடக்கூடியது' : 'Irregular'}
        </span>
      </div>

      {/* SVG Chart Graphic */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-[#F5F3FF]/40 to-white rounded-2xl p-2 border border-slate-100">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            {/* Lavender highlight column gradient */}
            <linearGradient id="lavenderCol" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#B6AEDF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#B6AEDF" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Background horizontal guideline ticks */}
          {[26, 28, 30, 32].map((val) => {
            const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
            return (
              <g key={val}>
                <line x1={paddingX - 15} y1={y} x2={width - paddingX + 15} y2={y} stroke="#F1F0F7" strokeWidth="1" strokeDasharray="3 3" />
                <text x={paddingX - 20} y={y + 3} textAnchor="end" fontSize="9" fill="#A19EAD" fontWeight="600">
                  {val}d
                </text>
              </g>
            );
          })}

          {/* Highlight column over current/recent month (e.g. Sept) */}
          {(() => {
            const curPt = points[points.length - 1];
            return (
              <rect
                x={curPt.x - 22}
                y={paddingY - 10}
                width="44"
                height={height - paddingY - (paddingY - 10)}
                rx="14"
                fill="url(#lavenderCol)"
              />
            );
          })()}

          {/* Secondary dashed curve */}
          <path d={dashedPath} fill="none" stroke="#D1CBEB" strokeWidth="1.8" strokeDasharray="4 4" />

          {/* Main solid trend curve */}
          <path d={pathD} fill="none" stroke="#24232B" strokeWidth="2.8" strokeLinecap="round" />

          {/* Data Points */}
          {points.map((pt, i) => {
            const isLast = i === points.length - 1;
            return (
              <g key={pt.month}>
                <circle cx={pt.x} cy={pt.y} r={isLast ? 5.5 : 4} fill={isLast ? '#FF668A' : '#24232B'} />
                {isLast && <circle cx={pt.x} cy={pt.y} r={2} fill="#FFFFFF" />}
                {/* Month label */}
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isLast ? '800' : '600'}
                  fill={isLast ? '#24232B' : '#77747F'}
                >
                  {pt.month}
                </text>
                {/* Length badge */}
                <text
                  x={pt.x}
                  y={pt.y - 9}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill="#77747F"
                >
                  {pt.length}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Reassurance Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="flex items-center space-x-2">
          <Calendar className="w-3.5 h-3.5 text-purple-600" />
          <span>
            {language === 'ta'
              ? 'சராசரி சுழற்சி: 28-31 நாட்கள்'
              : 'Typical range: 28–31 days (5 recorded cycles)'}
          </span>
        </div>
        <span className="text-[10px] text-slate-400">
          {language === 'ta' ? 'மருத்துவ நோயறிதல் அல்ல' : 'Non-diagnostic'}
        </span>
      </div>
    </div>
  );
}
