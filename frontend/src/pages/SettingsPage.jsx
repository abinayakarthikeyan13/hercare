import React from 'react';
import ProfileSettingsScreen from '../components/preferences/ProfileSettingsScreen';

/**
 * Settings screen: language, theme, voice, profile, cycle preferences,
 * privacy agreement review, storage explanation, cloud sync toggle,
 * Export My Data, Delete My Data and Sign Out.
 */
export default function SettingsPage() {
  return (
    <div className="flex-1 w-full h-full overflow-hidden animate-fadeIn">
      <ProfileSettingsScreen />
    </div>
  );
}
