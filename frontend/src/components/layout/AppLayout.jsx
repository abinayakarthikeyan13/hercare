import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { getLocalPreference } from '../../lib/db';
import BottomNav from './BottomNav';
import GlobalAssistant from '../assistant/GlobalAssistant';
import { Globe2, Sun, Moon } from 'lucide-react';

/**
 * Persistent app shell for the four main screens.
 *
 * - Renders the mobile "phone canvas" so the app never scrolls the document.
 * - Shows the compact brand/status header on Home only (other tabs have their
 *   own in-screen headers, matching the original design).
 * - Bottom navigation is always visible here; authentication and onboarding
 *   screens live outside this layout and therefore show no navigation bar.
 * - Respects safe-area insets at the top and bottom.
 */
export default function AppLayout() {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
  const { user } = useAuth();

  const [userName, setUserName] = useState('');

  const isHome = location.pathname === '/home';

  // Preferred-name greeting from local profile
  useEffect(() => {
    let cancelled = false;
    async function fetchIdentity() {
      const storedName = await getLocalPreference('nickname', null);
      if (!cancelled && storedName) setUserName(storedName);

      const prof = await getLocalPreference('user_profile', null);
      if (!cancelled && prof?.nickname) setUserName(prof.nickname);

      if (!cancelled && !storedName && !prof?.nickname && user?.preferred_name) {
        setUserName(user.preferred_name);
      }
    }
    fetchIdentity();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex items-center justify-center p-0 sm:p-4 overflow-hidden bg-[#EFEBF9] dark:bg-slate-950 select-none">
      {/* Phone Mockup / Mobile Canvas Container */}
      <div className="bg-[#FAF7FD] dark:bg-slate-950 max-w-md w-full h-[100dvh] sm:h-[96dvh] sm:max-h-[820px] sm:rounded-[36px] shadow-2xl border-0 sm:border border-purple-100 dark:border-slate-800 flex flex-col overflow-hidden relative text-slate-800 dark:text-slate-100">
        {/* TOP STATUS APP BAR (Home screen only) */}
        {isHome && (
          <header className="px-5 pt-safe pt-3 pb-2 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur z-20 border-b border-purple-50 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {t('app_name')}
                </span>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-[#FF668A] dark:bg-rose-950/60 dark:text-rose-300">
                  AI
                </span>
              </div>
              <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                {t('dashboard.greeting')}, {userName || (language === 'ta' ? 'தோழி' : 'Friend')} 🌸
              </p>
            </div>

            {/* Quick Actions: Language & Theme Toggles */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setLanguage(language === 'ta' ? 'en' : 'ta')}
                className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/60 flex items-center space-x-1 transition"
                title={language === 'ta' ? 'Switch to English' : 'தமிழுக்கு மாறு'}
                aria-label={language === 'ta' ? 'Switch to English' : 'Switch to Tamil'}
              >
                <Globe2 className="w-3 h-3" />
                <span>{language === 'ta' ? 'EN' : 'தமிழ்'}</span>
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-purple-100 dark:border-slate-700 transition"
                title="Toggle Theme"
                aria-label="Toggle light or dark theme"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              </button>
            </div>
          </header>
        )}

        {/* MAIN BODY VIEWPORT (One Screen at a Time, Zero Document Scrolling) */}
        <main className="flex-1 w-full overflow-hidden flex flex-col relative min-h-0">
          <Outlet />
        </main>

        {/* FIXED BOTTOM NAVIGATION BAR (Main Application Screens) */}
        <BottomNav />

        {/* App-wide context-aware assistant (floating avatar + panel) */}
        <GlobalAssistant embedded />
      </div>
    </div>
  );
}
