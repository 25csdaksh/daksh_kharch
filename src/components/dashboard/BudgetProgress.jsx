import React from 'react';
import { Target, CheckCircle2 } from 'lucide-react';
import { SUMMARY_STATS } from '../../data/mockData';

export default function BudgetProgress() {
  const { monthlyBudget } = SUMMARY_STATS;
  const format = (num) => new Intl.NumberFormat('en-IN').format(num);

  return (
    <div className="card budget-card">
      <div className="budget-card-header">
        <div className="budget-header-title-group">
          <div className="budget-icon-wrap" aria-hidden="true">
            <Target size={20} />
          </div>
          <div>
            <h3 className="budget-title">Monthly Budget Status</h3>
            <p className="budget-subtitle">October 2026 Spending Limit</p>
          </div>
        </div>
        <span className="badge badge-demo">Demo Preview</span>
      </div>

      <div className="budget-metrics">
        <div className="budget-metric-item">
          <span className="metric-label">Total Allocated</span>
          <span className="metric-value">₹{format(monthlyBudget.totalBudget)}</span>
        </div>
        <div className="budget-metric-item">
          <span className="metric-label">Spent So Far</span>
          <span className="metric-value text-primary">₹{format(monthlyBudget.spentAmount)}</span>
        </div>
        <div className="budget-metric-item">
          <span className="metric-label">Remaining Safe Spend</span>
          <span className="metric-value text-success">₹{format(monthlyBudget.remainingAmount)}</span>
        </div>
      </div>

      <div className="budget-progress-bar-container">
        <div className="budget-progress-track">
          <div
            className="budget-progress-fill"
            style={{ width: `${monthlyBudget.spentPercentage}%` }}
            role="progressbar"
            aria-valuenow={monthlyBudget.spentPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Monthly budget usage"
          />
        </div>
        <div className="budget-progress-labels">
          <span>{monthlyBudget.spentPercentage}% Utilized</span>
          <span>{(100 - monthlyBudget.spentPercentage).toFixed(1)}% Available</span>
        </div>
      </div>

      <div className="budget-footer-note">
        <CheckCircle2 size={15} className="budget-status-icon" aria-hidden="true" />
        <span>You are on track with your monthly spending targets.</span>
      </div>
    </div>
  );
}
