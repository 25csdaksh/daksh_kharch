import React, { useState, useEffect } from 'react';
import {
  X,
  IndianRupee,
  Calendar,
  CreditCard,
  Hash,
  FileText,
  AlertCircle,
  Loader2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2
} from 'lucide-react';
import { recordEntry, getContacts, getContactById } from '../../services/ledgerService';
import { getAccounts } from '../../services/accountService';
import { calculateContactBalance, formatLedgerINR, generateIdempotencyKey } from '../../utils/ledgerEngine';
import './RecordTransactionModal.css';

export default function RecordTransactionModal({
  isOpen,
  onClose,
  initialContactId = null,
  initialType = 'lend',
  onRecorded
}) {
  const [contacts, setContacts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [contactId, setContactId] = useState(initialContactId || '');
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactBalance, setContactBalance] = useState(null);

  const [entryType, setEntryType] = useState(initialType || 'lend');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load contacts and accounts on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
      setIsLoadingContacts(true);
      try {
        const [cList, aList] = await Promise.all([
          getContacts({ includeArchived: false }),
          getAccounts({ includeArchived: false }).catch(() => [])
        ]);
        if (isMounted) {
          setContacts(cList);
          setAccounts(aList);
          if (initialContactId) {
            setContactId(initialContactId);
          } else if (cList.length > 0 && !contactId) {
            setContactId(cList[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading ledger modal options:', err);
      } finally {
        if (isMounted) setIsLoadingContacts(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, initialContactId]);

  // Sync selected contact details and calculate active balance
  useEffect(() => {
    if (!contactId || contacts.length === 0) {
      setSelectedContact(null);
      setContactBalance(null);
      return;
    }

    const contact = contacts.find((c) => c.id === contactId);
    setSelectedContact(contact || null);

    let isMounted = true;
    import('../../services/ledgerService').then(({ getEntries }) => {
      getEntries({ contactId }).then((entries) => {
        if (isMounted) {
          const bal = calculateContactBalance(entries);
          setContactBalance(bal);
        }
      });
    });

    return () => {
      isMounted = false;
    };
  }, [contactId, contacts]);

  // Reset fields when type changes
  useEffect(() => {
    if (initialType) {
      setEntryType(initialType);
    }
  }, [initialType]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!contactId) {
      setErrorMessage('Please select a person / contact.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than zero.');
      return;
    }

    if (entryType === 'adjustment' && !adjustmentReason.trim()) {
      setErrorMessage('Please provide a mandatory reason for this adjustment.');
      return;
    }

    // Repayment limit guard
    if (entryType === 'repay_received' && contactBalance) {
      if (numAmount > contactBalance.receivable) {
        setErrorMessage(
          `Repayment received (${formatLedgerINR(numAmount)}) cannot exceed total outstanding receivable (${formatLedgerINR(contactBalance.receivable)}).`
        );
        return;
      }
    } else if (entryType === 'repay_paid' && contactBalance) {
      if (numAmount > contactBalance.payable) {
        setErrorMessage(
          `Repayment paid (${formatLedgerINR(numAmount)}) cannot exceed total outstanding payable (${formatLedgerINR(contactBalance.payable)}).`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await recordEntry({
        contact_id: contactId,
        entry_type: entryType,
        amount: numAmount,
        transaction_date: transactionDate,
        due_date: dueDate || null,
        description,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        linked_account_id: linkedAccountId || null,
        adjustment_reason: adjustmentReason,
        idempotency_key: generateIdempotencyKey('tx')
      });

      if (onRecorded) onRecorded();
      onClose();
    } catch (err) {
      console.error('Error recording ledger entry:', err);
      setErrorMessage(err.message || 'Failed to record entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ledger-modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="ledger-modal-header">
          <div className="ledger-modal-title-wrap">
            <div className={`ledger-modal-icon ${entryType.startsWith('repay') ? 'icon-repay' : ''}`}>
              {entryType === 'lend' || entryType === 'repay_received' ? (
                <ArrowDownLeft size={20} />
              ) : (
                <ArrowUpRight size={20} />
              )}
            </div>
            <div>
              <h2 className="ledger-modal-title">Record Ledger Transaction</h2>
              <p className="ledger-modal-subtitle">
                {entryType === 'lend' && 'Money Lent (Person owes you)'}
                {entryType === 'borrow' && 'Money Borrowed (You owe person)'}
                {entryType === 'repay_received' && 'Receive Repayment (Settlement received)'}
                {entryType === 'repay_paid' && 'Pay Repayment (Settlement paid)'}
                {entryType === 'adjustment' && 'Adjustment (Manual correction)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ledger-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="ledger-alert ledger-alert-error" role="alert">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ledger-modal-form">
          {/* Person Selection */}
          <div className="ledger-form-field">
            <label className="ledger-form-label" htmlFor="select-contact">
              Select Person <span className="required-star">*</span>
            </label>
            <select
              id="select-contact"
              className="ledger-select"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              required
            >
              <option value="" disabled>-- Select a person --</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Contact Balance Indicator */}
          {selectedContact && contactBalance && (
            <div className="ledger-contact-quick-badge">
              <div className="quick-badge-col">
                <span className="badge-col-label">Receivable:</span>
                <span className="badge-col-val text-emerald">{formatLedgerINR(contactBalance.receivable)}</span>
              </div>
              <div className="quick-badge-divider" />
              <div className="quick-badge-col">
                <span className="badge-col-label">Payable:</span>
                <span className="badge-col-val text-danger">{formatLedgerINR(contactBalance.payable)}</span>
              </div>
              <div className="quick-badge-divider" />
              <div className="quick-badge-col">
                <span className="badge-col-label">Net Position:</span>
                <span className={`badge-col-val font-bold ${contactBalance.netBalance >= 0 ? 'text-emerald' : 'text-danger'}`}>
                  {formatLedgerINR(contactBalance.netBalance)}
                </span>
              </div>
            </div>
          )}

          {/* Transaction Type Tabs */}
          <div className="ledger-form-field">
            <label className="ledger-form-label">Transaction Type</label>
            <div className="ledger-type-tabs">
              <button
                type="button"
                className={`type-tab-btn ${entryType === 'lend' ? 'tab-active-lend' : ''}`}
                onClick={() => setEntryType('lend')}
              >
                Lend
              </button>
              <button
                type="button"
                className={`type-tab-btn ${entryType === 'borrow' ? 'tab-active-borrow' : ''}`}
                onClick={() => setEntryType('borrow')}
              >
                Borrow
              </button>
              <button
                type="button"
                className={`type-tab-btn ${entryType === 'repay_received' ? 'tab-active-rec' : ''}`}
                onClick={() => setEntryType('repay_received')}
              >
                Got Repayment
              </button>
              <button
                type="button"
                className={`type-tab-btn ${entryType === 'repay_paid' ? 'tab-active-paid' : ''}`}
                onClick={() => setEntryType('repay_paid')}
              >
                Paid Back
              </button>
              <button
                type="button"
                className={`type-tab-btn ${entryType === 'adjustment' ? 'tab-active-adj' : ''}`}
                onClick={() => setEntryType('adjustment')}
              >
                Adjust
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="ledger-form-field">
            <label className="ledger-form-label" htmlFor="tx-amount">
              Amount <span className="required-star">*</span>
            </label>
            <div className="ledger-input-wrap">
              <IndianRupee size={16} className="ledger-field-icon" />
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="ledger-text-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Date & Optional Due Date */}
          <div className="ledger-form-row">
            <div className="ledger-form-field">
              <label className="ledger-form-label" htmlFor="tx-date">
                Transaction Date
              </label>
              <div className="ledger-input-wrap">
                <Calendar size={16} className="ledger-field-icon" />
                <input
                  id="tx-date"
                  type="date"
                  className="ledger-text-input"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="ledger-form-field">
              <label className="ledger-form-label" htmlFor="tx-due-date">
                Due Date (Optional)
              </label>
              <div className="ledger-input-wrap">
                <Calendar size={16} className="ledger-field-icon" />
                <input
                  id="tx-due-date"
                  type="date"
                  className="ledger-text-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Payment Method & Linked Account */}
          <div className="ledger-form-row">
            <div className="ledger-form-field">
              <label className="ledger-form-label" htmlFor="tx-method">
                Payment Method
              </label>
              <div className="ledger-input-wrap">
                <CreditCard size={16} className="ledger-field-icon" />
                <select
                  id="tx-method"
                  className="ledger-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="ledger-form-field">
              <label className="ledger-form-label" htmlFor="tx-account">
                Linked Wallet / Account
              </label>
              <div className="ledger-input-wrap">
                <Wallet size={16} className="ledger-field-icon" />
                <select
                  id="tx-account"
                  className="ledger-select"
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                >
                  <option value="">-- No Account Link (Debt Only) --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Reference Number */}
          <div className="ledger-form-field">
            <label className="ledger-form-label" htmlFor="tx-ref">
              Reference / UPI Transaction ID (Optional)
            </label>
            <div className="ledger-input-wrap">
              <Hash size={16} className="ledger-field-icon" />
              <input
                id="tx-ref"
                type="text"
                className="ledger-text-input"
                placeholder="e.g. UPI Ref: 32918239123"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>

          {/* Adjustment Reason (If adjustment) */}
          {entryType === 'adjustment' && (
            <div className="ledger-form-field">
              <label className="ledger-form-label" htmlFor="tx-adj-reason">
                Adjustment Reason <span className="required-star">*</span>
              </label>
              <input
                id="tx-adj-reason"
                type="text"
                className="ledger-text-input"
                placeholder="e.g. Corrected manual error, discount given, mutual waiver"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                maxLength={500}
                required
              />
            </div>
          )}

          {/* Notes / Description */}
          <div className="ledger-form-field">
            <label className="ledger-form-label" htmlFor="tx-desc">
              Description / Notes (Optional)
            </label>
            <textarea
              id="tx-desc"
              className="ledger-textarea"
              placeholder="e.g. Lunch split share, emergency cash borrowed, ticket booking..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="ledger-modal-actions">
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
              className="btn btn-primary ledger-btn-submit"
              disabled={isSubmitting || contacts.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Confirm & Record</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
