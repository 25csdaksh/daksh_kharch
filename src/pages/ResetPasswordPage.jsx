import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, Mail, Lock, AlertCircle, CheckCircle2, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import './Auth.css';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { resetPasswordForEmail, updateUserPassword, session, isConfigured } = useAuth();
  const navigate = useNavigate();

  // Detect if user has arrived with an active recovery session (via Supabase recovery link)
  useEffect(() => {
    // Check if current session exists or URL hash contains access_token / type=recovery
    if (session?.user || window.location.hash.includes('type=recovery')) {
      setIsRecoveryFlow(true);
    }
  }, [session]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage('Supabase is not configured. Please set your credentials in .env.');
      return;
    }

    try {
      setIsSubmitting(true);
      await resetPasswordForEmail(email);
      setSuccessMessage('Password recovery instructions have been sent to your email.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateUserPassword(newPassword);
      setSuccessMessage('Your password has been successfully updated. Redirecting to dashboard...');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card card">
        <div className="auth-brand-header">
          <div className="auth-brand-logo">
            <img src="/hisabsetu-logo.png" alt="HisabSetu" />
          </div>
          <h1 className="auth-page-title">
            {isRecoveryFlow ? 'Set New Password' : 'Reset Password'}
          </h1>
          <p className="auth-page-subtitle">
            {isRecoveryFlow
              ? 'Enter and confirm your new secure password'
              : 'Enter your email to receive recovery instructions'}
          </p>
        </div>

        {errorMessage && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-alert auth-alert-success" role="alert">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {isRecoveryFlow ? (
          <form onSubmit={handleUpdatePassword} className="auth-form" noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="new-password">New Password (min 6 chars)</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" aria-hidden="true" />
                <input
                  id="new-password"
                  type="password"
                  required
                  placeholder="Enter new password"
                  className="auth-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="confirm-password">Confirm New Password</label>
              <div className="auth-input-wrapper">
                <Lock size={16} className="auth-input-icon" aria-hidden="true" />
                <input
                  id="confirm-password"
                  type="password"
                  required
                  placeholder="Confirm new password"
                  className="auth-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="auth-form" noValidate>
            <div className="auth-field">
              <label className="auth-label" htmlFor="recovery-email">Email Address</label>
              <div className="auth-input-wrapper">
                <Mail size={16} className="auth-input-icon" aria-hidden="true" />
                <input
                  id="recovery-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting || Boolean(successMessage)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isSubmitting || Boolean(successMessage)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner-icon" />
                  <span>Sending Instructions...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ArrowLeft size={14} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
