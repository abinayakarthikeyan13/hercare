import React from 'react';
import { Mic, MicOff, Square } from 'lucide-react';

export default function VoiceMicButton({
  isListening,
  onStart,
  onStop,
  disabled = false,
  label = "Tap to speak"
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        {/* Pulsing wave rings when actively listening */}
        {isListening && (
          <>
            <span className="absolute w-16 h-16 rounded-full bg-rose-400/30 animate-ping pointer-events-none" />
            <span className="absolute w-20 h-20 rounded-full bg-rose-500/20 animate-pulse pointer-events-none" />
          </>
        )}

        <button
          type="button"
          onClick={isListening ? onStop : onStart}
          disabled={disabled}
          title={isListening ? "Stop listening" : label}
          className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all transform active:scale-95 shadow-lg ${
            isListening
              ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-rose-500/50 scale-105'
              : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-rose-300/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isListening ? (
            <Square className="w-5 h-5 fill-current animate-pulse text-white" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
      </div>

      <span className={`mt-2 text-xs font-medium tracking-tight ${
        isListening ? 'text-rose-600 font-bold animate-pulse' : 'text-slate-500'
      }`}>
        {isListening ? label : "Tap to Speak"}
      </span>
    </div>
  );
}
