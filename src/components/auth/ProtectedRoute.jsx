import React, { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLoadingScreen from './AuthLoadingScreen';
import { KeyRound, ArrowRight, Eye } from 'lucide-react';
import './ProtectedRoute.css';

export default function ProtectedRoute() {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();
  const [bypassDemo, setBypassDemo] = useState(false);

  if (loading) {
    return <AuthLoadingScreen message="Checking authenticated session..." />;
  }

  // If Supabase credentials are not yet configured in .env
  if (!isConfigured && !bypassDemo) {
    return (
      <div className="setup-required-container">
        <div className="setup-required-card card">
          <div className="setup-icon-badge">
            <KeyRound size={28} />
          </div>
          <h2 className="setup-title">Supabase Setup Required</h2>
          <p className="setup-description">
            Live authentication requires your Supabase Project URL and Anon/Publishable API Key.
          </p>

          <div className="setup-instructions">
            <span className="step-tag">Configuration Steps:</span>
            <ol className="step-list">
              <li>Copy <code>.env.example</code> to <code>.env</code></li>
              <li>Add your <code>VITE_SUPABASE_URL</code></li>
              <li>Add your <code>VITE_SUPABASE_ANON_KEY</code></li>
              <li>Restart the Vite dev server</li>
            </ol>
          </div>

          <div className="setup-actions">
            <button
              className="btn btn-primary"
              onClick={() => setBypassDemo(true)}
            >
              <Eye size={16} />
              <span>Explore UI in Demo Mode</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If configured and not authenticated, redirect to login
  if (isConfigured && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
