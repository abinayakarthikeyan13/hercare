/**
 * Tamil → phonetic-Latin transliterator used ONLY for text-to-speech.
 *
 * Why: many devices (Windows without a Tamil voice pack, most Linux setups)
 * have no `ta-IN` speech voice, so speaking raw Tamil script either stays
 * silent or comes out as garbage. Pronouncing a phonetic Latin rendering
 * ("vanakkam", "inru eppadi irukkiinga") through an English voice is clear
 * and understandable — which is what the user actually hears.
 *
 * When a real Tamil voice EXISTS the app speaks the original Tamil script
 * directly and this module is not used.
 *
 * Design notes:
 * - Syllable-wise scan: consonant + (vowel sign | pulli | inherent "a").
 * - Long vowels map to doubled letters (aa/ii/uu/ee/oo) so English voices
 *   say them long instead of clipping them short.
 * - "ச" is contextually "ch" before எ/ஏ forms (செல் → "chel"), "s"
 *   elsewhere (சாப்பாடு → "saapaadu", சுகம் → "sugam") — the practical
 *   everyday pronunciation.
 * - Non-Tamil text (Latin, digits, punctuation, emoji, links) passes
 *   through untouched, so mixed sentences survive intact.
 */

// NOTE: every key is a quoted string — Tamil vowel signs are combining
// marks and are NOT valid unquoted JS identifiers.
const VOWELS = {
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ii', 'உ': 'u', 'ஊ': 'uu',
  'எ': 'e', 'ஏ': 'ee', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
  'ஃ': '',
};

// Diacritic signs that follow a consonant (uyirmei modifiers).
const VOWEL_SIGNS = {
  'ா': 'aa', 'ி': 'i', 'ீ': 'ii', 'ு': 'u', 'ூ': 'uu',
  'ெ': 'e', 'ே': 'ee', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au', 'ௗ': 'au',
};

// Consonants; a bare consonant carries the inherent vowel "a".
// Retroflexes fold into their closest English sounds (ண/ன/ற/ள → n/r/l).
const CONSONANTS = {
  'க': 'k', 'ங': 'ng', 'ச': 's', 'ஜ': 'j', 'ஞ': 'nj',
  'ட': 't', 'ண': 'n', 'த': 'th', 'ந': 'n', 'ப': 'p',
  'ம': 'm', 'ய': 'y', 'ர': 'r', 'ல': 'l', 'வ': 'v',
  'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
  'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
};

// Tamil digits → ASCII so an English voice reads them naturally.
const TAMIL_DIGITS = {
  '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4',
  '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9',
};

/** True when the text contains any Tamil-script character. */
export function containsTamil(text) {
  return /[஀-௿]/.test(text || '');
}

/**
 * Transliterates Tamil script to phonetic Latin letters tuned for
 * English-voice pronunciation. Non-Tamil characters pass through unchanged.
 */
export function tamilToLatin(text) {
  if (!text) return '';
  const chars = Array.from(text);
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1] || '';

    const consonant = CONSONANTS[ch];
    if (consonant !== undefined) {
      let base = consonant;
      // Contextual ச: "ch" only before எ/ஏ forms, else "s".
      if (ch === 'ச' && (next === 'ெ' || next === 'ே' || next === 'எ' || next === 'ஏ')) {
        base = 'ch';
      }
      if (next === '்') {
        out += base; // dead consonant (pulli): no vowel
        i++;
      } else if (VOWEL_SIGNS[next] !== undefined) {
        out += base + VOWEL_SIGNS[next];
        i++;
      } else {
        out += base + 'a'; // inherent vowel
      }
      continue;
    }

    const vowel = VOWELS[ch];
    if (vowel !== undefined) {
      out += vowel;
      continue;
    }

    // Rare: a vowel sign with no consonant ahead of it (word starts, typos).
    if (VOWEL_SIGNS[ch] !== undefined) {
      out += VOWEL_SIGNS[ch];
      continue;
    }

    if (TAMIL_DIGITS[ch] !== undefined) {
      out += TAMIL_DIGITS[ch];
      continue;
    }

    if (ch === 'ஂ') {
      out += 'm'; // anusvara
      continue;
    }

    out += ch; // Latin, punctuation, emoji, whitespace — untouched
  }

  return out.replace(/\s+/g, ' ').trim();
}

export default tamilToLatin;
