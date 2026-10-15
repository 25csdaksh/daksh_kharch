import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import {
  validateTransferInput,
  isLiabilityAccount
} from '../../utils/accountUtils';
import { getTodayLocalDateString, formatCurrencyINR } from '../../utils/dateUtils';
import { createTransfer } from '../../services/accountService';
import './TransferModal.css';

export default function TransferModal({
  isOpen,
  onClose,
  accounts = [],
  initialSourceAccount = null,
  onSuccess
}) {
  const activeAccounts = accounts.filter((a) => !a.is_archived);

  const [sourceAccountId, setSourceAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [transferDate, setTransferDate] = useState(getTodayLocalDateString());
  const [note, setNote] = useState('');

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultSource = initialSourceAccount?.id || (activeAccounts[0]?.id ?? '');
      const defaultDest = activeAccounts.find((a) => a.id !== defaultSource)?.id ?? '';

      setSourceAccountId(defaultSource);
      setDestinationAccountId(defaultDest);
      setAmount('');
      setTransferDate(getTodayLocalDateString());
      setNote('');
      setErrors({});
      setServerError('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialSourceAccount, accounts]);

  if (!isOpen) return null;

  const sourceAccount = activeAccounts.find((a) => a.id === sourceAccountId);
  const destinationAccount = activeAccounts.find((a) => a.id === destinationAccountId);

  const numAmount = Number(amount) || 0;
  const isSourceAsset = sourceAccount && !isLiabilityAccount(sourceAccount.type);
  const sourceAvailableBalance = sourceAccount?.computed?.balance ?? sourceAccount?.opening_balance ?? 0;
  const hasInsufficientFunds = isSourceAsset && numAmount > sourceAvailableBalance && numAmount > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const payload = {
      source_account_id: sourceAccountId,
      destination_account_id: destinationAccountId,
      amount: numAmount,
      transfer_date: transferDate,
      note
    };

    const validation = validateTransferInput(payload, sourceAccount);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await createTransfer({
        sourceAccountId,
        destinationAccountId,
        amount: numAmount,
        transferDate,
        note
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Transfer failed:', err);
      setServerError(err.message || 'Transfer failed. Please check inputs and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container transfer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" aria-hidden="true">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className="modal-title">Transfer Funds</h2>
              <p className="modal-subtitle">Move money between your accounts & wallets</p>
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

          <div className="transfer-accounts-flow">
            <div className="transfer-node">
              <label className="form-label" htmlFor="source-acc-select">
                Source Account
              </label>
              <select
                id="source-acc-select"
                className={`form-control ${errors.source_account_id ? 'is-invalid' : ''}`}
                value={sourceAccountId}
                onChange={(e) => {
                  setSourceAccountId(e.target.value);
                  if (errors.source_account_id) setErrors((prev) => ({ ...prev, source_account_id: null }));
                }}
                disabled={isSubmitting}
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrencyINR(a.computed?.balance ?? a.opening_balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="transfer-arrow-icon" aria-hidden="true">
              <ArrowRight size={18} />
            </div>

            <div className="transfer-node">
              <label className="form-label" htmlFor="dest-acc-select">
                Destination Account
              </label>
              <select
                id="dest-acc-select"
                className={`form-control ${errors.destination_account_id ? 'is-invalid' : ''}`}
                value={destinationAccountId}
                onChange={(e) => {
                  setDestinationAccountId(e.target.value);
                  if (errors.destination_account_id) setErrors((prev) => ({ ...prev, destination_account_id: null }));
                }}
                disabled={isSubmitting}
              >
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === sourceAccountId}>
                    {a.name} {a.id === sourceAccountId ? '(Selected as source)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errors.destination_account_id && (
            <div className="field-error-text" style={{ marginTop: '-0.75rem', marginBottom: '0.75rem' }}>
              {errors.destination_account_id}
            </div>
          )}

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="transfer-amount-input">
                Amount (₹) *
              </label>
              <input
                id="transfer-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
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
              <label className="form-label" htmlFor="transfer-date-input">
                Transfer Date *
              </label>
              <input
                id="transfer-date-input"
                type="date"
                required
                className={`form-control ${errors.transfer_date ? 'is-invalid' : ''}`}
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label" htmlFor="transfer-note-input">
              Note (Optional)
            </label>
            <input
              id="transfer-note-input"
              type="text"
              maxLength={500}
              placeholder="e.g. Credit Card bill payment, ATM cash withdrawal"
              className="form-control"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {hasInsufficientFunds && (
            <div className="transfer-warning-box">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <div>
                <strong>Low Balance Notice:</strong> Transfer amount ({formatCurrencyINR(numAmount)}) exceeds available balance in {sourceAccount?.name} ({formatCurrencyINR(sourceAvailableBalance)}).
              </div>
            </div>
          )}

          {numAmount > 0 && sourceAccount && destinationAccount && (
            <div className="transfer-impact-box">
              <div className="transfer-impact-title">
                <ShieldCheck size={16} />
                <span>Accounting & Balance Impact</span>
              </div>
              <div>
                • Deducts <strong>{formatCurrencyINR(numAmount)}</strong> from <strong>{sourceAccount.name}</strong>.
              </div>
              <div>
                • Deposits <strong>{formatCurrencyINR(numAmount)}</strong> into <strong>{destinationAccount.name}</strong>
                {isLiabilityAccount(destinationAccount.type) ? ' (reduces outstanding credit debt)' : ''}.
              </div>
              <div style={{ marginTop: '0.25rem', fontSize: '0.775rem', opacity: 0.9 }}>
                Note: Inter-account transfers are balance movements and do NOT count as personal expenses or income in reports.
              </div>
            </div>
          )}

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
              disabled={isSubmitting || !numAmount}
            >
              {isSubmitting ? 'Transferring...' : 'Confirm Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
