import React, { useState, useEffect } from 'react';
import { X, Target, Trash2, Check, AlertCircle } from 'lucide-react';
import { ALLOWED_CATEGORIES, formatCurrencyINR } from '../../utils/dateUtils';
import { MONTH_NAMES, validateBudgetInput } from '../../utils/budgetUtils';
import { createBudget, updateBudget, deleteBudget } from '../../services/budgetService';
import './BudgetModal.css';

export default function BudgetModal({
  isOpen,
  onClose,
  initialData = null, // if provided, we are editing
  defaultYear,
  defaultMonth,
  defaultCategory = null,
  onSuccess
}) {
  const [scope, setScope] = useState('total'); // 'total' | 'category'
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(defaultMonth || new Date().getMonth() + 1);
  const [year, setYear] = useState(defaultYear || new Date().getFullYear());
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAmount(String(initialData.amount || initialData.budgetAmount || ''));
        setMonth(initialData.month || defaultMonth);
        setYear(initialData.year || defaultYear);
        if (initialData.category) {
          setScope('category');
          setCategory(initialData.category);
        } else {
          setScope('total');
          setCategory('Food');
        }
      } else {
        setAmount('');
        setMonth(defaultMonth || new Date().getMonth() + 1);
        setYear(defaultYear || new Date().getFullYear());
        if (defaultCategory) {
          setScope('category');
          setCategory(defaultCategory);
        } else {
          setScope('total');
          setCategory('Food');
        }
      }
      setError(null);
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  }, [isOpen, initialData, defaultYear, defaultMonth, defaultCategory]);

  if (!isOpen) return null;

  const isEditing = Boolean(initialData?.id || initialData?.budgetId);
  const activeBudgetId = initialData?.id || initialData?.budgetId;

  const handleQuickAdd = (increment) => {
    const current = Number(amount) || 0;
    setAmount(String(current + increment));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const payload = {
      amount: amount.trim(),
      month: Number(month),
      year: Number(year),
      category: scope === 'category' ? category : null
    };

    const validation = validateBudgetInput(payload);
    if (!validation.isValid) {
      setError(Object.values(validation.errors)[0]);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && activeBudgetId) {
        await updateBudget(activeBudgetId, payload);
      } else {
        await createBudget(payload);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Save budget error:', err);
      setError(err.message || 'Failed to save budget. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeBudgetId) return;
    const confirmMsg = `Are you sure you want to delete this ${
      scope === 'category' ? `${category} category` : 'total monthly'
    } budget?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsDeleting(true);
      await deleteBudget(activeBudgetId);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Delete budget error:', err);
      setError(err.message || 'Failed to delete budget.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container budget-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" aria-hidden="true">
              <Target size={20} />
            </div>
            <div>
              <h2 className="modal-title">
                {isEditing ? 'Edit Budget Target' : 'Create Budget Target'}
              </h2>
              <p className="modal-subtitle">
                {MONTH_NAMES[month - 1]} {year} Spending Target
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="modal-error-alert" role="alert">
              <AlertCircle size={16} className="text-danger flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Scope Selection (Total vs Category) */}
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">Budget Target Type</label>
              <div className="scope-toggle-grid">
                <button
                  type="button"
                  className={`scope-toggle-btn ${scope === 'total' ? 'active' : ''}`}
                  onClick={() => setScope('total')}
                >
                  <Target size={16} />
                  <span>Total Monthly Budget</span>
                </button>
                <button
                  type="button"
                  className={`scope-toggle-btn ${scope === 'category' ? 'active' : ''}`}
                  onClick={() => setScope('category')}
                >
                  <span>Category Specific</span>
                </button>
              </div>
            </div>
          )}

          {/* Category Dropdown (if Category scope) */}
          {scope === 'category' && (
            <div className="form-group">
              <label className="form-label" htmlFor="budget-category-select">
                Spending Category
              </label>
              <select
                id="budget-category-select"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isEditing}
              >
                {ALLOWED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Target Amount */}
          <div className="form-group">
            <label className="form-label" htmlFor="budget-amount-input">
              Budget Target Amount (₹)
            </label>
            <div className="input-currency-wrap">
              <span className="currency-prefix">₹</span>
              <input
                id="budget-amount-input"
                type="number"
                step="0.01"
                min="1"
                max="9999999999.99"
                placeholder="e.g. 25000"
                className="form-control input-with-prefix"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Quick Increment Chips */}
            <div className="quick-chips-row">
              <span className="quick-chips-label">Quick Add:</span>
              <button
                type="button"
                className="quick-chip"
                onClick={() => handleQuickAdd(1000)}
              >
                +₹1k
              </button>
              <button
                type="button"
                className="quick-chip"
                onClick={() => handleQuickAdd(5000)}
              >
                +₹5k
              </button>
              <button
                type="button"
                className="quick-chip"
                onClick={() => handleQuickAdd(10000)}
              >
                +₹10k
              </button>
              <button
                type="button"
                className="quick-chip"
                onClick={() => handleQuickAdd(25000)}
              >
                +₹25k
              </button>
            </div>
          </div>

          {/* Month & Year Selectors */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="budget-month-select">
                Target Month
              </label>
              <select
                id="budget-month-select"
                className="form-control"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                disabled={isEditing}
              >
                {MONTH_NAMES.map((mName, idx) => (
                  <option key={mName} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="budget-year-select">
                Target Year
              </label>
              <input
                id="budget-year-select"
                type="number"
                min="2020"
                max="2035"
                className="form-control"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={isEditing}
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-footer">
            {isEditing && (
              <button
                type="button"
                className="btn btn-outline text-danger btn-delete-budget"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                aria-label="Delete this budget"
              >
                <Trash2 size={16} />
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            )}

            <div className="modal-footer-right">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || isDeleting}
              >
                <Check size={16} />
                <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Budget' : 'Save Budget'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
