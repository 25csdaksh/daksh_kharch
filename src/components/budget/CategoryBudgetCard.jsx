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
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { CATEGORY_COLORS, formatCurrencyINR } from '../../utils/dateUtils';
import './CategoryBudgetCard.css';

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

export default function CategoryBudgetCard({
  item,
  onEdit,
  onDelete,
  onSetBudget
}) {
  const {
    category,
    budgetId,
    isBudgeted,
    budgetAmount,
    spentAmount,
    remainingAmount,
    roundedPercentage,
    isOverBudget,
    isNearLimit,
    status,
    badgeText,
    transactionCount
  } = item;

  const IconComponent = CATEGORY_ICON_MAP[category] || HelpCircle;
  const categoryColor = CATEGORY_COLORS[category] || '#64748B';

  const cappedPercentage = Math.min(100, Math.max(0, roundedPercentage || 0));

  let progressClass = 'progress-healthy';
  let badgeClass = 'badge-healthy';

  if (!isBudgeted) {
    badgeClass = 'badge-unbudgeted';
    progressClass = 'progress-unbudgeted';
  } else if (isOverBudget) {
    badgeClass = 'badge-danger';
    progressClass = 'progress-danger';
  } else if (isNearLimit) {
    badgeClass = 'badge-warning';
    progressClass = 'progress-warning';
  } else if (spentAmount === 0) {
    badgeClass = 'badge-neutral';
  }

  return (
    <div className={`category-budget-card ${isOverBudget ? 'card-border-danger' : ''}`}>
      <div className="card-top-row">
        <div className="category-meta-group">
          <div
            className="category-icon-pill"
            style={{ backgroundColor: `${categoryColor}18`, color: categoryColor }}
            aria-hidden="true"
          >
            <IconComponent size={20} />
          </div>
          <div>
            <h3 className="category-name">{category}</h3>
            <span className="category-tx-count">
              {transactionCount} {transactionCount === 1 ? 'expense' : 'expenses'}
            </span>
          </div>
        </div>

        <div className="card-top-actions">
          <span className={`category-status-badge ${badgeClass}`}>
            {badgeText}
          </span>
          {isBudgeted ? (
            <div className="budget-btn-group">
              <button
                type="button"
                className="icon-action-btn"
                onClick={() => onEdit(item)}
                title={`Edit ${category} budget`}
                aria-label={`Edit ${category} budget`}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                className="icon-action-btn btn-trash"
                onClick={() => onDelete(item)}
                title={`Delete ${category} budget`}
                aria-label={`Delete ${category} budget`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-set-budget"
              onClick={() => onSetBudget(category)}
              aria-label={`Set budget for ${category}`}
            >
              <Plus size={14} />
              <span>Set Budget</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Split */}
      <div className="category-amounts-row">
        <div className="amount-col">
          <span className="col-label">Budget</span>
          <span className="col-val">
            {isBudgeted ? formatCurrencyINR(budgetAmount, false) : '—'}
          </span>
        </div>
        <div className="amount-col">
          <span className="col-label">Spent</span>
          <span className={`col-val ${isOverBudget ? 'text-danger' : 'text-slate'}`}>
            {formatCurrencyINR(spentAmount, false)}
          </span>
        </div>
        <div className="amount-col text-right">
          <span className="col-label">{isOverBudget ? 'Overspent' : 'Remaining'}</span>
          <span
            className={`col-val ${
              isOverBudget
                ? 'text-danger'
                : remainingAmount > 0
                ? 'text-success'
                : 'text-muted'
            }`}
          >
            {isBudgeted
              ? isOverBudget
                ? `-${formatCurrencyINR(Math.abs(remainingAmount), false)}`
                : formatCurrencyINR(remainingAmount, false)
              : '—'}
          </span>
        </div>
      </div>

      {/* Progress Track */}
      {isBudgeted ? (
        <div className="category-progress-block">
          <div className="cat-progress-track">
            <div
              className={`cat-progress-bar ${progressClass}`}
              style={{ width: `${cappedPercentage}%` }}
              role="progressbar"
              aria-valuenow={cappedPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${category} budget usage percentage`}
            />
          </div>
          <div className="cat-progress-labels">
            <span>{roundedPercentage}% Used</span>
            <span>
              {isOverBudget
                ? 'Exceeded limit'
                : `${Math.max(0, 100 - roundedPercentage)}% Left`}
            </span>
          </div>
        </div>
      ) : (
        <div className="unbudgeted-note">
          <span>No spending ceiling configured for {category}.</span>
        </div>
      )}
    </div>
  );
}
