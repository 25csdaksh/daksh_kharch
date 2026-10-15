import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  AlertCircle,
  Coins,
  Landmark,
  Smartphone,
  PiggyBank,
  CreditCard,
  Sparkles,
  Info
} from 'lucide-react';
import {
  ACCOUNT_TYPES,
  ACCOUNT_PRESETS,
  validateAccountInput,
  isLiabilityAccount
} from '../../utils/accountUtils';
import { createAccount, updateAccount } from '../../services/accountService';
import './AccountModal.css';

const COLOR_OPTIONS = [
  '#10B981', // Emerald
  '#064E3B', // Deep Emerald
  '#2563EB', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#DC2626', // Red
  '#06B6D4', // Cyan
  '#64748B'  // Slate
];

export default function AccountModal({
  isOpen,
  onClose,
  accountToEdit = null,
  onSuccess
}) {
  const isEditing = Boolean(accountToEdit?.id);

  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    opening_balance: '0',
    color: '#10B981',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (accountToEdit) {
        setFormData({
          name: accountToEdit.name || '',
          type: accountToEdit.type || 'bank',
          opening_balance: accountToEdit.opening_balance !== undefined ? String(accountToEdit.opening_balance) : '0',
          color: accountToEdit.color || '#10B981',
          notes: accountToEdit.notes || ''
        });
      } else {
        setFormData({
          name: '',
          type: 'bank',
          opening_balance: '0',
          color: '#2563EB',
          notes: ''
        });
      }
      setErrors({});
      setServerError('');
      setIsSubmitting(false);
    }
  }, [isOpen, accountToEdit]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setServerError('');
  };

  const handleApplyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      type: preset.type,
      opening_balance: String(preset.opening_balance),
      color: preset.color
    }));
    setErrors({});
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validation = validateAccountInput(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateAccount(accountToEdit.id, formData);
      } else {
        await createAccount(formData);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Account save error:', err);
      setServerError(err.message || 'Failed to save account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCredit = isLiabilityAccount(formData.type);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" aria-hidden="true">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="modal-title">
                {isEditing ? 'Edit Account' : 'Create New Account / Wallet'}
              </h2>
              <p className="modal-subtitle">
                {isEditing ? 'Update your account details' : 'Add a bank, cash wallet, or credit card'}
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
          {serverError && (
            <div className="modal-error-alert" role="alert">
              <AlertCircle size={16} className="text-danger flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {!isEditing && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} className="text-gold" />
                <span>Quick Preset Suggestions</span>
              </label>
              <div className="account-presets-grid">
                {ACCOUNT_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className="preset-chip"
                    onClick={() => handleApplyPreset(p)}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="account-name-input">
              Account Name *
            </label>
            <input
              id="account-name-input"
              name="name"
              type="text"
              required
              maxLength={100}
              placeholder="e.g. HDFC Salary Account, Paytm Wallet, Cash"
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
            />
            {errors.name && <span className="field-error-text">{errors.name}</span>}
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="account-type-select">
                Account Type *
              </label>
              <select
                id="account-type-select"
                name="type"
                className={`form-control ${errors.type ? 'is-invalid' : ''}`}
                value={formData.type}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {errors.type && <span className="field-error-text">{errors.type}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="opening-balance-input">
                {isCredit ? 'Initial Unpaid Debt (₹)' : 'Opening Balance (₹) *'}
              </label>
              <input
                id="opening-balance-input"
                name="opening_balance"
                type="number"
                step="0.01"
                min="0"
                className={`form-control ${errors.opening_balance ? 'is-invalid' : ''}`}
                value={formData.opening_balance}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.opening_balance && (
                <span className="field-error-text">{errors.opening_balance}</span>
              )}
            </div>
          </div>

          {isCredit && (
            <div className="liability-warning-notice">
              <Info size={16} className="flex-shrink-0" />
              <div>
                <strong>Credit Card Accounting:</strong> Credit cards are treated as financial liabilities (debt). Expenses charged to this card increase outstanding debt, and transfers to this card pay down the debt.
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Theme Color Accent</label>
            <div className="color-swatches">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch-btn ${formData.color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setFormData((prev) => ({ ...prev, color: c }))}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label" htmlFor="account-notes-input">
              Notes (Optional)
            </label>
            <textarea
              id="account-notes-input"
              name="notes"
              rows={2}
              maxLength={500}
              placeholder="e.g. Account number, billing cycle, branch info"
              className="form-control"
              value={formData.notes}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
