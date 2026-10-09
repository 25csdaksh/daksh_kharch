import React from 'react';
import { Settings as SettingsIcon, Sliders, Shield, Bell, CheckCircle } from 'lucide-react';
import './PlaceholderPage.css';

export default function SettingsPage() {
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
              Manage personal budget limits, currency formatting, and notification rules
            </p>
          </div>
        </div>

        <span className="badge badge-demo">UI Preview</span>
      </div>

      <div className="placeholder-grid">
        <div className="placeholder-card card">
          <div className="card-section-title">
            <Sliders size={18} className="feature-item-icon" />
            <span>Preferences & Currency</span>
          </div>

          <div className="form-field">
            <label className="form-label">Default Currency Symbol</label>
            <select className="form-select" defaultValue="INR">
              <option value="INR">₹ - Indian Rupee (INR)</option>
              <option value="USD">$ - US Dollar (USD)</option>
              <option value="EUR">€ - Euro (EUR)</option>
              <option value="GBP">£ - British Pound (GBP)</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Monthly Target Budget Limit (₹)</label>
            <input
              type="number"
              className="form-text-input"
              defaultValue={45000}
              placeholder="e.g. 45000"
            />
          </div>

          <div className="settings-toggle-row">
            <div>
              <p className="toggle-title">Weekly Budget Alert</p>
              <p className="toggle-desc">Notify when 80% of weekly limit is reached</p>
            </div>
            <input type="checkbox" defaultChecked />
          </div>
        </div>

        <div className="placeholder-card card">
          <div className="card-section-title">
            <Shield size={18} className="feature-item-icon" />
            <span>Security & Data Persistence (Phase 2)</span>
          </div>

          <p className="page-main-subheading">
            In Phase 2, this section will integrate with Supabase Row-Level Security (RLS), encrypted credential storage, and session token rotation.
          </p>

          <ul className="feature-list">
            <li className="feature-item">
              <CheckCircle size={16} className="feature-item-icon" />
              <span>Multi-device synchronization</span>
            </li>
            <li className="feature-item">
              <CheckCircle size={16} className="feature-item-icon" />
              <span>Two-factor authentication support</span>
            </li>
            <li className="feature-item">
              <CheckCircle size={16} className="feature-item-icon" />
              <span>Zero-knowledge data backups</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
