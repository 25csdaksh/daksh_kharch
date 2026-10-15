import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  ShieldCheck,
  User,
  KeyRound,
  LogOut,
  CheckCircle2,
  Save,
  Database,
  Info,
  Sun,
  Moon,
  Palette
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import './PlaceholderPage.css';

export default function SettingsPage() {
  const { user, signOut, isConfigured } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [budgetLimit, setBudgetLimit] = useState(() => {
    return localStorage.getItem('hisabsetu_monthly_budget') || localStorage.getItem('paisatrack_monthly_budget') || '45000';
  });
  const [currencySymbol, setCurrencySymbol] = useState(() => {
    return localStorage.getItem('hisabsetu_currency') || localStorage.getItem('paisatrack_currency') || 'INR';
  });
  const [budgetAlerts, setBudgetAlerts] = useState(() => {
    return localStorage.getItem('hisabsetu_budget_alerts') !== 'false';
  });
  const [saveMessage, setSaveMessage] = useState('');

  const handleSavePreferences = (e) => {
    e.preventDefault();
    localStorage.setItem('hisabsetu_monthly_budget', budgetLimit);
    localStorage.setItem('hisabsetu_currency', currencySymbol);
    localStorage.setItem('hisabsetu_budget_alerts', String(budgetAlerts));
    setSaveMessage('Preferences saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const displayName = user?.user_metadata?.full_name || 'Personal Account';
  const displayEmail = user?.email || 'Authenticated User';

  return (
    <div className="page-container">
      <div className="page-header-card card">
        <div className="page-header-info">
          <div className="page-header-icon">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="page-main-heading">Settings & Preferences</h1>
            <p className="page-main-subheading">
              Manage personal budget limits, account security, and active database connection
            </p>
          </div>
        </div>

        <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <ShieldCheck size={14} /> Production Ready
        </span>
      </div>

      {saveMessage && (
        <div className="auth-alert auth-alert-success" role="alert" style={{ marginBottom: '1.5rem' }}>
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="placeholder-grid">
        {/* Account & Profile Card */}
        <div className="placeholder-card card">
          <div className="card-section-title">
            <User size={18} className="feature-item-icon" />
            <span>Account & Identity</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="form-field">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-text-input"
                value={displayName}
                disabled
              />
            </div>

            <div className="form-field">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-text-input"
                value={displayEmail}
                disabled
              />
            </div>

            <div className="form-field">
              <label className="form-label">User ID (RLS Subject)</label>
              <input
                type="text"
                className="form-text-input"
                value={user?.id || 'Local Development User'}
                disabled
                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.85rem' }}
                onClick={() => navigate('/reset-password')}
              >
                <KeyRound size={15} />
                <span>Reset Password</span>
              </button>

              {user && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', color: 'var(--color-danger)' }}
                  onClick={handleSignOut}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Financial Preferences Card */}
        <form onSubmit={handleSavePreferences} className="placeholder-card card">
          <div className="card-section-title">
            <Sliders size={18} className="feature-item-icon" />
            <span>Preferences & Appearance</span>
          </div>

          <div className="form-field">
            <label className="form-label">Theme / Display Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`theme-toggle-option-btn ${theme === 'light' ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: theme === 'light' ? '2px solid #F5B000' : '1px solid var(--color-border)',
                  backgroundColor: theme === 'light' ? 'rgba(245, 176, 0, 0.1)' : 'var(--color-bg)',
                  color: 'var(--color-heading)',
                  fontWeight: theme === 'light' ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sun size={17} style={{ color: '#F5B000' }} />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`theme-toggle-option-btn ${theme === 'dark' ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: theme === 'dark' ? '2px solid #F5B000' : '1px solid var(--color-border)',
                  backgroundColor: theme === 'dark' ? 'rgba(245, 176, 0, 0.15)' : 'var(--color-bg)',
                  color: 'var(--color-heading)',
                  fontWeight: theme === 'dark' ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Moon size={17} style={{ color: '#38BDF8' }} />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="currency-select">Default Currency</label>
            <select
              id="currency-select"
              className="form-select"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
            >
              <option value="INR">₹ - Indian Rupee (INR)</option>
              <option value="USD">$ - US Dollar (USD)</option>
              <option value="EUR">€ - Euro (EUR)</option>
              <option value="GBP">£ - British Pound (GBP)</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="budget-input">Monthly Target Budget Limit (₹)</label>
            <input
              id="budget-input"
              type="number"
              min="1"
              max="10000000"
              className="form-text-input"
              value={budgetLimit}
              onChange={(e) => setBudgetLimit(e.target.value)}
              placeholder="e.g. 45000"
            />
          </div>

          <div className="settings-toggle-row">
            <div>
              <p className="toggle-title">Weekly Budget Alert</p>
              <p className="toggle-desc">Notify when 80% of weekly limit is reached</p>
            </div>
            <input
              type="checkbox"
              checked={budgetAlerts}
              onChange={(e) => setBudgetAlerts(e.target.checked)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '1rem', alignSelf: 'flex-start' }}
          >
            <Save size={16} />
            <span>Save Preferences</span>
          </button>
        </form>

        {/* Security & RLS Enforcement Card */}
        <div className="placeholder-card card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-section-title">
            <ShieldCheck size={18} className="feature-item-icon" />
            <span>Database Security & Isolation Architecture</span>
          </div>

          <p className="page-main-subheading" style={{ marginBottom: '1rem' }}>
            HisabSetu implements end-to-end security using PostgreSQL Row Level Security (RLS) on Supabase.
          </p>

          <ul className="feature-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            <li className="feature-item">
              <CheckCircle2 size={16} className="feature-item-icon" />
              <span><strong>Row Level Security (RLS):</strong> Strictly verified on all SELECT, INSERT, UPDATE, DELETE</span>
            </li>
            <li className="feature-item">
              <CheckCircle2 size={16} className="feature-item-icon" />
              <span><strong>Zero Cross-Tenant Leakage:</strong> Queries enforce <code>auth.uid() = user_id</code></span>
            </li>
            <li className="feature-item">
              <CheckCircle2 size={16} className="feature-item-icon" />
              <span><strong>CSV Injection Hardened:</strong> Formulas sanitized against spreadsheet execution</span>
            </li>
            <li className="feature-item">
              <CheckCircle2 size={16} className="feature-item-icon" />
              <span><strong>Safe Client Token Storage:</strong> Encrypted browser session with auto-refresh</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
