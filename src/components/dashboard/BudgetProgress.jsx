import React from 'react';
import { Target, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';

export default function BudgetProgress({
  spentAmount = 0,
  totalBudget = 45000,
  monthName = 'This Month',
  isLoading = false
}) {
  const safeSpent = Number(spentAmount) || 0;
  const remainingAmount = Math.max(0, totalBudget - safeSpent);
  const spentPercentage = totalBudget > 0 ? Math.min(100, Math.round((safeSpent / totalBudget) * 100)) : 0;
  const isOverBudget = safeSpent > totalBudget;

  return (
    <div className="card budget-card">
      <div className="budget-card-header">
        <div className="budget-header-title-group">
          <div className="budget-icon-wrap" aria-hidden="true">
            <Target size={20} />
          </div>
          <div>
            <h3 className="budget-title">Monthly Budget Status</h3>
            <p className="budget-subtitle">{monthName} Spending Limit</p>
          </div>
        </div>
        <span className={`badge ${isOverBudget ? 'badge-warning' : 'badge-success'}`}>
          {isOverBudget ? 'Budget Exceeded' : 'Active Target'}
        </span>
      </div>

      <div className="budget-metrics">
        <div className="budget-metric-item">
          <span className="metric-label">Budget</span>
          <span className="metric-value">{formatCurrencyINR(totalBudget, false)}</span>
        </div>
        <div className="budget-metric-item">
          <span className="metric-label">Spent</span>
          <span className={`metric-value ${isOverBudget ? 'text-danger' : 'text-primary'}`}>
            {formatCurrencyINR(safeSpent, false)}
          </span>
        </div>
        <div className="budget-metric-item">
          <span className="metric-label">Remaining</span>
          <span className={`metric-value ${isOverBudget ? 'text-danger' : 'text-success'}`}>
            {isOverBudget ? `-₹${(safeSpent - totalBudget).toLocaleString('en-IN')}` : formatCurrencyINR(remainingAmount, false)}
          </span>
        </div>
      </div>

      <div className="budget-progress-bar-container">
        <div className="budget-progress-track">
          <div
            className={`budget-progress-fill ${isOverBudget ? 'progress-exceeded' : ''}`}
            style={{ width: `${Math.min(100, spentPercentage)}%` }}
            role="progressbar"
            aria-valuenow={spentPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Monthly budget usage"
          />
        </div>
        <div className="budget-progress-labels">
          <span>{spentPercentage}% Utilized</span>
          <span>{Math.max(0, 100 - spentPercentage)}% Available</span>
        </div>
      </div>

      <div className={`budget-footer-note ${isOverBudget ? 'budget-note-warning' : ''}`}>
        {isOverBudget ? (
          <>
            <AlertTriangle size={15} className="budget-status-icon text-warning" aria-hidden="true" />
            <span>Monthly spending has exceeded the target budget limit.</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={15} className="budget-status-icon" aria-hidden="true" />
            <span>You are within your monthly spending target.</span>
          </>
        )}
      </div>
    </div>
  );
}
