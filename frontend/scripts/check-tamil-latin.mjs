/**
 * Verifies tamilToLatin(): no Tamil codepoints may survive, and common
 * phrases must come out with the vowel/cluster quality TTS needs.
 * Run: node scripts/check-tamil-latin.mjs
 */
import { tamilToLatin, containsTamil } from '../src/lib/tamilLatin.js';

// Exact-word checks for common words.
const exact = [
  ['நன்றி', 'nanri'],
  ['மருத்துவர்', 'maruththuvar'],
  ['தமிழ்', 'thamizh'],
  ['சாப்பாடு', 'saappaatu'],
  ['வணக்கம்', 'vanakkam'],
];

// Sentences that must transliterate cleanly (no exact expectation).
const sentences = [
  'வணக்கம்! 🌸 இன்று உங்கள் உணர்வு எப்படி இருக்கிறது?',
  'மாதவிடாய் தேதி போடலாமா?',
  'இங்க நீங்க எனக்குப் பெயர் வைக்கிறீங்க!',
  'HerCare-க்கு வரவேற்கிறேன்',
];

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error('FAIL:', msg);
};

for (const [input, expected] of exact) {
  const out = tamilToLatin(input);
  if (containsTamil(out)) fail(`Tamil remains in output of "${input}" -> "${out}"`);
  if (out !== expected) fail(`"${input}" -> "${out}", expected "${expected}"`);
}

for (const input of sentences) {
  const out = tamilToLatin(input);
  if (containsTamil(out)) fail(`Tamil remains in output of "${input}" -> "${out}"`);
  if (!out || !out.trim()) fail(`empty output for "${input}"`);
  console.log(`${input}\n  -> ${out}\n`);
}

if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('All tamilLatin checks passed');
