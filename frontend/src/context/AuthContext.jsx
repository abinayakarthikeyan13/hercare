import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('hercare_token'));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('hercare_user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState(() => sessionStorage.getItem('hercare_pending_phone') || '');
  const [lastDemoOtp, setLastDemoOtp] = useState(() => sessionStorage.getItem('hercare_demo_otp') || '');

  // Verify and fetch latest user profile on mount if token exists
  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('hercare_user', JSON.stringify(res.data));
        } catch (err) {
          console.warn('Session verification failed:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  // Save session on successful authentication
  const handleAuthSuccess = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('hercare_token', accessToken);
    localStorage.setItem('hercare_user', JSON.stringify(userData));
    sessionStorage.removeItem('hercare_pending_phone');
    sessionStorage.removeItem('hercare_demo_otp');
  };

  // 1. Send OTP
  const sendOtp = async (phoneNumber) => {
    const res = await api.post('/auth/send-otp', { phone_number: phoneNumber });
    setPendingPhone(res.data.phone_number);
    sessionStorage.setItem('hercare_pending_phone', res.data.phone_number);
    if (res.data.demo_otp) {
      setLastDemoOtp(res.data.demo_otp);
      sessionStorage.setItem('hercare_demo_otp', res.data.demo_otp);
    }
    return res.data;
  };

  // 2. Verify OTP
  const verifyOtp = async (phoneNumber, otpCode) => {
    const res = await api.post('/auth/verify-otp', {
      phone_number: phoneNumber,
      otp_code: otpCode,
    });
    handleAuthSuccess(res.data.access_token, res.data.user);
    return res.data;
  };

  // 3. Password Login (supports Email or Phone)
  const loginWithPassword = async (identifierOrPayload, maybePassword) => {
    let payload = {};
    if (typeof identifierOrPayload === 'object') {
      payload = identifierOrPayload;
    } else {
      const id = String(identifierOrPayload).trim();
      if (id.includes('@')) {
        payload = { email: id, password: maybePassword };
      } else {
        payload = { phone_number: id, password: maybePassword };
      }
    }
    const res = await api.post('/auth/login-password', payload);
    handleAuthSuccess(res.data.access_token, res.data.user);
    return res.data;
  };

  // 4. Password Registration (supports Email or Phone)
  const registerWithPassword = async (identifierOrPayload, maybePassword, preferredName) => {
    let payload = {};
    if (typeof identifierOrPayload === 'object') {
      payload = identifierOrPayload;
    } else {
      const id = String(identifierOrPayload).trim();
      if (id.includes('@')) {
        payload = { email: id, password: maybePassword, preferred_name: preferredName };
      } else {
        payload = { phone_number: id, password: maybePassword, preferred_name: preferredName };
      }
    }
    const res = await api.post('/auth/register-password', payload);
    handleAuthSuccess(res.data.access_token, res.data.user);
    return res.data;
  };

  // 5. Logout
  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('hercare_token');
      localStorage.removeItem('hercare_user');
      sessionStorage.removeItem('hercare_pending_phone');
      sessionStorage.removeItem('hercare_demo_otp');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token && !!user,
        loading,
        pendingPhone,
        setPendingPhone,
        lastDemoOtp,
        sendOtp,
        verifyOtp,
        loginWithPassword,
        registerWithPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
