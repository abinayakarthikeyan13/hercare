import { useState, useEffect, useRef, useCallback } from 'react';
import { tamilToLatin, containsTamil } from '../lib/tamilLatin';

/**
 * Name hints used to prefer female-sounding voices. Real voice catalogs name
 * their female voices explicitly (\"Google UK English Female\", \"Microsoft
 * Heera\", \"Veena\", \"Samantha\", \"Zira\"…), so matching those names is the
 * reliable, offline-safe way to pick a feminine voice on any platform.
 */
const FEMALE_VOICE_HINTS = [
  'female', 'woman', 'zira', 'hazel', 'samantha', 'susan', 'karen', 'moira',
  'tessa', 'fiona', 'victoria', 'serena', 'kate', 'allison', 'ava', 'siri',
  'heera', 'aditi', 'neerja', 'pallavi', 'veena', 'shruti', 'swara', 'keerthi',
  'gopika', 'chloe', 'amelie', 'anna', 'maria', 'luciana', 'priya', 'swathi',
];

/**
 * Picks the best voice for the selected app language:
 * 1. Right language family (ta / en).
 * 2. Preferred locale: ta-IN for Tamil; en-IN, then en-GB, then en-US.
 * 3. Female-voice name hints win ties.
 */
export function pickVoice(voices, language = 'en') {
  if (!voices || voices.length === 0) return null;
  const isTamil = language === 'ta';
  const localePrefs = isTamil ? ['ta-in'] : ['en-in', 'en-gb', 'en-us'];

  const scoreOf = (v) => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const name = (v.name || '').toLowerCase();
    const localeIdx = localePrefs.findIndex((p) => lang.startsWith(p));
    if (localeIdx === -1) return -1; // wrong language family
    let score = (localePrefs.length - localeIdx) * 10;
    if (FEMALE_VOICE_HINTS.some((hint) => name.includes(hint))) score += 5;
    return score;
  };

  let best = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = scoreOf(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  if (best) return best;

  // Fallback: any voice in the right language family, else null
  const family = isTamil ? 'ta' : 'en';
  return voices.find((v) => (v.lang || '').toLowerCase().startsWith(family)) || null;
}

/**
 * Long replies are split into sentence-sized chunks before speaking:
 * Chrome/Edge silently kill a single utterance after ~15 seconds, which made
 * longer answers stop mid-sentence. Chunking keeps every word audible.
 */
const SPEECH_CHUNK_MAX = 180;
function splitForSpeech(text) {
  const sentences = (text || '')
    .split(/(?<=[.?!।])\s+|\n+/u)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';
  for (const sentence of sentences) {
    if (sentence.length > SPEECH_CHUNK_MAX) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      let rest = sentence;
      while (rest.length > SPEECH_CHUNK_MAX) {
        let cut = rest.lastIndexOf(' ', SPEECH_CHUNK_MAX);
        if (cut < 40) cut = SPEECH_CHUNK_MAX;
        chunks.push(rest.slice(0, cut).trim());
        rest = rest.slice(cut).trim();
      }
      if (rest) chunks.push(rest);
      continue;
    }
    const joined = current ? `${current} ${sentence}` : sentence;
    if (joined.length > SPEECH_CHUNK_MAX) {
      chunks.push(current);
      current = sentence;
    } else {
      current = joined;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text];
}

export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voices, setVoices] = useState([]);
  const [lastVoice, setLastVoice] = useState(null); // voice used for the last utterance
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const speakTokenRef = useRef(0); // invalidates queued chunk chains on stop/mute/new speak

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available speech synthesis voices
  useEffect(() => {
    if (!synthRef.current) return;

    const updateVoices = () => {
      const available = synthRef.current.getVoices();
      setVoices(available);
    };

    updateVoices();
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = updateVoices;
    }
  }, []);

  // Clean markdown asterisks and bullet points for smooth voice reading
  const cleanTextForSpeech = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/•/g, '')
      .replace(/🚨/g, 'Alert: ')
      .replace(/💡/g, 'Note: ')
      .replace(/🌸/g, '')
      .trim();
  };

  const speak = useCallback(
    (text, language = 'en') => {
      if (!synthRef.current || isMuted || !text) return;

      // Cancel any ongoing speech and invalidate any queued chunks
      synthRef.current.cancel();
      const token = ++speakTokenRef.current;

      const cleanText = cleanTextForSpeech(text);

      // Re-read the live voice catalog (it can arrive late via
      // onvoiceschanged) and fall back to the cached list.
      const liveVoices = synthRef.current.getVoices();
      const pool = liveVoices && liveVoices.length > 0 ? liveVoices : voices;

      let voice = null;
      let spokenText = cleanText;
      let rate = 0.95;

      if (language === 'ta') {
        // 1) A real Tamil voice exists → speak the original Tamil script.
        // 2) None on this device → transliterate to phonetic Latin and read
        //    it through an English voice so Tamil is NEVER silent.
        voice = pickVoice(pool, 'ta');
        if (voice) {
          rate = 0.92;
        } else {
          voice = pickVoice(pool, 'en');
          if (!voice) return; // device genuinely has no usable voice
          if (containsTamil(cleanText)) spokenText = tamilToLatin(cleanText);
          rate = 0.88; // a touch slower: clearer phonetic pronunciation
        }
      } else {
        voice = pickVoice(pool, 'en');
        if (voice && containsTamil(cleanText)) {
          // Occasionally Tamil strings arrive under the English locale.
          spokenText = tamilToLatin(cleanText);
        }
      }

      setLastVoice(voice ? { name: voice.name, lang: voice.lang } : null);

      const utteranceLang = voice?.lang || (language === 'ta' ? 'ta-IN' : 'en-IN');
      const chunks = splitForSpeech(spokenText);

      // Speak chunks back-to-back; each onend advances the chain.
      const speakChunk = (index) => {
        if (speakTokenRef.current !== token) return; // stopped/superseded
        if (index >= chunks.length) {
          setIsSpeaking(false);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        if (voice) utterance.voice = voice;
        utterance.lang = utteranceLang;
        utterance.rate = rate;
        utterance.pitch = 1.08; // slightly higher, feminine cadence
        utterance.onstart = () => {
          if (speakTokenRef.current === token) setIsSpeaking(true);
        };
        utterance.onend = () => speakChunk(index + 1);
        utterance.onerror = () => {
          if (speakTokenRef.current === token) setIsSpeaking(false);
        };
        synthRef.current.speak(utterance);
      };
      speakChunk(0);
    },
    [voices, isMuted]
  );

  const stop = useCallback(() => {
    if (!synthRef.current) return;
    speakTokenRef.current += 1; // kill any queued chunks
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  /**
   * Honest capability check: true only when this device can actually voice
   * the language. Tamil counts as speakable through an English voice via
   * phonetic transliteration, so a missing ta-IN voice pack no longer mutes
   * her. When false, callers should NOT claim speech was played — they show
   * the caption text instead.
   */
  const hasVoiceFor = useCallback(
    (lang = 'en') => {
      const pool = (synthRef.current && synthRef.current.getVoices()) || voices;
      if (lang === 'ta') {
        return Boolean(pickVoice(pool, 'ta') || pickVoice(pool, 'en'));
      }
      return Boolean(pickVoice(pool, lang));
    },
    [voices]
  );

  /**
   * Bounded wait for the async voice catalog: browsers like Chrome populate
   * getVoices() only after load. Resolves true once a voice for the language
   * exists, false after the timeout — so callers never claim speech that
   * cannot happen, but a still-loading catalog does not mute real speech.
   */
  const waitForVoice = useCallback(
    (lang = 'en', timeoutMs = 2000) =>
      new Promise((resolve) => {
        if (hasVoiceFor(lang)) return resolve(true);
        if (!synthRef.current) return resolve(false);
        let done = false;
        const finish = (ok) => {
          if (done) return;
          done = true;
          synthRef.current.removeEventListener('voiceschanged', check);
          clearTimeout(timer);
          resolve(ok);
        };
        const check = () => {
          if (hasVoiceFor(lang)) finish(true);
        };
        synthRef.current.addEventListener('voiceschanged', check);
        const timer = setTimeout(() => finish(hasVoiceFor(lang)), timeoutMs);
        synthRef.current.getVoices(); // nudge the engine to load voices
      }),
    [hasVoiceFor]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev && synthRef.current) {
        speakTokenRef.current += 1; // kill any queued chunks
        synthRef.current.cancel();
        setIsSpeaking(false);
      }
      return !prev;
    });
  }, []);

  return {
    isSpeaking,
    isMuted,
    isSupported,
    speak,
    stop,
    toggleMute,
    lastVoice, // {name, lang} of the voice used most recently (for captions/UI)
    hasVoiceFor, // (language) => bool: can this device voice that language?
    waitForVoice, // async: resolves once the voice catalog is ready (or fails)
  };
}
