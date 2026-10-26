import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy entry point. The dashboard used to be a single page with internal tab
 * state; it is now four real routes inside the persistent AppLayout shell.
 * This redirect keeps any old bookmark or link working.
 */
export default function DashboardPage() {
  return <Navigate to="/home" replace />;
}
