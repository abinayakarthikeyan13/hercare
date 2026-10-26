import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import HerCareAvatar from '../common/HerCareAvatar';
import { Home, Calendar, Settings } from 'lucide-react';

/**
 * Fixed bottom navigation for the main application screens:
 * Home · HerCare AI · Cycle Tracking · Settings
 *
 * - Active tab is clearly highlighted (colour + filled icon + avatar ring).
 * - Touch-friendly hit areas (>= 44px tall).
 * - Respects the device safe-area inset at the bottom.
 * - Uses real routes so refresh/deep-link/back all work.
 */
export default function BottomNav() {
  const { t } = useLanguage();

  const baseClass =
    'flex-1 min-w-0 py-1 flex flex-col items-center justify-center transition-all';
  const activeClass = 'text-[#FF668A] font-black';
  const inactiveClass =
    'text-slate-400 hover:text-slate-600 dark:text-slate-500 font-bold';

  const renderTab = ({ isActive, to, icon: Icon, label, ariaLabel }) => (
    <NavLink
      to={to}
      className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
      aria-label={ariaLabel || label}
      aria-current={isActive ? 'page' : undefined}
      end={to === '/home'}
    >
      {({ isActive }) => (
        <>
          <div
            className={`p-1 rounded-xl transition ${
              isActive ? 'bg-rose-50 dark:bg-rose-950/60 shadow-xs' : ''
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 truncate px-0.5">{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <nav
      className="h-16 pb-safe bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-purple-100 dark:border-slate-800 flex items-stretch shrink-0 z-30 px-2"
      aria-label="Primary"
    >
      {/* TAB 1: Home */}
      {renderTab({ to: '/home', icon: Home, label: t('nav.home') })}

      {/* TAB 2: HerCare AI (Circular Female Avatar) */}
      <NavLink
        to="/ai"
        className="flex-1 min-w-0 py-1 flex flex-col items-center justify-center relative -top-2 group"
        aria-label={t('nav.ai')}
      >
        {({ isActive }) => (
          <>
            <div
              className={`w-12 h-12 rounded-full p-0.5 flex items-center justify-center transition-all transform group-active:scale-95 ${
                isActive
                  ? 'ring-4 ring-rose-400/50 shadow-lg shadow-rose-500/30 bg-[#FF668A]'
                  : 'ring-2 ring-purple-200 dark:ring-purple-900 bg-white dark:bg-slate-800 shadow-md'
              }`}
            >
              <HerCareAvatar size={40} state="idle" showWaves={false} />
            </div>
            <span
              className={`text-[10px] mt-0.5 font-bold truncate px-0.5 ${
                isActive ? 'text-[#FF668A] font-black' : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {t('nav.ai')}
            </span>
          </>
        )}
      </NavLink>

      {/* TAB 3: Cycle Tracking */}
      {renderTab({ to: '/cycle', icon: Calendar, label: t('nav.cycle') })}

      {/* TAB 4: Settings */}
      {renderTab({
        to: '/settings',
        icon: Settings,
        label: t('nav.settings'),
        ariaLabel: t('nav.settings'),
      })}
    </nav>
  );
}
