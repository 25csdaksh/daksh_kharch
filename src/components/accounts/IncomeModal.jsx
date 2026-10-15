import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  AlertCircle,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import {
  INCOME_SOURCES,
  validateIncomeInput
} from '../../utils/accountUtils';
import { getTodayLocalDateString, formatCurrencyINR } from '../../utils/dateUtils';
import { createIncome } from '../../services/accountService';
import './IncomeModal.css';

export default function IncomeModal({
  isOpen,
  onClose,
  accounts = [],
  initialAccount = null,
  onSuccess
}) {
  const activeAccounts = accounts.filter((a) => !a.is_archived && a.type !== 'credit_card');

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('Salary');
  const [incomeDate, setIncomeDate] = useState(getTodayLocalDateString());
  const [description, setDescription] = useState('');

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccountId(initialAccount?.id || (activeAccounts[0]?.id ?? ''));
      setAmount('');
      setSource('Salary');
      setIncomeDate(getTodayLocalDateString());
      setDescription('');
      setErrors({});
      setServerError('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialAccount, accounts]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const numAmount = Number(amount);
    const payload = {
      account_id: accountId || null,
      amount: numAmount,
      source,
      income_date: incomeDate,
      description
    };

    const validation = validateIncomeInput(payload);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await createIncome({
        accountId: accountId || null,
        amount: numAmount,
        source,
        incomeDate,
        description
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error recording income:', err);
      setServerError(err.message || 'Failed to record income.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container income-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" style={{ background: '#10B981', color: '#FFF' }} aria-hidden="true">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="modal-title">Record Income / Deposit</h2>
              <p className="modal-subtitle">Add funds to your wallet or bank account</p>
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

          <div className="form-group">
            <label className="form-label" htmlFor="income-amount-input">
              Amount (₹) *
            </label>
            <input
              id="income-amount-input"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="e.g. 50000"
              className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
              }}
              disabled={isSubmitting}
            />
            {errors.amount && <span className="field-error-text">{errors.amount}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="income-account-select">
              Deposit Into Account
            </label>
            <select
              id="income-account-select"
              className="form-control"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Unassigned (General Income)</option>
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Income Source *</label>
            <div className="income-source-chips">
              {INCOME_SOURCES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`source-chip ${source === s ? 'active' : ''}`}
                  onClick={() => setSource(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row-2" style={{ marginTop: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="income-date-input">
                Deposit Date *
              </label>
              <input
                id="income-date-input"
                type="date"
                required
                className="form-control"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="income-desc-input">
                Note / Description
              </label>
              <input
                id="income-desc-input"
                type="text"
                maxLength={500}
                placeholder="e.g. October monthly salary"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
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
              disabled={isSubmitting || !Number(amount)}
            >
              {isSubmitting ? 'Recording...' : 'Add Income'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
