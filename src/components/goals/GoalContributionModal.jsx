import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  Landmark,
  Info,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { formatCurrencyINR, getTodayLocalDateString } from '../../utils/dateUtils';
import { validateGoalTransactionInput } from '../../utils/goalUtils';
import { addGoalContribution, recordGoalWithdrawal } from '../../services/goalService';
import './GoalModal.css';
import './GoalContributionModal.css';

export default function GoalContributionModal({
  isOpen,
  onClose,
  goal,
  accounts = [],
  onSuccess
}) {
  const [type, setType] = useState('contribution');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(getTodayLocalDateString());
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType('contribution');
      setAmount('');
      setTransactionDate(getTodayLocalDateString());
      setSelectedAccountId('');
      setNote('');
      setErrors({});
      setServerError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, goal]);

  if (!isOpen || !goal) return null;

  const currentSaved = Number(goal.current_amount || 0);
  const target = Number(goal.target_amount || 0);
  const remaining = Math.max(0, target - currentSaved);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setServerError(null);
    const numAmount = parseFloat(amount);

    const validation = validateGoalTransactionInput(
      {
        type,
        amount: numAmount,
        transaction_date: transactionDate,
        note
      },
      currentSaved
    );

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);

      if (type === 'contribution') {
        await addGoalContribution(goal.id, {
          amount: numAmount,
          transaction_date: transactionDate,
          note: note.trim() || null,
          source_account_id: selectedAccountId || null
        });
      } else {
        await recordGoalWithdrawal(goal.id, {
          amount: numAmount,
          transaction_date: transactionDate,
          note: note.trim() || null,
          destination_account_id: selectedAccountId || null
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Goal transaction submission error:', err);
      setServerError(err.message || 'Failed to record transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const assetAccounts = accounts.filter((a) => !a.is_archived && a.type !== 'credit_card');

  return (
    <div className="goal-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="contrib-modal-title">
      <div className="goal-modal-container contrib-modal-container">
        <div className="goal-modal-header">
          <h2 id="contrib-modal-title" className="goal-modal-title">
            {type === 'contribution' ? (
              <PlusCircle size={20} className="text-emerald" />
            ) : (
              <MinusCircle size={20} className="text-danger" />
            )}
            <span>{type === 'contribution' ? 'Add Goal Contribution' : 'Record Goal Withdrawal'}</span>
          </h2>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="goal-modal-body">
          {serverError && (
            <div className="modal-error-banner" role="alert">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Toggle Type: Contribution vs Withdrawal */}
          <div className="contrib-type-toggle">
            <button
              type="button"
              className={`contrib-toggle-btn ${type === 'contribution' ? 'active-contrib' : ''}`}
              onClick={() => {
                setType('contribution');
                setErrors({});
              }}
            >
              <PlusCircle size={16} />
              <span>Contribution (+)</span>
            </button>
            <button
              type="button"
              className={`contrib-toggle-btn ${type === 'withdrawal' ? 'active-withdraw' : ''}`}
              onClick={() => {
                setType('withdrawal');
                setErrors({});
              }}
            >
              <MinusCircle size={16} />
              <span>Withdrawal (−)</span>
            </button>
          </div>

          {/* Goal Summary Pill */}
          <div className="contrib-goal-summary-banner">
            <div className="contrib-summary-left">
              <span className="contrib-summary-goal-title">{goal.name}</span>
              <span className="contrib-summary-goal-sub">
                Target: {formatCurrencyINR(goal.target_amount, false)}
              </span>
            </div>
            <div className="contrib-summary-right">
              <div className="contrib-summary-saved">{formatCurrencyINR(currentSaved, false)}</div>
              <div className="contrib-summary-remaining">
                {currentSaved >= target ? 'Goal Completed' : `${formatCurrencyINR(remaining, false)} left`}
              </div>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label htmlFor="contrib_amount" className="goal-form-label">
              {type === 'contribution' ? 'Contribution Amount (₹ INR)' : 'Withdrawal Amount (₹ INR)'}{' '}
              <span className="required-star">*</span>
            </label>
            <input
              id="contrib_amount"
              type="number"
              step="any"
              min="0.01"
              max={type === 'withdrawal' ? currentSaved : undefined}
              placeholder="e.g. 5000"
              className={`goal-form-input ${errors.amount ? 'input-error' : ''}`}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors({ ...errors, amount: null });
              }}
              required
              autoFocus
            />
            {errors.amount && <div className="goal-form-error-msg">{errors.amount}</div>}
          </div>

          {/* Transaction Date */}
          <div>
            <label htmlFor="contrib_date" className="goal-form-label">
              Date <span className="required-star">*</span>
            </label>
            <input
              id="contrib_date"
              type="date"
              className={`goal-form-input ${errors.transaction_date ? 'input-error' : ''}`}
              value={transactionDate}
              onChange={(e) => {
                setTransactionDate(e.target.value);
                if (errors.transaction_date) setErrors({ ...errors, transaction_date: null });
              }}
              required
            />
            {errors.transaction_date && (
              <div className="goal-form-error-msg">{errors.transaction_date}</div>
            )}
          </div>

          {/* Account Selection */}
          <div>
            <label htmlFor="contrib_account" className="goal-form-label">
              {type === 'contribution' ? 'Funding Bank / Wallet (Optional)' : 'Destination Account (Optional)'}
            </label>
            <select
              id="contrib_account"
              className="goal-form-select"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="">
                {type === 'contribution'
                  ? 'Virtual Goal Tracking (No Real Bank Movement)'
                  : 'Virtual Goal Adjustment (No Bank Deposit)'}
              </option>
              {assetAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Accounting explanation pill */}
          <div className="contrib-info-box">
            <Info size={18} className="flex-shrink-0 text-secondary" style={{ marginTop: '2px' }} />
            <div>
              <strong>Accounting Rule:</strong> Goal contributions are tracking milestones, not personal expenses or income.
              {goal.linked_account && selectedAccountId && selectedAccountId !== goal.linked_account_id ? (
                <span>
                  {' '}Since this goal is linked to <strong>{goal.linked_account.name}</strong>, submitting will automatically log an inter-account transfer.
                </span>
              ) : (
                <span>
                  {' '}This transaction updates your goal progress without altering unrelated personal expenses or inflating personal income.
                </span>
              )}
            </div>
          </div>

          {/* Note / Memo */}
          <div>
            <label htmlFor="contrib_note" className="goal-form-label">
              Note (Optional)
            </label>
            <input
              id="contrib_note"
              type="text"
              placeholder="e.g. Monthly salary savings, bonus, Diwali deposit"
              className="goal-form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="goal-modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              style={{
                backgroundColor: type === 'withdrawal' ? '#DC2626' : '#064E3B'
              }}
              disabled={isSubmitting}
            >
              {type === 'contribution' ? <PlusCircle size={16} /> : <MinusCircle size={16} />}
              <span>
                {isSubmitting
                  ? 'Recording...'
                  : type === 'contribution'
                  ? 'Add Contribution'
                  : 'Record Withdrawal'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
