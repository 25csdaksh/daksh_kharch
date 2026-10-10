import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, Mail, Lock, AlertCircle, Loader2, ArrowRight, Info, MailCheck } from 'lucide-react';
import './Auth.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendStatus, setResendStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'

  const { signIn, isConfigured, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setEmailNotConfirmed(false);

    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage('Supabase is not configured. Please set your credentials in .env.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signIn({ email, password });
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setEmailNotConfirmed(true);
      } else {
        setErrorMessage(msg || 'Failed to authenticate. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    setResendStatus('sending');
    try {
      await resendConfirmationEmail(email);
      setResendStatus('sent');
    } catch {
      setResendStatus('error');
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card card">
        <div className="auth-brand-header">
          <div className="auth-brand-logo">
            <Wallet size={26} />
          </div>
          <h1 className="auth-page-title">Welcome to PaisaTrack</h1>
          <p className="auth-page-subtitle">Sign in to manage your expense ledger & budgets</p>
        </div>

        {!isConfigured && (
          <div className="auth-alert auth-alert-warning" role="alert">
            <Info size={16} className="flex-shrink-0" />
            <div>
              <strong>Supabase Setup Required:</strong> Live authentication requires <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>.
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {emailNotConfirmed && (
          <div className="auth-alert auth-alert-warning" role="alert" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MailCheck size={16} className="flex-shrink-0" />
              <strong>Email not confirmed</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Please check <strong>{email}</strong> for a confirmation link from Supabase and click it before signing in.
            </p>
            {resendStatus === 'idle' && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                onClick={handleResendConfirmation}
              >
                Resend confirmation email
              </button>
            )}
            {resendStatus === 'sending' && (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                <Loader2 size={14} className="spinner-icon" /> Sending…
              </span>
            )}
            {resendStatus === 'sent' && (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-primary)' }}>
                ✓ Confirmation email sent! Check your inbox.
              </span>
            )}
            {resendStatus === 'error' && (
              <span style={{ fontSize: '0.82rem', color: 'var(--color-danger)' }}>
                Failed to resend. Please try again later.
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="auth-field">
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="login-password">Password</label>
              <Link to="/reset-password" className="auth-link">Forgot password?</Link>
            </div>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" aria-hidden="true" />
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="spinner-icon" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
