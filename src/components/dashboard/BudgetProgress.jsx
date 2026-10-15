import React from 'react';
import { Link } from 'react-router-dom';
import { Target, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';

export default function BudgetProgress({
  spentAmount = 0,
  totalBudget = 0,
  hasBudget = false,
  monthName = 'This Month',
  isLoading = false
}) {
  const safeSpent = Number(spentAmount) || 0;
  const safeBudget = Number(totalBudget) || 0;
  const isBudgetConfigured = hasBudget || safeBudget > 0;

  const remainingAmount = Math.max(0, safeBudget - safeSpent);
  const spentPercentage = isBudgetConfigured
    ? Math.min(100, Math.round((safeSpent / safeBudget) * 100))
    : 0;
  const isOverBudget = isBudgetConfigured && safeSpent > safeBudget;
  const isNearLimit = isBudgetConfigured && spentPercentage >= 80 && !isOverBudget;

  let badgeText = 'Active Target';
  let badgeClass = 'badge-success';

  if (!isBudgetConfigured) {
    badgeText = 'No Budget';
    badgeClass = 'badge-neutral';
  } else if (isOverBudget) {
    badgeText = 'Budget Exceeded';
    badgeClass = 'badge-warning';
  } else if (isNearLimit) {
    badgeText = '80% Warning';
    badgeClass = 'badge-warning';
  }

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
        <div className="budget-header-right">
          <span className={`badge ${badgeClass}`}>
            {badgeText}
          </span>
          <Link to="/budgets" className="btn-manage-budget-link" title="Open Budget Manager">
            <span>Manage</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="budget-metrics">
        <div className="budget-metric-item">
          <span className="metric-label">Budget</span>
          <span className="metric-value">
            {isBudgetConfigured ? formatCurrencyINR(safeBudget, false) : 'Not Set'}
          </span>
        </div>
        <div className="budget-metric-item">
          <span className="metric-label">Spent</span>
          <span className={`metric-value ${isOverBudget ? 'text-danger' : 'text-primary'}`}>
            {formatCurrencyINR(safeSpent, false)}
          </span>
        </div>
        <div className="budget-metric-item">
          <span className="metric-label">
            {isOverBudget ? 'Overspent' : 'Remaining'}
          </span>
          <span
            className={`metric-value ${
              isOverBudget
                ? 'text-danger'
                : remainingAmount > 0
                ? 'text-success'
                : 'text-muted'
            }`}
          >
            {isBudgetConfigured
              ? isOverBudget
                ? `-${formatCurrencyINR(safeSpent - safeBudget, false)}`
                : formatCurrencyINR(remainingAmount, false)
              : '—'}
          </span>
        </div>
      </div>

      {isBudgetConfigured ? (
        <div className="budget-progress-bar-container">
          <div className="budget-progress-track">
            <div
              className={`budget-progress-fill ${
                isOverBudget
                  ? 'progress-exceeded'
                  : isNearLimit
                  ? 'progress-warning'
                  : ''
              }`}
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
      ) : (
        <div className="budget-unconfigured-cta">
          <p className="cta-text">No target budget set for {monthName}.</p>
          <Link to="/budgets" className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>Set Monthly Budget</span>
          </Link>
        </div>
      )}

      {isBudgetConfigured && (
        <div className={`budget-footer-note ${isOverBudget ? 'budget-note-warning' : isNearLimit ? 'budget-note-near' : ''}`}>
          {isOverBudget ? (
            <>
              <AlertCircle size={15} className="budget-status-icon text-danger" aria-hidden="true" />
              <span>Monthly spending has exceeded the target budget limit.</span>
            </>
          ) : isNearLimit ? (
            <>
              <AlertTriangle size={15} className="budget-status-icon text-warning" aria-hidden="true" />
              <span>You have reached 80% or more of your monthly spending target.</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={15} className="budget-status-icon" aria-hidden="true" />
              <span>You are within your monthly spending target.</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
