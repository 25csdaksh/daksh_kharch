import React from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import './AuthLoadingScreen.css';

export default function AuthLoadingScreen({ message = 'Verifying authentication session...' }) {
  return (
    <div className="auth-loading-screen" role="status" aria-live="polite">
      <div className="auth-loading-card">
        <div className="auth-loading-icon-wrap">
          <img src="/hisabsetu-emblem.png" alt="HisabSetu Emblem" className="auth-loading-logo-img" />
          <Loader2 size={54} className="auth-loading-spinner" />
        </div>
        <h2 className="auth-loading-title">HisabSetu</h2>
        <span className="auth-brand-tagline" style={{ marginBottom: '8px' }}>YOUR MONEY. A SMARTER YOU.</span>
        <p className="auth-loading-text">{message}</p>
      </div>
    </div>
  );
}
