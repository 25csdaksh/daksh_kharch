import React from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon, Sparkles } from 'lucide-react';
import WeeklySpendingChart from '../components/dashboard/WeeklySpendingChart';
import CategoryBreakdownChart from '../components/dashboard/CategoryBreakdownChart';
import './PlaceholderPage.css';

export default function ReportsPage() {
  return (
    <div className="page-container">
      <div className="page-header-card card">
        <div className="page-header-info">
          <div className="page-header-icon">
            <BarChart3 size={24} />
          </div>
          <div>
            <h1 className="page-main-heading">Analytics & Reports</h1>
            <p className="page-main-subheading">
              In-depth visualization of spending trends, category ratios, and budget adherence
            </p>
          </div>
        </div>

        <span className="badge badge-demo">Phase 1 Preview</span>
      </div>

      <div className="dashboard-charts-grid">
        <div className="grid-col-left">
          <WeeklySpendingChart />
        </div>
        <div className="grid-col-right">
          <CategoryBreakdownChart />
        </div>
      </div>

      <div className="placeholder-card card">
        <div className="card-section-title">
          <Sparkles size={18} className="feature-item-icon" />
          <span>Planned Analytics Capabilities</span>
        </div>
        <div className="placeholder-grid" style={{ marginTop: '0.5rem' }}>
          <div className="feature-item">
            <TrendingUp size={18} className="feature-item-icon" />
            <div>
              <strong>Month-over-Month Comparisons:</strong> Analyze recurring trends and inflation impact.
            </div>
          </div>
          <div className="feature-item">
            <PieIcon size={18} className="feature-item-icon" />
            <div>
              <strong>Custom Category Deep Dives:</strong> Drill down into individual merchant items.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
