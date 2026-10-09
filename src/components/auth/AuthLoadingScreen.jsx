import React from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import './AuthLoadingScreen.css';

export default function AuthLoadingScreen({ message = 'Verifying authentication session...' }) {
  return (
    <div className="auth-loading-screen" role="status" aria-live="polite">
      <div className="auth-loading-card">
        <div className="auth-loading-icon-wrap">
          <Wallet size={28} className="auth-loading-brand-icon" />
          <Loader2 size={44} className="auth-loading-spinner" />
        </div>
        <h2 className="auth-loading-title">PaisaTrack</h2>
        <p className="auth-loading-text">{message}</p>
      </div>
    </div>
  );
}
