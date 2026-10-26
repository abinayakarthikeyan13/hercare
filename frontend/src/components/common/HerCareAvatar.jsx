import React, { useState, useEffect } from 'react';
import AvatarChibi from './AvatarChibi';
import { Mic, Volume2, Sparkles, AlertCircle } from 'lucide-react';

/**
 * Interactive HerCare AI Girl Avatar
 * - States: 'idle', 'listening', 'processing', 'speaking', 'error'
 * - Glowing lavender & pink borders with subtle pulsing animations
 * - Voice wave ripple rings when listening or speaking
 * - Automatic natural blinking mechanism
 * - Gentle breathing scale animation
 */
export default function HerCareAvatar({
  state = 'idle', // 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
  size = 80,
  expression = 'happy',
  showWaves = true,
  onClick,
  className = '',
}) {
  const [isBlinking, setIsBlinking] = useState(false);

  // Automatic natural blinking every 3.5 - 6 seconds
  useEffect(() => {
    if (state === 'speaking' || state === 'processing') return;

    let timeoutId;
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 3000;
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 160);
      }, delay);
    };

    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, [state]);

  // Determine current facial expression
  const effectiveExpression = () => {
    if (isBlinking) return 'calm';
    if (state === 'speaking') return 'happy';
    if (state === 'listening') return 'calm';
    if (state === 'processing') return 'confused';
    if (state === 'error') return 'sad';
    return expression;
  };

  // State colors & glow configurations
  const getGlowStyles = () => {
    switch (state) {
      case 'listening':
        return 'border-rose-400 ring-4 ring-pink-300/50 shadow-lg shadow-pink-500/40 animate-pulse';
      case 'processing':
        return 'border-purple-400 ring-4 ring-purple-300/50 shadow-lg shadow-purple-500/40 animate-spin';
      case 'speaking':
        return 'border-pink-500 ring-4 ring-rose-400/60 shadow-xl shadow-rose-500/50 animate-avatar-glow';
      case 'error':
        return 'border-red-400 ring-4 ring-red-200/50 shadow-md shadow-red-400/30';
      case 'idle':
      default:
        return 'border-pink-300 ring-2 ring-purple-200/60 shadow-md shadow-purple-300/30 animate-avatar-glow';
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case 'listening':
        return <Mic className="w-3.5 h-3.5 text-white animate-bounce" />;
      case 'processing':
        return <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />;
      case 'speaking':
        return <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-white" />;
      default:
        return <Sparkles className="w-3 h-3 text-pink-500" />;
    }
  };

  const badgeBg = () => {
    switch (state) {
      case 'listening':
        return 'bg-gradient-to-r from-rose-500 to-pink-500 text-white';
      case 'processing':
        return 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white';
      case 'speaking':
        return 'bg-gradient-to-r from-pink-500 to-rose-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      default:
        return 'bg-pink-100 border border-pink-200 text-pink-600';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer group ${className}`}
      style={{ width: size + 20, height: size + 20 }}
    >
      {/* Outer Audio Wave Ripples when listening or speaking */}
      {showWaves && (state === 'listening' || state === 'speaking') && (
        <>
          <div
            className="absolute rounded-full border-2 border-pink-400/40 animate-ripple-wave pointer-events-none"
            style={{ width: size + 24, height: size + 24 }}
          />
          <div
            className="absolute rounded-full border-2 border-purple-400/30 animate-ripple-wave pointer-events-none"
            style={{ width: size + 38, height: size + 38, animationDelay: '0.6s' }}
          />
        </>
      )}

      {/* Main Circular Avatar Body with Breathing & Glowing Border */}
      <div
        className={`rounded-full bg-gradient-to-tr from-[#FFE8EE] via-[#FFF5F7] to-[#F3E8FF] flex items-center justify-center border-2 transition-all duration-300 transform group-hover:scale-105 active:scale-95 animate-breathing ${getGlowStyles()}`}
        style={{ width: size, height: size }}
      >
        <AvatarChibi
          expression={effectiveExpression()}
          size={Math.round(size * 0.78)}
        />
      </div>

      {/* Floating State Mini-Badge on bottom right */}
      <div
        className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${badgeBg()}`}
      >
        {getStatusIcon()}
      </div>
    </div>
  );
}
