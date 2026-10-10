import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wallet,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Receipt,
  Download,
  TrendingUp,
  CheckCircle2,
  Lock,
  Sparkles,
  Smartphone,
  Layers,
  ChevronRight,
  Coins
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './CoverPage.css';

export default function CoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="cover-wrapper">
      {/* 1. Top Navbar */}
      <header className="cover-navbar">
        <Link to="/" className="cover-nav-brand">
          <div className="cover-logo-icon">
            <img src="/hisabsetu-logo.png" alt="HisabSetu" className="cover-logo-img" />
          </div>
          <span className="cover-brand-title">
            HisabSetu
            <span className="cover-brand-badge">PRO</span>
          </span>
        </Link>

        <nav className="cover-nav-links" aria-label="Main Cover Links">
          <a href="#features" className="cover-nav-link">Features</a>
          <a href="#how-it-works" className="cover-nav-link">How It Works</a>
          <a href="#security" className="cover-nav-link">Security</a>
        </nav>

        <div className="cover-nav-actions">
          {user ? (
            <button
              className="btn btn-cover-signup"
              onClick={() => navigate('/dashboard')}
            >
              <span>Open Dashboard</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-cover-login">
                Sign In
              </Link>
              <Link to="/signup" className="btn btn-cover-signup">
                <span>Sign Up</span>
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="cover-hero-section">
        <div className="hero-pill-badge">
          <Sparkles size={14} />
          <span>Smart Personal Finance & Budgeting Platform</span>
        </div>

        <h1 className="hero-main-heading">
          The Smart Bridge Between Your Expenses & Savings — <span className="gradient-text">HisabSetu</span>
        </h1>

        <p className="hero-description">
          Track daily expenses effortlessly, set custom budget limits, and gain deep visual financial insights with bank-grade PostgreSQL security. Master your money with total clarity.
        </p>

        <div className="hero-cta-group">
          {user ? (
            <button
              className="btn-hero-primary"
              onClick={() => navigate('/dashboard')}
            >
              <span>Go to Your Dashboard</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <>
              <Link to="/signup" className="btn-hero-primary">
                <span>Create Free Account (Get Started)</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-hero-secondary">
                <span>Already have an account? Sign In</span>
              </Link>
            </>
          )}
        </div>

        <div className="hero-trust-row">
          <div className="trust-item">
            <ShieldCheck size={16} className="text-primary" />
            <span>PostgreSQL Row-Level Security</span>
          </div>
          <div className="trust-item">
            <Lock size={16} className="text-primary" />
            <span>100% Private & Encrypted</span>
          </div>
          <div className="trust-item">
            <Download size={16} className="text-primary" />
            <span>Excel / CSV Export Ready</span>
          </div>
        </div>
      </section>

      {/* 3. Hero Visual Interactive Preview (Dashboard Showcase) */}
      <div className="cover-preview-section">
        <div className="hero-preview-frame">
          <div className="preview-top-bar">
            <div className="preview-dots">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <div className="preview-address-bar">hisabsetu.app/dashboard</div>
            <div style={{ width: 40 }} />
          </div>

          <div className="preview-content">
            <div className="preview-metric-card">
              <div className="preview-metric-title">Today's Spend</div>
              <div className="preview-metric-value">₹450.00</div>
              <div className="preview-badge-positive">✓ 2 Transactions</div>
            </div>

            <div className="preview-metric-card">
              <div className="preview-metric-title">This Week's Spend</div>
              <div className="preview-metric-value">₹3,820.00</div>
              <div className="preview-badge-positive" style={{ color: 'var(--color-primary)' }}>
                <TrendingUp size={13} /> Within Limits
              </div>
            </div>

            <div className="preview-metric-card">
              <div className="preview-metric-title">This Month's Spend</div>
              <div className="preview-metric-value">₹18,450.00</div>
              <div className="preview-badge-positive" style={{ color: 'var(--color-accent)' }}>
                Target: ₹45,000 (₹26,550 Remaining)
              </div>
            </div>

            <div className="preview-full-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Coins size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-heading)' }}>
                    Recent Transaction: Groceries & Supermarket (Food)
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    UPI Payment • Today at 6:30 PM
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--color-heading)' }}>
                -₹280.00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Features Section (60:30:10 Design) */}
      <section id="features" className="cover-features-section">
        <div className="features-container">
          <div className="section-badge-center">
            <p className="section-tag">Key Capabilities</p>
            <h2 className="section-title">Why HisabSetu is the Right Choice for You</h2>
            <p className="section-subtitle">
              A powerful balance of speed, deep visual analytics, and bank-grade data security — giving you total control over every rupee.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-box">
              <div className="feature-icon-circle">
                <Receipt size={24} />
              </div>
              <h3 className="feature-heading">Fast Expense Ledger</h3>
              <p className="feature-desc">
                Record any expense transaction in under 5 seconds with amount, category, and payment method (UPI, Cash, Card).
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-circle">
                <BarChart3 size={24} />
              </div>
              <h3 className="feature-heading">Live Visual Analytics</h3>
              <p className="feature-desc">
                Interactive weekly, monthly, and yearly Recharts visualizations, bar breakdowns, and category donut distribution.
              </p>
            </div>

            <div id="security" className="feature-box">
              <div className="feature-icon-circle">
                <ShieldCheck size={24} />
              </div>
              <h3 className="feature-heading">100% Bank-Grade Security</h3>
              <p className="feature-desc">
                Powered by Supabase PostgreSQL Row Level Security (RLS). Your records are strictly isolated and accessible only to you.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-circle">
                <TrendingUp size={24} />
              </div>
              <h3 className="feature-heading">Smart Budget Alerts</h3>
              <p className="feature-desc">
                Set monthly targets and track real-time budget progress with visual indicators before exceeding limits.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-circle">
                <Download size={24} />
              </div>
              <h3 className="feature-heading">Secure CSV / Excel Export</h3>
              <p className="feature-desc">
                Export all your financial records in one click with spreadsheet formula injection protection and UTF-8 encoding.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-circle">
                <Smartphone size={24} />
              </div>
              <h3 className="feature-heading">Responsive on All Devices</h3>
              <p className="feature-desc">
                Optimized for phones, tablets, laptops, and desktop screens with lightning-fast load times.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 3-Step Walkthrough */}
      <section id="how-it-works" className="cover-steps-section">
        <p className="section-tag">Simple Workflow</p>
        <h2 className="section-title">Get Started in 3 Simple Steps</h2>
        <p className="section-subtitle">
          No complicated accounting jargon. Just clean, intelligent personal finance tracking.
        </p>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3 className="step-title">Create Free Account</h3>
            <p className="step-desc">
              Register in 30 seconds with your email and secure password.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <h3 className="step-title">Log Daily Expenses</h3>
            <p className="step-desc">
              Quickly record transactions across Food, Bills, Shopping, Travel, and more.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <h3 className="step-title">Analyze & Grow Savings</h3>
            <p className="step-desc">
              View visual charts, identify unnecessary spending trends, and maximize your savings.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Call To Action Banner */}
      <section className="cover-cta-banner">
        <h2 className="cta-banner-title">
          Ready to Take Control of Your Financial Future?
        </h2>
        <p className="cta-banner-subtitle">
          Stop wondering where your money went. Start managing your expenses with HisabSetu today.
        </p>
        <div className="cta-banner-buttons">
          <Link to="/signup" className="btn-cta-white">
            Create Free Account
          </Link>
          <Link to="/login" className="btn-cta-transparent">
            Sign In
          </Link>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="cover-footer">
        <div className="footer-brand-row">
          <img src="/hisabsetu-logo.png" alt="HisabSetu" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span>HisabSetu — Intelligent Personal Expense & Budget Tracker</span>
        </div>
        <p style={{ margin: 0 }}>
          © {new Date().getFullYear()} HisabSetu. Powered by Supabase PostgreSQL with strict Row Level Security.
        </p>
      </footer>
    </div>
  );
}
