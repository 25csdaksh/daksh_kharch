import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wallet, Mail, Lock, User, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import './Auth.css';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp, isConfigured } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (!isConfigured) {
      setErrorMessage('Supabase is not configured. Please set your credentials in .env.');
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await signUp({ email, password, fullName });
      
      // If email confirmation is required by Supabase project settings
      if (data?.user && !data?.session) {
        setSuccessMessage(
          'Account created successfully! Please check your email inbox for a verification link before logging in.'
        );
      } else {
        // If auto-confirm is enabled or session created directly
        navigate('/', { replace: true });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card card">
        <div className="auth-brand-header">
          <div className="auth-brand-logo">
            <img src="/hisabsetu-emblem.png" alt="HisabSetu Emblem" />
          </div>
          <span className="auth-brand-tagline">YOUR MONEY. A SMARTER YOU.</span>
          <h1 className="auth-page-title">Create Account</h1>
          <p className="auth-page-subtitle">Start tracking your personal finances with HisabSetu</p>
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

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-name">Full Name</label>
            <div className="auth-input-wrapper">
              <User size={16} className="auth-input-icon" aria-hidden="true" />
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                placeholder="e.g. Daksh Sharma"
                className="auth-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting || Boolean(successMessage)}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-email">Email Address *</label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" aria-hidden="true" />
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting || Boolean(successMessage)}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-password">Password (min 6 characters) *</label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" aria-hidden="true" />
              <input
                id="signup-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Create a strong password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || Boolean(successMessage)}
              />
            </div>
          </div>

          {!successMessage ? (
            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner-icon" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary auth-submit-btn">
              Proceed to Sign In
            </Link>
          )}
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
