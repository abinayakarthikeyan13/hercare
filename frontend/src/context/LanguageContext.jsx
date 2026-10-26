import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/translations';
import { saveLocalPreference, getLocalPreference } from '../lib/db';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('hercare_language') || 'en';
  });

  // Sync language with IndexedDB on mount
  useEffect(() => {
    async function loadLang() {
      const stored = await getLocalPreference('language');
      if (stored && (stored === 'en' || stored === 'ta')) {
        setLanguageState(stored);
        localStorage.setItem('hercare_language', stored);
      }
    }
    loadLang();
  }, []);

  const setLanguage = async (newLang) => {
    if (newLang !== 'en' && newLang !== 'ta') return;
    setLanguageState(newLang);
    localStorage.setItem('hercare_language', newLang);
    await saveLocalPreference('language', newLang);
  };

  // Safe translation lookup helper
  const t = (path) => {
    const keys = path.split('.');
    let current = translations[language] || translations.en;

    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to English if key missing
        let fallback = translations.en;
        for (const fbKey of keys) {
          fallback = fallback?.[fbKey];
        }
        return fallback || path;
      }
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
