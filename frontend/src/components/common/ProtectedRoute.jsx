import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Heart } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-50/50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center animate-bounce shadow-lg shadow-rose-200 mb-4">
          <Heart className="w-6 h-6 fill-current" />
        </div>
        <p className="text-sm font-medium text-slate-600 animate-pulse">{t('common.securing')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
