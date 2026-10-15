import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import { ALLOWED_PAYMENT_METHODS, getTodayLocalDateString, formatCurrencyINR } from '../../utils/dateUtils';
import { markOccurrencePaid } from '../../services/recurringService';
import './MarkPaidModal.css';

export default function MarkPaidModal({
  isOpen,
  onClose,
  occurrence,
  onSuccess
}) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && occurrence) {
      setError(null);
      setIsSubmitting(false);

      const defaultAmount = occurrence.actual_paid_amount || occurrence.schedule?.amount || '';
      setAmount(String(defaultAmount));
      setPaymentDate(getTodayLocalDateString());
      setPaymentMethod(occurrence.schedule?.payment_method || 'UPI');
    }
  }, [isOpen, occurrence]);

  if (!isOpen || !occurrence) return null;

  const schedule = occurrence.schedule || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive payment amount.');
      return;
    }
    if (!paymentDate) {
      setError('Payment date is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await markOccurrencePaid({
        occurrenceId: occurrence.id,
        actualPaidAmount: numAmount,
        actualPaymentDate: paymentDate,
        paymentMethod
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error recording payment:', err);
      setError(err.message || 'Failed to record bill payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container mark-paid-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge badge-green" aria-hidden="true">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="modal-title">Record Bill Payment</h2>
              <p className="modal-subtitle">
                {schedule.title} ({occurrence.scheduled_due_date})
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

          {/* Bill Summary Banner */}
          <div className="paid-bill-summary-card">
            <div className="summary-col">
              <span className="summary-label">Scheduled Amount</span>
              <span className="summary-val">{formatCurrencyINR(schedule.amount, false)}</span>
            </div>
            <div className="summary-col text-right">
              <span className="summary-label">Scheduled Due Date</span>
              <span className="summary-val">{occurrence.scheduled_due_date}</span>
            </div>
          </div>

          {/* Actual Paid Amount */}
          <div className="form-group">
            <label className="form-label" htmlFor="paid-amount-input">
              Actual Paid Amount (₹)
            </label>
            <div className="input-currency-wrap">
              <span className="currency-prefix">₹</span>
              <input
                id="paid-amount-input"
                type="number"
                step="0.01"
                min="1"
                max="9999999999.99"
                className="form-control input-with-prefix"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Payment Date & Method Row */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="paid-date-input">
                Payment Date
              </label>
              <input
                id="paid-date-input"
                type="date"
                className="form-control"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="paid-method-select">
                Payment Method
              </label>
              <select
                id="paid-method-select"
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {ALLOWED_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Safe Accounting Guarantee Notice */}
          <div className="accounting-rule-callout">
            <ShieldCheck size={18} className="callout-shield-icon" aria-hidden="true" />
            <div className="callout-text">
              <strong>Ledger Accounting Rule:</strong> Confirming this payment automatically creates an official personal expense entry in your ledger and advances the schedule to the next occurrence. It will never create duplicates on retry.
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
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
              className="btn btn-primary btn-confirm-paid"
              disabled={isSubmitting}
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Recording...' : 'Confirm Payment & Log Expense'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
