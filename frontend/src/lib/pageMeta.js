/**
 * Static page metadata for the context-aware HerCare assistant.
 *
 * One entry per React route: what the page is called, why it exists, which
 * real sections/labels are visible, and which registered action ids the
 * assistant may advertise here. Pages can extend this at runtime with
 * usePageContext() for dynamic state (e.g. "today's check-in is saved").
 *
 * Every string exists in both English and Tamil so the AI receives context
 * in the user's selected language. Nothing sensitive ever lives here.
 */

const META = {
  '/welcome': {
    en: {
      pageName: 'Welcome',
      purpose: 'Entry point of HerCare: start the guided setup or sign in to an existing account.',
      sections: ['HerCare logo and tagline', 'Get Started button', 'Login / Sign In option'],
      actionIds: ['go_login'],
      greeting: 'Hello! 🌸 Welcome to HerCare. Shall we start the setup together, or do you have any questions first?',
    },
    ta: {
      pageName: 'வரவேற்பு',
      purpose: 'ஹெர்கேரின் தொடக்கப் பக்கம்: புதிய அமைவுப்பதிவைத் தொடங்கவும் அல்லது உள்ளே நுழையவும்.',
      sections: ['ஹெர்கேர் லோகோ மற்றும் சுழற்சிக் குறிக்கோள்', 'தொடங்கு பொத்தான்', 'உள்நுழைவு விருப்பம்'],
      actionIds: ['go_login'],
      greeting: 'வணக்கம்! 🌸 ஹெர்கேருக்கு வரவேற்கிறேன். அமைவை ஒன்றாகத் தொடங்கலாமா, அல்லது முதலில் ஏதேனும் கேள்வி இருக்கிறதா?',
    },
  },

  '/login': {
    en: {
      pageName: 'Login',
      purpose: 'Sign in with an email and password, or use the phone number with the demo OTP option; new users can create an account here.',
      sections: [
        'Email or phone number field',
        'Password field with visibility toggle',
        'Sign In button',
        'Create account option',
        'Phone OTP (demo) option',
      ],
      actionIds: [],
      greeting: 'Need help signing in? I can explain the email & password and the demo OTP options — just ask.',
    },
    ta: {
      pageName: 'உள்நுழைவு',
      purpose: 'மின்னஞ்சல் மற்றும் கடவுச்சொல்லில் உள்ளே நுழையவும், அல்லது டெமோ OTP விருப்பத்துடன் தொலைபேசி எண்ணைப் பயன்படுத்தவும்; புதிய பயனர்கள் இங்கே கணக்கு உருவாக்கலாம்.',
      sections: [
        'மின்னஞ்சல் அல்லது தொலைபேசி எண் புலம்',
        'கடவுச்சொல் புலம் — காண்பிக்க/மறைக்க மாற்று பொத்தான்',
        'உள்நுழைவு பொத்தான்',
        'கணக்கு உருவாக்கும் விருப்பம்',
        'தொலைபேசி OTP (டெமோ) விருப்பம்',
      ],
      actionIds: [],
      greeting: 'உள்நுழைவதில் உதவி வேண்டுமா? மின்னஞ்சல் & கடவுச்சொல் மற்றும் டெமோ OTP விருப்பங்களை விளக்குகிறேன் — கேளுங்கள்.',
    },
  },

  '/verify-otp': {
    en: {
      pageName: 'OTP Verification',
      purpose: 'Enter the six-digit demo OTP. Codes expire after five minutes with a maximum of three wrong attempts.',
      sections: ['Six-digit OTP input', 'Verify button', 'Resend / change number option'],
      actionIds: [],
      greeting: 'Your 6-digit demo OTP is valid for 5 minutes with a maximum of 3 attempts. Need anything explained while you enter it?',
    },
    ta: {
      pageName: 'OTP சரிபார்ப்பு',
      purpose: 'டெமோ OTP-ஐ நுழைக்கவும். குறியீடுகள் ஐந்து நிமிடங்களில் காலாவதியாகும்; மூன்று தவறான முயற்சிகள் மட்டுமே.',
      sections: ['ஆறு இலக்க OTP புலம்', 'சரிபார்க்கும் பொத்தான்', 'மீண்டும் அனுப்ப / எண் மாற்றும் விருப்பம்'],
      actionIds: [],
      greeting: 'உங்கள் ஆறு இலக்க டெமோ OTP ஐந்து நிமிடங்கள் செல்லுபடியாகும்; மூன்று முயற்சிகள் மட்டும். நுழைக்கும்போது ஏதேனும் விளக்க வேண்டுமா?',
    },
  },

  '/privacy-agreement': {
    en: {
      pageName: 'Terms, Privacy and Safety Agreement',
      purpose: 'Read the confidentiality, integrity and availability explanations, then tick the required agreement checkbox — Continue stays disabled until it is checked.',
      sections: [
        'Confidentiality (C) explanation',
        'Integrity (I) explanation',
        'Availability (A) explanation',
        'Local storage and cloud sync notes',
        'Required agreement checkbox',
        'Continue button',
      ],
      actionIds: [],
      greeting: 'This page explains how your data is protected. Want me to walk you through Confidentiality, Integrity and Availability?',
    },
    ta: {
      pageName: 'விதிமுறைகள், தனியுரிமை மற்றும் பாதுகாப்பு ஒப்பந்தம்',
      purpose: 'ரகசியத்தன்மை, ஒருமைப்பாடு மற்றும் கிடைக்கும்தன்மை விளக்கங்களைப் படித்து, தேவையான ஒப்பந்த பெட்டியைக் குறிக்கவும் — குறிக்கும் வரை தொடரவும் முடியாது.',
      sections: [
        'ரகசியத்தன்மை (C) விளக்கம்',
        'ஒருமைப்பாடு (I) விளக்கம்',
        'கிடைக்கும்தன்மை (A) விளக்கம்',
        'உள்ளூர் சேமிப்பு மற்றும் மேகக்கணி ஒத்திசைவு குறிப்புகள்',
        'தேவையான ஒப்பந்த பெட்டி',
        'தொடரவும் பொத்தான்',
      ],
      actionIds: [],
      greeting: 'உங்கள் தரவு எப்படி பாதுகாக்கப்படுகிறது என்பதை இந்தப் பக்கம் விளக்குகிறது. ரகசியத்தன்மை, ஒருமைப்பாடு, கிடைக்கும்தன்மையை விளக்கட்டுமா?',
    },
  },

  '/language-select': {
    en: {
      pageName: 'Language Selection',
      purpose: 'Choose the app language — English or Tamil — for every screen, including the assistant and spoken captions.',
      sections: ['English option', 'தமிழ் option', 'Continue button'],
      actionIds: ['change_language'],
      greeting: 'Would you like to use English or தமிழ்? I can switch the app language for you right away.',
    },
    ta: {
      pageName: 'மொழித் தேர்வு',
      purpose: 'செயலியின் மொழியைத் தேர்ந்தெடுக்கவும் — ஆங்கிலம் அல்லது தமிழ் — அனைத்துத் திரைகள், உதவியாளர் மற்றும் பேச்சு வரிகளுக்கும்.',
      sections: ['ஆங்கிலம் விருப்பம்', 'தமிழ் விருப்பம்', 'தொடரவும் பொத்தான்'],
      actionIds: ['change_language'],
      greeting: 'நீங்கள் English-ஆ தமிழிலா பயன்படுத்த விரும்புகிறீர்கள்? செயலி மொழியை இப்போதே மாற்றி விடுகிறேன்.',
    },
  },

  '/onboarding': {
    en: {
      pageName: 'Companion Onboarding',
      purpose: 'Set your preferred name and the nickname you want the HerCare AI companion to use; the nickname is remembered on every page.',
      sections: ['Preferred name field', 'AI companion nickname field', 'Interactive greeting preview', 'Next button'],
      actionIds: [],
      greeting: 'This is where you choose my name! 🌸 What nickname would you like me to use?',
    },
    ta: {
      pageName: 'துணை அறிமுக அமைவு',
      purpose: 'உங்கள் விரும்பிய பெயரையும், HerCare AI துணை பயன்படுத்த வேண்டிய செல்லப்பெயரையும் அமைக்கவும்; செல்லப்பெயர் ஒவ்வொரு பக்கத்திலும் நினைவில் வைக்கப்படும்.',
      sections: ['விரும்பிய பெயர் புலம்', 'AI துணை செல்லப்பெயர் புலம்', 'வரவேற்பு முன்னோட்டம்', 'அடுத்து பொத்தான்'],
      actionIds: [],
      greeting: 'இங்கே நீங்கள் எனக்குப் பெயர் வைக்கிறீர்கள்! 🌸 என்னை என்ன செல்லப்பெயரால் அழைக்க விரும்புகிறீர்கள்?',
    },
  },

  '/home': {
    en: {
      pageName: 'Home Dashboard',
      purpose: 'Your daily overview: talk to the avatar, see cycle status, log today\'s check-in and read wellness guidance.',
      sections: [
        'Tagline: Your health. Your language. Your data. Your control.',
        'HerCare AI avatar (tap to talk)',
        'Quick ask box',
        'Cycle Overview card',
        'Daily Mood & Symptom Check-in card',
        'Daily Wellness Guidance',
        'Privacy badge',
      ],
      actionIds: ['open_dial', 'open_check_in', 'go_ai'],
      greeting: 'Hello! 🌸 How are you feeling today? I can help you log your mood, check your cycle, or just listen.',
    },
    ta: {
      pageName: 'முகப்பு டாஷ்போர்டு',
      purpose: 'உங்கள் தினசரி மொத்த காட்சி: அவதாரத்துடன் பேசுங்கள், சுழற்சி நிலையைப் பாருங்கள், இன்றைய செக்-இனைப் பதிவு செய்யுங்கள், நல்வாழ்வு வழிகாட்டியைப் படியுங்கள்.',
      sections: [
        'குறிக்கோள்: உங்கள் ஆரோக்கியம். உங்கள் மொழி. உங்கள் தரவு. உங்கள் கட்டுப்பாடு.',
        'HerCare AI அவதாரம் (பேச தட்டவும்)',
        'விரைவுக் கேள்வி பெட்டி',
        'சுழற்சி காட்சி அட்டை',
        'தினசரி மனநிலை & அறிகுறி செக்-இன் அட்டை',
        'தினசரி நல்வாழ்வு வழிகாட்டல்',
        'தனியுரிமை பதிவு',
      ],
      actionIds: ['open_dial', 'open_check_in', 'go_ai'],
      greeting: 'வணக்கம்! 🌸 இன்று உங்கள் உணர்வு எப்படி இருக்கிறது? மனநிலையைப் பதிவு, சுழற்சி பார்வை அல்லது பேசவும் — நான் இருக்கிறேன்.',
    },
  },

  '/ai': {
    en: {
      pageName: 'HerCare AI Conversation',
      purpose: 'Full-screen chat with your companion using text or voice, with replay, mute and clear-history controls.',
      sections: ['Conversation history', 'Quick prompt chips', 'Microphone and text input', 'Mute, Replay and Clear controls'],
      actionIds: [],
    },
    ta: {
      pageName: 'HerCare AI உரையாடல்',
      purpose: 'உங்கள் துணையுடன் முழுத்திரை அரட்டை — உரை அல்லது குரல் — மறுதொடக்கம், ஒலி அணைப்பு, வரலாறு அழிப்பு கட்டுப்பாடுகளுடன்.',
      sections: ['உரையாடல் வரலாறு', 'விரைவுக் கேள்வி தூண்டிகள்', 'மைக் மற்றும் உரை உள்ளீடு', 'ஒலி அணைப்பு, மறுதொடக்கம், வரலாறு அழிப்பு'],
      actionIds: [],
    },
  },

  '/cycle': {
    en: {
      pageName: 'Cycle Tracking',
      purpose: 'Select and confirm your period dates on the rotary dial, adjust cycle and period lengths, and review recent cycle records.',
      sections: [
        'Rotary dial — drag or tap day markers',
        'Adjust panel: start date, cycle length, period length',
        'Confirm & Save Cycle button',
        'Recent History strip with delete',
        'Per-date mood & symptom check-in',
      ],
      actionIds: ['open_check_in', 'go_home'],
      greeting: 'Ready to set your period dates? Drag or tap the rotary dial, or ask me how it works. Shall we log today\u2019s dates?',
    },
    ta: {
      pageName: 'சுழற்சிக் கண்காணிப்பு',
      purpose: 'ரோட்டரி டயலில் உங்கள் மாதவிடாய் தேதிகளைத் தேர்ந்தெடுத்து உறுதிப்படுத்தவும், சுழற்சி மற்றும் போக்கு நீளங்களை மாற்றவும், சமீபத்திய பதிவுகளை மதிப்பாய்வு செய்யவும்.',
      sections: [
        'ரோட்டரி டயல் — இழுக்கவும் அல்லது நாள் குறியீடுகளைத் தட்டவும்',
        'அமைப்பு பேனல்: தொடக்க தேதி, சுழற்சி நீளம், போக்கு நீளம்',
        'சுழற்சியை உறுதிசெய்து சேமி பொத்தான்',
        'சமீபத்திய வரலாறு பட்டி — நீக்கல் உடன்',
        'தேதிவாரி மனநிலை & அறிகுறி செக்-இன்',
      ],
      actionIds: ['open_check_in', 'go_home'],
      greeting: 'மாதவிடாய் தேதிகளை அமைக்கத் தயாரா? ரோட்டரி டயலை இழுக்கவும் அல்லது எப்படி என்று என்னிடம் கேளுங்கள்.',
    },
  },

  '/settings': {
    en: {
      pageName: 'Settings',
      purpose: 'Manage your profile, language, appearance, cycle preferences, privacy agreement and your stored data.',
      sections: [
        'Preferred Name',
        'AI Companion Nickname',
        'App Language (English / தமிழ்)',
        'Appearance',
        'Cycle Calibration sliders',
        'Data Storage & Privacy',
        'PostgreSQL Cloud Backup toggle (OFF by default)',
        'Export My Data (JSON)',
        'Delete My Data',
        'Sign Out',
      ],
      actionIds: ['export_data', 'delete_data', 'sign_out', 'change_language', 'toggle_theme'],
      greeting: 'Anything you\u2019d like to change? Language, appearance, your profile or your data \u2014 just ask me.',
    },
    ta: {
      pageName: 'அமைப்புகள்',
      purpose: 'உங்கள் சுயவிவரம், மொழி, தோற்றம், சுழற்சி விருப்பங்கள், தனியுரிமை ஒப்பந்தம் மற்றும் சேமித்த தரவை நிர்வகிக்கவும்.',
      sections: [
        'விரும்பிய பெயர்',
        'AI துணை செல்லப்பெயர்',
        'செயலி மொழி (English / தமிழ்)',
        'தோற்றம்',
        'சுழற்சி சீரமைப்பு ஸ்லைடர்கள்',
        'தரவு சேமிப்பு & தனியுரிமை',
        'PostgreSQL மேகக்கணி காப்பு மாற்றி (இயல்பாக OFF)',
        'என் தரவை ஏற்றுமதி செய் (JSON)',
        'என் தரவை நீக்கு',
        'வெளியேறு',
      ],
      actionIds: ['export_data', 'delete_data', 'sign_out', 'change_language', 'toggle_theme'],
      greeting: 'ஏதேனும் மாற்ற விரும்புகிறீர்களா? மொழி, தோற்றம், சுயவிவரம் அல்லது தரவு — என்னிடம் கேளுங்கள்.',
    },
  },
};

const FALLBACK = {
  en: {
    pageName: 'HerCare',
    purpose: 'Menstrual wellness companion screen.',
    sections: [],
    actionIds: [],
  },
  ta: {
    pageName: 'ஹெர்கேர்',
    purpose: 'மாதவிடாய் நல்வாழ்வுத் துணைத் திரை.',
    sections: [],
    actionIds: [],
  },
};

/** Returns the static meta for a route in the active language (never null). */
export function getDefaultPageMeta(route, language = 'en') {
  const entry = META[route] || (route === '/dashboard' ? META['/home'] : null);
  const byLang = entry ? entry[language] || entry.en : FALLBACK[language] || FALLBACK.en;
  return {
    pageName: byLang.pageName,
    purpose: byLang.purpose,
    sections: [...byLang.sections],
    actionIds: [...byLang.actionIds],
    greeting: byLang.greeting || null,
  };
}
