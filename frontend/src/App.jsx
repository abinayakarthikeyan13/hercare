import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import { CycleProvider } from './context/CycleContext';
import { AssistantProvider } from './context/AssistantContext';
import GlobalAssistant from './components/assistant/GlobalAssistant';
import { hasValidAgreement } from './lib/agreement';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import OtpVerifyPage from './pages/OtpVerifyPage';
import PrivacyAgreementPage from './pages/PrivacyAgreementPage';
import LanguageSelectPage from './pages/LanguageSelectPage';
import OnboardingPage from './pages/OnboardingPage';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import AiChatPage from './pages/AiChatPage';
import CyclePage from './pages/CyclePage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/common/ProtectedRoute';

/**
 * Floating assistant for the public/onboarding screens. The four main app
 * routes render their own embedded instance inside the phone canvas instead,
 * so exactly one avatar is visible on every screen (no duplicate UIs).
 */
function AssistantOverlay() {
  const location = useLocation();
  const inAppShell = ['/home', '/ai', '/cycle', '/settings', '/dashboard'].includes(
    location.pathname
  );
  if (inAppShell) return null;
  return <GlobalAssistant />;
}

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }

  // Version-aware consent check: server account record + local device record
  const agreementAccepted = hasValidAgreement(user);

  const onboardingCompleted =
    user?.onboarding_completed ||
    localStorage.getItem('hercare_onboarding_completed') === 'true';

  if (!agreementAccepted) {
    return <Navigate to="/privacy-agreement" replace />;
  }

  if (!onboardingCompleted) {
    return <Navigate to="/language-select" replace />;
  }

  return <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <CycleProvider>
            <BrowserRouter>
              <AssistantProvider>
              <Routes>
                {/* 1. Public Welcome & Authentication */}
                <Route path="/welcome" element={<WelcomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/verify-otp" element={<OtpVerifyPage />} />

                {/* 2. Privacy, CIA & Safety Agreement Gate */}
                <Route
                  path="/privacy-agreement"
                  element={
                    <ProtectedRoute>
                      <PrivacyAgreementPage />
                    </ProtectedRoute>
                  }
                />

                {/* 3. Language Selection */}
                <Route
                  path="/language-select"
                  element={
                    <ProtectedRoute>
                      <LanguageSelectPage />
                    </ProtectedRoute>
                  }
                />

                {/* 4. Interactive AI Onboarding (nickname etc.) */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <OnboardingPage />
                    </ProtectedRoute>
                  }
                />

                {/* 6. Main Application: persistent shell + bottom navigation */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/ai" element={<AiChatPage />} />
                  <Route path="/cycle" element={<CyclePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Legacy path kept so old links keep working */}
                <Route path="/dashboard" element={<Navigate to="/home" replace />} />

                {/* Default Root Redirect enforcing exact flow */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <AssistantOverlay />
              </AssistantProvider>
            </BrowserRouter>
          </CycleProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
