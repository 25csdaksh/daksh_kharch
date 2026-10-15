import React from 'react';
import {
  Target,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus
} from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';
import './BudgetOverviewCard.css';

export default function BudgetOverviewCard({
  overview,
  onEditTotalBudget,
  onOpenAddModal
}) {
  if (!overview) return null;

  const {
    totalBudget,
    totalActualSpent,
    overallMetrics,
    hasTotalBudget,
    monthRange,
    alerts
  } = overview;

  const isOverBudget = overallMetrics.isOverBudget;
  const isNearLimit = overallMetrics.isNearLimit;
  const percentage = Math.min(100, overallMetrics.roundedPercentage || 0);

  // Determine progress bar tone
  let progressClass = 'progress-healthy';
  if (isOverBudget) {
    progressClass = 'progress-danger';
  } else if (isNearLimit) {
    progressClass = 'progress-warning';
  }

  return (
    <div className="budget-overview-card">
      <div className="budget-overview-header">
        <div className="overview-title-group">
          <div className="overview-icon-badge" aria-hidden="true">
            <Target size={24} />
          </div>
          <div>
            <div className="overview-eyebrow">MONTHLY TARGET PULSE</div>
            <h2 className="overview-heading">{monthRange?.label} Spending Budget</h2>
          </div>
        </div>

        <div className="overview-actions">
          {hasTotalBudget ? (
            <button
              type="button"
              className="btn btn-outline btn-sm overview-action-btn"
              onClick={onEditTotalBudget}
              aria-label="Edit Total Monthly Budget"
            >
              <Pencil size={15} />
              <span>Edit Budget</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm overview-action-btn"
              onClick={onEditTotalBudget}
              aria-label="Set Total Monthly Budget"
            >
              <Plus size={15} />
              <span>Set Total Budget</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Tri-Grid */}
      <div className="overview-metrics-grid">
        <div className="overview-metric-box">
          <span className="metric-box-label">Monthly Budget</span>
          <span className="metric-box-value">
            {hasTotalBudget ? formatCurrencyINR(totalBudget, false) : 'Not Set'}
          </span>
          <span className="metric-box-sub">
            {hasTotalBudget ? 'Target ceiling' : 'Set limit to track'}
          </span>
        </div>

        <div className="overview-metric-box">
          <span className="metric-box-label">Actual Spent</span>
          <span className={`metric-box-value ${isOverBudget ? 'text-danger' : 'text-slate'}`}>
            {formatCurrencyINR(totalActualSpent, false)}
          </span>
          <span className="metric-box-sub">
            {overview.expenseCount} transactions recorded
          </span>
        </div>

        <div className="overview-metric-box">
          <span className="metric-box-label">
            {isOverBudget ? 'Over Budget By' : 'Remaining Budget'}
          </span>
          <span
            className={`metric-box-value ${
              isOverBudget
                ? 'text-danger'
                : overallMetrics.remaining > 0
                ? 'text-success'
                : 'text-muted'
            }`}
          >
            {hasTotalBudget
              ? isOverBudget
                ? `-${formatCurrencyINR(Math.abs(overallMetrics.remaining), false)}`
                : formatCurrencyINR(overallMetrics.remaining, false)
              : '—'}
          </span>
          <span className="metric-box-sub">
            {hasTotalBudget
              ? isOverBudget
                ? 'Target limit exceeded'
                : `${Math.max(0, 100 - percentage)}% available`
              : 'Configure to see balance'}
          </span>
        </div>
      </div>

      {/* Progress Bar & Visual Indicator */}
      {hasTotalBudget && (
        <div className="overview-progress-section">
          <div className="progress-labels-row">
            <span className="progress-label-left">
              <strong>{percentage}%</strong> consumed
            </span>
            <span className={`progress-badge ${progressClass}`}>
              {overallMetrics.badgeText}
            </span>
          </div>

          <div
            className="overview-progress-track"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Monthly budget consumed percentage"
          >
            <div
              className={`overview-progress-bar ${progressClass}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Active In-App Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <div className="overview-alerts-container" aria-label="Budget Alerts">
          {alerts.map((alert) => (
            <div key={alert.id} className={`budget-alert-pill alert-${alert.type}`} role="alert">
              <div className="alert-icon-wrap">
                {alert.type === 'danger' ? (
                  <AlertCircle size={18} className="text-danger" />
                ) : (
                  <AlertTriangle size={18} className="text-warning" />
                )}
              </div>
              <div className="alert-text-wrap">
                <span className="alert-pill-title">{alert.title}</span>
                <span className="alert-pill-msg">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
