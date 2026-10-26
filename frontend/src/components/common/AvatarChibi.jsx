import React from 'react';

/**
 * Cute Chibi Female Avatar Component
 * Recreates the cute pink-haired anime/chibi wellness companion style from the design reference.
 * Pure vector SVG: scales crisply, loads offline instantly, zero external image assets required.
 */
export default function AvatarChibi({
  expression = 'happy',
  size = 56,
  className = '',
  withBackground = false,
  bgColor = '#FFE4CC'
}) {
  // Eye & mouth variants based on mood / symptom expression
  const renderFace = () => {
    switch (expression) {
      case 'calm':
        return (
          <>
            {/* Gentle curved closed calm eyes */}
            <path d="M22 36 Q26 33 30 36" stroke="#24232B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M34 36 Q38 33 42 36" stroke="#24232B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Small smile */}
            <path d="M30 43 Q32 45 34 43" stroke="#24232B" strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        );
      case 'anxious':
        return (
          <>
            {/* Wide anxious eyes with jitter */}
            <circle cx="26" cy="35" r="3.5" fill="#24232B" />
            <circle cx="38" cy="35" r="3.5" fill="#24232B" />
            <circle cx="27.5" cy="34" r="1.2" fill="#FFFFFF" />
            <circle cx="39.5" cy="34" r="1.2" fill="#FFFFFF" />
            {/* Wavy mouth */}
            <path d="M28 44 Q30 42 32 44 T36 44" stroke="#24232B" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Sweat drop */}
            <path d="M43 30 Q44 27 45 30 A1.5 1.5 0 0 1 43 30" fill="#60A5FA" />
          </>
        );
      case 'depressed':
      case 'sad':
        return (
          <>
            {/* Sad downward eyebrows & drooping eyes */}
            <path d="M22 32 L28 34" stroke="#24232B" strokeWidth="2" strokeLinecap="round" />
            <path d="M42 32 L36 34" stroke="#24232B" strokeWidth="2" strokeLinecap="round" />
            <circle cx="26" cy="36" r="3" fill="#24232B" />
            <circle cx="38" cy="36" r="3" fill="#24232B" />
            {/* Inverted sad frown */}
            <path d="M29 45 Q32 42 35 45" stroke="#24232B" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Tear */}
            <circle cx="23" cy="41" r="1.5" fill="#93C5FD" />
          </>
        );
      case 'sleepy':
        return (
          <>
            {/* Closed straight horizontal eyes with lash */}
            <line x1="22" y1="36" x2="29" y2="36" stroke="#24232B" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="35" y1="36" x2="42" y2="36" stroke="#24232B" strokeWidth="2.5" strokeLinecap="round" />
            {/* Small open yawn mouth */}
            <ellipse cx="32" cy="43" rx="2" ry="3" fill="#FF859F" />
            {/* Zzz text */}
            <text x="44" y="24" fontSize="8" fontWeight="bold" fill="#B6AEDF">Z</text>
            <text x="49" y="19" fontSize="6" fontWeight="bold" fill="#B6AEDF">z</text>
          </>
        );
      case 'confused':
        return (
          <>
            <circle cx="26" cy="35" r="3.5" fill="#24232B" />
            <path d="M35 36 Q38 33 41 36" stroke="#24232B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="27" cy="34" r="1.2" fill="#FFFFFF" />
            {/* Slanted mouth */}
            <line x1="29" y1="44" x2="35" y2="42" stroke="#24232B" strokeWidth="2" strokeLinecap="round" />
          </>
        );
      case 'cramps':
      case 'headache':
        return (
          <>
            {/* Squeezed shut hurt eyes: > < */}
            <path d="M23 33 L28 36 L23 39" stroke="#24232B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M41 33 L36 36 L41 39" stroke="#24232B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Wavy uncomfortable mouth */}
            <path d="M29 44 Q32 41 35 44" stroke="#24232B" strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        );
      case 'happy':
      default:
        return (
          <>
            {/* Big sparkly anime eyes */}
            <circle cx="25" cy="35" r="4.2" fill="#24232B" />
            <circle cx="39" cy="35" r="4.2" fill="#24232B" />
            {/* Eye sparkles */}
            <circle cx="26.8" cy="33.8" r="1.6" fill="#FFFFFF" />
            <circle cx="40.8" cy="33.8" r="1.6" fill="#FFFFFF" />
            <circle cx="24.2" cy="36.8" r="0.8" fill="#FFFFFF" />
            <circle cx="38.2" cy="36.8" r="0.8" fill="#FFFFFF" />
            {/* Cute open happy smile */}
            <path d="M28.5 42 Q32 47 35.5 42" stroke="#24232B" strokeWidth="2" strokeLinecap="round" fill="#FF859F" />
          </>
        );
    }
  };

  const svgContent = (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`overflow-visible inline-block select-none ${className}`}
    >
      <defs>
        {/* Soft pink hair gradient */}
        <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA6B9" />
          <stop offset="100%" stopColor="#FF7597" />
        </linearGradient>
        {/* Skin gradient */}
        <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF2EA" />
          <stop offset="100%" stopColor="#FFE5D9" />
        </linearGradient>
      </defs>

      {/* Back Hair & Twin Buns */}
      <circle cx="16" cy="22" r="10" fill="url(#hairGrad)" />
      <circle cx="48" cy="22" r="10" fill="url(#hairGrad)" />

      {/* Bun Ribbons (Cream / Peach) */}
      <ellipse cx="20" cy="25" rx="3.5" ry="2" fill="#FFE4CC" transform="rotate(-20 20 25)" />
      <ellipse cx="44" cy="25" rx="3.5" ry="2" fill="#FFE4CC" transform="rotate(20 44 25)" />

      {/* Body / Shoulders */}
      <path d="M20 54 Q32 50 44 54 L46 62 Q32 64 18 62 Z" fill="#FFE4EC" />
      <path d="M28 52 Q32 55 36 52" stroke="#FF668A" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Head / Face */}
      <circle cx="32" cy="37" r="17" fill="url(#skinGrad)" />

      {/* Front Bangs */}
      <path
        d="M17 32 Q23 20 32 20 Q41 20 47 32 Q43 27 38 28 Q32 24 26 28 Q21 27 17 32 Z"
        fill="url(#hairGrad)"
      />

      {/* Hair Accessory (Flower or Bow) */}
      <circle cx="43" cy="23" r="3.5" fill="#FFFFFF" />
      <circle cx="43" cy="23" r="1.5" fill="#FF668A" />

      {/* Blush Cheeks */}
      <ellipse cx="20" cy="40" rx="3" ry="1.8" fill="#FF859F" opacity="0.6" />
      <ellipse cx="44" cy="40" rx="3" ry="1.8" fill="#FF859F" opacity="0.6" />

      {/* Expression Face */}
      {renderFace()}
    </svg>
  );

  if (withBackground) {
    return (
      <div
        className="rounded-2xl flex items-center justify-center p-1.5 shadow-sm transition transform hover:scale-105"
        style={{ backgroundColor: bgColor, width: size + 16, height: size + 16 }}
      >
        {svgContent}
      </div>
    );
  }

  return svgContent;
}
