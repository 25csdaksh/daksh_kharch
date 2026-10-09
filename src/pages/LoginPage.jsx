import React, { useState } from 'react';
import { LogIn, Lock, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import './PlaceholderPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('daksh@example.com');
  const [password, setPassword] = useState('••••••••');
  const [notice, setNotice] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setNotice('Authentication Preview: Authentication will be enabled in a future phase with Supabase Auth.');
  };

  return (
    <div className="login-card-container">
      <div className="placeholder-card card">
        <div className="page-header-info" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column' }}>
          <div className="page-header-icon" style={{ margin: '0 auto' }}>
            <LogIn size={24} />
          </div>
          <div>
            <h1 className="page-main-heading">Sign In to PaisaTrack</h1>
            <p className="page-main-subheading">Access your expense ledger and analytics</p>
          </div>
        </div>

        <div className="modal-demo-banner" style={{ marginTop: '1rem', marginBottom: '0' }}>
          <ShieldAlert size={16} />
          <span>
            <strong>UI Placeholder:</strong> Authentication backend is not connected in Phase 1.
          </span>
        </div>

        {notice && (
          <div className="preview-feedback-banner" style={{ marginTop: '0.5rem', marginBottom: '0' }}>
            <Sparkles size={16} className="feedback-icon" />
            <p className="feedback-main">{notice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label className="form-label" htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="form-text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              className="form-text-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary auth-btn">
            Sign In (Preview)
          </button>
        </form>

        <div className="oauth-divider">
          <span>or sign in with</span>
        </div>

        <button
          type="button"
          className="btn btn-outline auth-btn"
          onClick={() => setNotice('Social authentication (Google / GitHub) will be integrated with Supabase.')}
        >
          Continue with Google (Demo)
        </button>
      </div>
    </div>
  );
}
