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
            <Wallet size={22} />
          </div>
          <span className="cover-brand-title">
            HisabSetu
            <span className="cover-brand-badge">હિસાબસેતુ</span>
          </span>
        </Link>

        <nav className="cover-nav-links" aria-label="Main Cover Links">
          <a href="#features" className="cover-nav-link">સુવિધાઓ (Features)</a>
          <a href="#how-it-works" className="cover-nav-link">કેવી રીતે કામ કરે છે?</a>
          <a href="#security" className="cover-nav-link">સુરક્ષા (Security)</a>
        </nav>

        <div className="cover-nav-actions">
          {user ? (
            <button
              className="btn btn-cover-signup"
              onClick={() => navigate('/dashboard')}
            >
              <span>ડેશબોર્ડ ખોલો (Open Dashboard)</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-cover-login">
                લૉગ ઇન (Log In)
              </Link>
              <Link to="/signup" className="btn btn-cover-signup">
                <span>શરૂ કરો (Sign Up)</span>
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
          <span>ભારતનું સ્માર્ટ પર્સનલ ફાઇનાન્સ પ્લેટફોર્મ</span>
        </div>

        <h1 className="hero-main-heading">
          તમારા દરેક ખર્ચ અને બચતનો સ્માર્ટ સેતુ — <span className="gradient-text">HisabSetu</span>
        </h1>

        <p className="hero-description">
          દૈનિક ખર્ચ ટ્રેક કરો, બજેટ લિમિટ નક્કી કરો અને સચોટ વિઝ્યુઅલ રિપોર્ટ્સ સાથે તમારા નાણાકીય ભવિષ્યને સુરક્ષિત બનાવો.
          ૧૦૦% પ્રાઇવેટ અને બેંક-ગ્રેડ સિક્યોરિટી સાથે.
        </p>

        <div className="hero-cta-group">
          {user ? (
            <button
              className="btn-hero-primary"
              onClick={() => navigate('/dashboard')}
            >
              <span>તમારા ડેશબોર્ડ પર જાઓ</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <>
              <Link to="/signup" className="btn-hero-primary">
                <span>મફતમાં એકાઉન્ટ બનાવો (Get Started)</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn-hero-secondary">
                <span>પહેલેથી એકાઉન્ટ છે? લૉગ ઇન કરો</span>
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
            <span>૧૦૦% ખાનગી અને એન્ક્રિપ્ટેડ</span>
          </div>
          <div className="trust-item">
            <Download size={16} className="text-primary" />
            <span>Excel / CSV એક્સપોર્ટ સપોર્ટ</span>
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
              <div className="preview-metric-title">આજનો ખર્ચ (Today)</div>
              <div className="preview-metric-value">₹450.00</div>
              <div className="preview-badge-positive">✓ ૨ ટ્રાન્ઝેક્શન્સ</div>
            </div>

            <div className="preview-metric-card">
              <div className="preview-metric-title">આ સપ્તાહનો ખર્ચ (This Week)</div>
              <div className="preview-metric-value">₹3,820.00</div>
              <div className="preview-badge-positive" style={{ color: 'var(--color-primary)' }}>
                <TrendingUp size={13} /> નિયંત્રણમાં છે
              </div>
            </div>

            <div className="preview-metric-card">
              <div className="preview-metric-title">માસિક કુલ ખર્ચ (This Month)</div>
              <div className="preview-metric-value">₹18,450.00</div>
              <div className="preview-badge-positive" style={{ color: 'var(--color-accent)' }}>
                લક્ષ્યાંક: ₹45,000 (બાકી ₹26,550)
              </div>
            </div>

            <div className="preview-full-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Coins size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--color-heading)' }}>
                    તાજેતરનો ખર્ચ: કરિયાણું અને દૂધ (Food)
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    UPI પેમેન્ટ • આજે સાંજે ૬:૩૦
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
            <p className="section-tag">મુખ્ય સુવિધાઓ</p>
            <h2 className="section-title">શા માટે HisabSetu તમારા માટે શ્રેષ્ઠ છે?</h2>
            <p className="section-subtitle">
              સરળતા અને શક્તિશાળી એનાલિટિક્સનું પરફેક્ટ સંયોજન — તમારા દરેક રૂપિયાની સાચી ગણતરી.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-box">
              <div className="feature-icon-circle">
                <Receipt size={24} />
              </div>
              <h3 className="feature-heading">ઝડપી ખર્ચ એન્ટ્રી (Fast Ledger)</h3>
              <p className="feature-desc">
                માત્ર ૫ સેકન્ડમાં કોઈપણ ખર્ચ રકમ, કેટેગરી અને પેમેન્ટ મોડ (UPI, Cash, Card) સાથે નોંધી લો.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-circle">
                <BarChart3 size={24} />
              </div>
              <h3 className="feature-heading">લાઇવ ગ્રાફ્સ અને રિપોર્ટ્સ</h3>
              <p className="feature-desc">
                સાપ્તાહિક, માસિક અને વાર્ષિક ખર્ચના સુંદર Recharts બાર ચાર્ટ અને કેટેગરી ડોનટ ચાર્ટ્સ.
              </p>
            </div>

            <div id="security" className="feature-box">
              <div className="feature-icon-circle">
                <ShieldCheck size={24} />
              </div>
              <h3 className="feature-heading">૧૦૦% બેંક-ગ્રેડ સિક્યોરિટી</h3>
              <p className="feature-desc">
                Supabase PostgreSQL Row Level Security (RLS) દ્વારા તમારો ડેટા ફક્ત તમારા જ ખાતા પૂરતો સંપૂર્ણ સુરક્ષિત છે.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-circle">
                <TrendingUp size={24} />
              </div>
              <h3 className="feature-heading">સ્માર્ટ બજેટ એલર્ટ્સ</h3>
              <p className="feature-desc">
                તમારી મર્યાદા નક્કી કરો અને જ્યારે ૮૦% બજેટ વપરાઈ જાય ત્યારે તરત ચેતવણી મેળવો.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-circle">
                <Download size={24} />
              </div>
              <h3 className="feature-heading">સિક્યોર CSV / Excel ડાઉનલોડ</h3>
              <p className="feature-desc">
                તમામ વ્યવહારોને એક જ ક્લિકમાં એક્સેલ-રેડી CSV ફાઇલમાં એક્સપોર્ટ કરો. ફોર્મ્યુલા ઇન્જેક્શન પ્રોટેક્શન સાથે.
              </p>
            </div>

            <div className="feature-box">
              <div className="feature-icon-circle">
                <Smartphone size={24} />
              </div>
              <h3 className="feature-heading">મોબાઇલ અને લેપટોપ રેડી</h3>
              <p className="feature-desc">
                મોબાઇલ, ટેબ્લેટ કે કોમ્પ્યુટર — દરેક સ્ક્રીન પર સરળ અને પ્રતિભાવશીલ યુઝર ઇન્ટરફેસ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. 3-Step Walkthrough */}
      <section id="how-it-works" className="cover-steps-section">
        <p className="section-tag">સરળ પ્રક્રિયા</p>
        <h2 className="section-title">માત્ર ૩ સરળ સ્ટેપ્સમાં શરૂ કરો</h2>
        <p className="section-subtitle">
          જટિલ એકાઉન્ટિંગ નહીં, માત્ર સરળ અને સ્માર્ટ પર્સનલ હિસાબ.
        </p>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">૧</div>
            <h3 className="step-title">એકાઉન્ટ બનાવો</h3>
            <p className="step-desc">
              તમારા ઇમેઇલ અને પાસવર્ડ વડે ૩૦ સેકન્ડમાં મફત એકાઉન્ટ રજીસ્ટર કરો.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">૨</div>
            <h3 className="step-title">દૈનિક ખર્ચ એડ કરો</h3>
            <p className="step-desc">
              તમારો દૈનિક ખર્ચ જેમ કે ખોરાક, યાત્રા, બિલ કે શોપિંગ તરત જ સેવ કરો.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">૩</div>
            <h3 className="step-title">વિશ્લેષણ કરો અને બચાવો</h3>
            <p className="step-desc">
              રિપોર્ટ્સ જુઓ, ક્યાં વધારે ખર્ચ થાય છે તે સમજો અને બચતમાં વધારો કરો.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Call To Action Banner */}
      <section className="cover-cta-banner">
        <h2 className="cta-banner-title">
          આજે જ તમારા હિસાબને સ્માર્ટ અને ડિજિટલ બનાવો!
        </h2>
        <p className="cta-banner-subtitle">
          હજારો રૂપિયાના અણધાર્યા ખર્ચાઓથી બચો. HisabSetu સાથે તમારું નાણાકીય આયોજન આજે જ શરૂ કરો.
        </p>
        <div className="cta-banner-buttons">
          <Link to="/signup" className="btn-cta-white">
            મફતમાં શરૂ કરો (Create Account)
          </Link>
          <Link to="/login" className="btn-cta-transparent">
            લૉગ ઇન કરો (Sign In)
          </Link>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="cover-footer">
        <div className="footer-brand-row">
          <Wallet size={18} className="text-primary" />
          <span>HisabSetu — સ્માર્ટ પર્સનલ એક્સપેન્સ ટ્રેકર</span>
        </div>
        <p style={{ margin: 0 }}>
          © {new Date().getFullYear()} HisabSetu. સુરક્ષિત PostgreSQL અને Row Level Security દ્વારા સંચાલિત.
        </p>
      </footer>
    </div>
  );
}
