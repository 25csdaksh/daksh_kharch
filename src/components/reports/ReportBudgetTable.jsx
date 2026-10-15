import React from 'react';
import {
  Utensils,
  Car,
  ShoppingBag,
  GraduationCap,
  Film,
  FileText,
  HeartPulse,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Target
} from 'lucide-react';
import { CATEGORY_COLORS, formatCurrencyINR } from '../../utils/dateUtils';
import './ReportBudgetTable.css';

const CATEGORY_ICON_MAP = {
  Food: Utensils,
  Transport: Car,
  Shopping: ShoppingBag,
  Education: GraduationCap,
  Entertainment: Film,
  Bills: FileText,
  Healthcare: HeartPulse,
  'Personal Care': Sparkles,
  Other: HelpCircle
};

export default function ReportBudgetTable({
  overview = null,
  isLoading = false
}) {
  if (isLoading) {
    return (
      <div className="card report-table-card">
        <div className="table-loading-state">
          <span className="loading-pulse-text">Loading budget comparison analysis...</span>
        </div>
      </div>
    );
  }

  const categories = overview?.categoryBreakdown || [];
  const hasData = categories.length > 0;

  return (
    <div className="card report-table-card">
      <div className="report-table-header">
        <div className="table-title-group">
          <div className="table-icon-wrap" aria-hidden="true">
            <Target size={18} />
          </div>
          <div>
            <h3 className="report-table-title">Budget vs. Actual Variance Ledger</h3>
            <p className="report-table-subtitle">
              Comprehensive Category Performance & Spending Drift ({overview?.monthRange?.label || 'This Month'})
            </p>
          </div>
        </div>
      </div>

      <div className="report-table-container">
        <table className="report-budget-data-table" aria-label="Budget vs Actual Comparison Table">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="text-right">Target Budget</th>
              <th scope="col" className="text-right">Actual Spent</th>
              <th scope="col" className="text-right">Variance</th>
              <th scope="col" className="text-right">% Utilized</th>
              <th scope="col" className="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {!hasData ? (
              <tr>
                <td colSpan="6" className="table-empty-cell">
                  No budget breakdown available for this month.
                </td>
              </tr>
            ) : (
              categories.map((item) => {
                const IconComponent = CATEGORY_ICON_MAP[item.category] || HelpCircle;
                const catColor = CATEGORY_COLORS[item.category] || '#64748B';
                const isOver = item.isOverBudget;
                const isWarning = item.isNearLimit;

                let badgeClass = 'badge-healthy';
                if (!item.isBudgeted) {
                  badgeClass = 'badge-unbudgeted';
                } else if (isOver) {
                  badgeClass = 'badge-danger';
                } else if (isWarning) {
                  badgeClass = 'badge-warning';
                } else if (item.spentAmount === 0) {
                  badgeClass = 'badge-neutral';
                }

                return (
                  <tr key={item.category} className={isOver ? 'row-over-budget' : ''}>
                    <td>
                      <div className="table-category-cell">
                        <div
                          className="table-cat-icon"
                          style={{ backgroundColor: `${catColor}15`, color: catColor }}
                          aria-hidden="true"
                        >
                          <IconComponent size={15} />
                        </div>
                        <div className="table-cat-names">
                          <span className="cat-name">{item.category}</span>
                          <span className="cat-sub">{item.transactionCount} transactions</span>
                        </div>
                      </div>
                    </td>

                    <td className="text-right font-num">
                      {item.isBudgeted ? formatCurrencyINR(item.budgetAmount, false) : '—'}
                    </td>

                    <td className={`text-right font-num ${isOver ? 'text-danger font-bold' : ''}`}>
                      {formatCurrencyINR(item.spentAmount, false)}
                    </td>

                    <td className="text-right font-num">
                      {item.isBudgeted ? (
                        <span className={isOver ? 'text-danger' : item.remainingAmount > 0 ? 'text-success' : 'text-muted'}>
                          {isOver
                            ? `-${formatCurrencyINR(Math.abs(item.remainingAmount), false)}`
                            : formatCurrencyINR(item.remainingAmount, false)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="text-right font-num">
                      {item.isBudgeted ? `${item.roundedPercentage}%` : '—'}
                    </td>

                    <td className="text-center">
                      <span className={`table-status-pill ${badgeClass}`}>
                        {item.badgeText}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Reconciled Summary Footer */}
          {hasData && (
            <tfoot>
              <tr className="table-summary-row">
                <td className="font-bold">Total Reconciled</td>
                <td className="text-right font-num font-bold">
                  {overview?.hasTotalBudget ? formatCurrencyINR(overview.totalBudget, false) : '—'}
                </td>
                <td className="text-right font-num font-bold">
                  {formatCurrencyINR(overview?.totalActualSpent || 0, false)}
                </td>
                <td className="text-right font-num font-bold">
                  {overview?.hasTotalBudget ? (
                    <span className={overview.overallMetrics.isOverBudget ? 'text-danger' : 'text-success'}>
                      {overview.overallMetrics.isOverBudget
                        ? `-${formatCurrencyINR(Math.abs(overview.overallMetrics.remaining), false)}`
                        : formatCurrencyINR(overview.overallMetrics.remaining, false)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="text-right font-num font-bold">
                  {overview?.hasTotalBudget ? `${overview.overallMetrics.roundedPercentage}%` : '—'}
                </td>
                <td className="text-center">
                  <span className={`table-status-pill ${
                    overview?.overallMetrics?.isOverBudget
                      ? 'badge-danger'
                      : overview?.overallMetrics?.isNearLimit
                      ? 'badge-warning'
                      : 'badge-healthy'
                  }`}>
                    {overview?.overallMetrics?.badgeText || 'Summary'}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
