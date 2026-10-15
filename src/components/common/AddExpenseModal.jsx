import React, { useState, useEffect } from 'react';
import { X, AlertCircle, PlusCircle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { createExpense, updateExpense } from '../../services/expenseService';
import { getAccounts } from '../../services/accountService';
import {
  ALLOWED_CATEGORIES,
  ALLOWED_PAYMENT_METHODS,
  getTodayLocalDateString,
  validateExpenseInput
} from '../../utils/dateUtils';
import './AddExpenseModal.css';

export default function AddExpenseModal({
  isOpen,
  onClose,
  expenseToEdit = null,
  onSuccess
}) {
  const isEditMode = Boolean(expenseToEdit?.id);

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    expense_date: getTodayLocalDateString(),
    payment_method: 'UPI',
    account_id: '',
    description: ''
  });

  const [accounts, setAccounts] = useState([]);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  // Fetch active accounts for selection
  useEffect(() => {
    if (isOpen) {
      getAccounts({ includeArchived: false })
        .then((data) => setAccounts(data || []))
        .catch((err) => console.warn('Could not load accounts in AddExpenseModal:', err));
    }
  }, [isOpen]);

  // Hydrate form when opening or editing
  useEffect(() => {
    if (expenseToEdit) {
      setFormData({
        amount: expenseToEdit.amount !== undefined ? String(expenseToEdit.amount) : '',
        category: expenseToEdit.category || 'Food',
        expense_date: expenseToEdit.expense_date || getTodayLocalDateString(),
        payment_method: expenseToEdit.payment_method || 'UPI',
        account_id: expenseToEdit.account_id || '',
        description: expenseToEdit.description || ''
      });
    } else {
      setFormData({
        amount: '',
        category: 'Food',
        expense_date: getTodayLocalDateString(),
        payment_method: 'UPI',
        account_id: '',
        description: ''
      });
    }
    setErrors({});
    setServerError('');
    setSuccessNotice('');
  }, [expenseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error upon typing
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessNotice('');

    const validation = validateExpenseInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditMode) {
        await updateExpense(expenseToEdit.id, formData);
        setSuccessNotice('Expense updated successfully!');
      } else {
        await createExpense(formData);
        setSuccessNotice('Expense recorded successfully!');
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 500);
    } catch (err) {
      console.error('Failed to submit expense:', err);
      setServerError(err.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="modal-title" className="modal-title">
              {isEditMode ? 'Edit Expense Transaction' : 'Record New Expense'}
            </h2>
            <p className="modal-subtitle">
              {isEditMode
                ? 'Update your transaction details in Supabase'
                : 'Save a real transaction to your Supabase PostgreSQL ledger'}
            </p>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {serverError && (
          <div className="modal-error-banner" role="alert">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {successNotice && (
          <div className="preview-feedback-banner" role="status">
            <CheckCircle2 size={18} className="feedback-icon" />
            <p className="feedback-main">{successNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="expense-form" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expense-amount">Amount (₹) *</label>
              <input
                id="expense-amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                className={`form-input ${errors.amount ? 'input-error' : ''}`}
                disabled={isSubmitting}
                autoFocus
              />
              {errors.amount && <span className="field-error-msg">{errors.amount}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="expense-category">Category *</label>
              <select
                id="expense-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`form-input ${errors.category ? 'input-error' : ''}`}
                disabled={isSubmitting}
              >
                {ALLOWED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <span className="field-error-msg">{errors.category}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expense-date">Expense Date *</label>
              <input
                id="expense-date"
                name="expense_date"
                type="date"
                required
                value={formData.expense_date}
                onChange={handleChange}
                className={`form-input ${errors.expense_date ? 'input-error' : ''}`}
                disabled={isSubmitting}
              />
              {errors.expense_date && <span className="field-error-msg">{errors.expense_date}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="expense-payment">Payment Method *</label>
              <select
                id="expense-payment"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className={`form-input ${errors.payment_method ? 'input-error' : ''}`}
                disabled={isSubmitting}
              >
                {ALLOWED_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              {errors.payment_method && <span className="field-error-msg">{errors.payment_method}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="expense-account">Wallet / Account (Optional)</label>
            <select
              id="expense-account"
              name="account_id"
              value={formData.account_id}
              onChange={handleChange}
              className="form-input"
              disabled={isSubmitting}
            >
              <option value="">None / Unassigned Account</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <div className="label-with-counter">
              <label htmlFor="expense-description">Description / Merchant (Optional)</label>
              <span className="char-counter">{formData.description.length}/500</span>
            </div>
            <textarea
              id="expense-description"
              name="description"
              rows={2}
              maxLength={500}
              placeholder="e.g. Weekly grocery shopping at Reliance Fresh"
              value={formData.description}
              onChange={handleChange}
              className={`form-input form-textarea ${errors.description ? 'input-error' : ''}`}
              disabled={isSubmitting}
            />
            {errors.description && <span className="field-error-msg">{errors.description}</span>}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spinner-icon" />
                  <span>{isEditMode ? 'Updating...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  {isEditMode ? <Save size={16} /> : <PlusCircle size={16} />}
                  <span>{isEditMode ? 'Update Expense' : 'Save Expense'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
