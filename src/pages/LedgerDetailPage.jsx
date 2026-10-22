import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  IndianRupee,
  Calendar,
  CreditCard,
  Download,
  FileSpreadsheet,
  Plus,
  Share2,
  Edit2,
  Archive,
  RotateCcw,
  AlertTriangle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  Hash,
  MessageCircle
} from 'lucide-react';
import {
  getContactSummary,
  archiveContact,
  reverseEntry
} from '../services/ledgerService';
import { formatLedgerINR } from '../utils/ledgerEngine';
import { generateLedgerStatementPDF, generateLedgerStatementCSV } from '../utils/ledgerStatementPDF';
import AddPersonModal from '../components/ledger/AddPersonModal';
import RecordTransactionModal from '../components/ledger/RecordTransactionModal';
import './LedgerDetailPage.css';

export default function LedgerDetailPage() {
  const { contactId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(null);
  const [entries, setEntries] = useState([]);
  const [balance, setBalance] = useState({
    totalLent: 0,
    totalRepaidReceived: 0,
    receivable: 0,
    totalBorrowed: 0,
    totalRepaidPaid: 0,
    payable: 0,
    netBalance: 0,
    status: 'settled',
    lastActivityDate: null,
    due_date: null
  });

  // Modals state
  const [isEditPersonOpen, setIsEditPersonOpen] = useState(false);
  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [modalType, setModalType] = useState('lend');

  // Filters state
  const [typeFilter, setTypeFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  const loadContactData = async () => {
    try {
      setLoading(true);
      const summary = await getContactSummary(contactId);
      if (!summary) {
        navigate('/ledger', { replace: true });
        return;
      }
      setContact(summary.contact);
      setEntries(summary.entries);
      setBalance(summary.balance);
    } catch (err) {
      console.error('Error loading contact summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContactData();

    const handleChanged = () => {
      loadContactData();
    };
    window.addEventListener('ledger:changed', handleChanged);
    return () => {
      window.removeEventListener('ledger:changed', handleChanged);
    };
  }, [contactId]);

  // Filtered entries list
  const filteredEntries = useMemo(() => {
    let list = [...entries];

    if (typeFilter !== 'all') {
      list = list.filter((e) => e.entry_type === typeFilter);
    }

    if (methodFilter !== 'all') {
      list = list.filter((e) => (e.payment_method || 'Cash') === methodFilter);
    }

    return list;
  }, [entries, typeFilter, methodFilter]);

  const openRecordModal = (type) => {
    setModalType(type);
    setIsRecordTxOpen(true);
  };

  const handleArchiveToggle = async () => {
    if (!contact) return;
    const confirmMsg = contact.is_archived
      ? `Unarchive account for ${contact.name}?`
      : `Archive account for ${contact.name}? The transaction history will be preserved.`;
    if (window.confirm(confirmMsg)) {
      await archiveContact(contact.id, !contact.is_archived);
      loadContactData();
    }
  };

  const handleConfirmReversal = async (e) => {
    e.preventDefault();
    if (!reversalTarget) return;
    try {
      setIsReversing(true);
      await reverseEntry(reversalTarget.id, reversalReason || 'Reversed by user');
      setReversalTarget(null);
      setReversalReason('');
      loadContactData();
    } catch (err) {
      alert(err.message || 'Failed to reverse entry.');
    } finally {
      setIsReversing(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!contact) return;
    const amountStr = formatLedgerINR(Math.abs(balance.netBalance));
    let text = '';
    if (balance.netBalance > 0) {
      text = `Hello ${contact.name}, this is a gentle reminder regarding the pending balance of ${amountStr} on our HisabSetu account. Please check your convenience. Thank you!`;
    } else if (balance.netBalance < 0) {
      text = `Hello ${contact.name}, I am following up on our account balance of ${amountStr} which I need to repay. Please let me know your preferred payment method.`;
    } else {
      text = `Hello ${contact.name}, our HisabSetu ledger account is currently fully settled (₹0.00). Thank you!`;
    }

    const cleanPhone = (contact.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="ledger-detail-container">
        <div className="ledger-loading-card card">
          <RefreshCw size={24} className="animate-spin text-muted" />
          <p>Loading account statement...</p>
        </div>
      </div>
    );
  }

  if (!contact) return null;

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'LE';

  const isOverdue =
    balance.due_date &&
    balance.due_date < new Date().toISOString().split('T')[0] &&
    balance.receivable > 0;

  return (
    <div className="ledger-detail-container">
      {/* 1. Top Navigation Bar */}
      <div className="detail-top-nav">
        <button
          type="button"
          className="btn-back"
          onClick={() => navigate('/ledger')}
          aria-label="Back to My Ledger"
        >
          <ArrowLeft size={16} />
          <span>Back to Ledger</span>
        </button>

        <div className="detail-nav-actions">
          <button
            type="button"
            className="btn btn-outline btn-export"
            onClick={() => generateLedgerStatementPDF({ contact, balance, entries })}
            title="Download PDF Statement"
          >
            <Download size={15} />
            <span>PDF Statement</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-export"
            onClick={() => generateLedgerStatementCSV({ contact, balance, entries })}
            title="Export CSV Statement"
          >
            <FileSpreadsheet size={15} />
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-share-wa"
            onClick={handleShareWhatsApp}
            title="Share reminder on WhatsApp"
          >
            <MessageCircle size={15} />
            <span>Share Reminder</span>
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setIsEditPersonOpen(true)}
            title="Edit contact details"
          >
            <Edit2 size={15} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className={`btn btn-outline ${contact.is_archived ? 'btn-unarchive' : 'btn-archive'}`}
            onClick={handleArchiveToggle}
            title={contact.is_archived ? 'Unarchive Contact' : 'Archive Contact'}
          >
            <Archive size={15} />
            <span>{contact.is_archived ? 'Unarchive' : 'Archive'}</span>
          </button>
        </div>
      </div>

      {/* 2. Person Profile Card */}
      <div className="contact-hero-card card">
        <div className="contact-hero-main">
          <div className="contact-hero-avatar">{initials}</div>
          <div className="contact-hero-info">
            <div className="hero-name-row">
              <h1 className="hero-contact-name">{contact.name}</h1>
              {contact.is_archived && <span className="archived-tag">Archived Account</span>}
            </div>

            <div className="hero-meta-row">
              {contact.phone && (
                <span className="hero-meta-item">
                  <Phone size={13} />
                  <a href={`tel:${contact.phone}`} className="phone-link">
                    {contact.phone}
                  </a>
                </span>
              )}
              {contact.email && (
                <span className="hero-meta-item">
                  <Mail size={13} />
                  <a href={`mailto:${contact.email}`} className="email-link">
                    {contact.email}
                  </a>
                </span>
              )}
              <span className="hero-meta-item">
                <Clock size={13} />
                Joined: {new Date(contact.created_at).toLocaleDateString('en-IN')}
              </span>
            </div>

            {contact.notes && (
              <p className="hero-contact-notes">
                <strong>Notes:</strong> {contact.notes}
              </p>
            )}
          </div>
        </div>

        {/* Hero Balance Summary Box */}
        <div className="contact-hero-balance-box">
          <div className="balance-box-header">
            <span className="balance-box-label">Net Balance</span>
            <span
              className={`balance-status-tag ${
                balance.status === 'receivable'
                  ? 'status-rec'
                  : balance.status === 'payable'
                  ? 'status-pay'
                  : 'status-settled'
              }`}
            >
              {balance.status === 'receivable' && 'They Owe You'}
              {balance.status === 'payable' && 'You Owe'}
              {balance.status === 'settled' && 'Account Settled'}
            </span>
          </div>

          <div
            className={`balance-box-value ${
              balance.netBalance >= 0 ? 'text-emerald' : 'text-danger'
            }`}
          >
            {formatLedgerINR(balance.netBalance)}
          </div>

          {isOverdue && (
            <div className="hero-overdue-alert">
              <AlertTriangle size={14} />
              <span>Overdue since {balance.due_date}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Accounting Stats Bar */}
      <div className="ledger-stats-bar card">
        <div className="stat-card">
          <span className="stat-card-label">Total Lent</span>
          <span className="stat-card-val text-emerald">
            {formatLedgerINR(balance.totalLent)}
          </span>
          <span className="stat-card-sub">Gross loans extended</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Repayments Received</span>
          <span className="stat-card-val text-emerald font-semibold">
            {formatLedgerINR(balance.totalRepaidReceived)}
          </span>
          <span className="stat-card-sub">Recovered to date</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Total Borrowed</span>
          <span className="stat-card-val text-danger">
            {formatLedgerINR(balance.totalBorrowed)}
          </span>
          <span className="stat-card-sub">Gross borrowings</span>
        </div>

        <div className="stat-card">
          <span className="stat-card-label">Repayments Paid</span>
          <span className="stat-card-val text-danger font-semibold">
            {formatLedgerINR(balance.totalRepaidPaid)}
          </span>
          <span className="stat-card-sub">Repaid to date</span>
        </div>
      </div>

      {/* 4. Action Buttons Bar */}
      <div className="ledger-action-ribbon card">
        <span className="ribbon-title">Record Transaction for {contact.name}:</span>
        <div className="ribbon-btn-group">
          <button
            type="button"
            className="btn btn-primary btn-ribbon btn-lend"
            onClick={() => openRecordModal('lend')}
          >
            <ArrowDownLeft size={16} />
            <span>Lend Money</span>
          </button>

          <button
            type="button"
            className="btn btn-outline btn-ribbon btn-borrow"
            onClick={() => openRecordModal('borrow')}
          >
            <ArrowUpRight size={16} />
            <span>Borrow Money</span>
          </button>

          {balance.receivable > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-ribbon btn-repay-rec"
              onClick={() => openRecordModal('repay_received')}
            >
              <CheckCircle2 size={16} />
              <span>Record Repayment Received</span>
            </button>
          )}

          {balance.payable > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-ribbon btn-repay-paid"
              onClick={() => openRecordModal('repay_paid')}
            >
              <CheckCircle2 size={16} />
              <span>Pay Repayment</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-outline btn-ribbon"
            onClick={() => openRecordModal('adjustment')}
          >
            <RotateCcw size={16} />
            <span>Adjustment</span>
          </button>
        </div>
      </div>

      {/* 5. Statement Transaction History */}
      <div className="statement-history-card card">
        <div className="history-header">
          <div>
            <h2 className="history-title">Account History & Statement</h2>
            <p className="history-subtitle">
              Chronological ledger of all loans, borrowings, repayments, and adjustments.
            </p>
          </div>

          <div className="history-filters">
            <select
              className="history-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="lend">Money Lent</option>
              <option value="borrow">Money Borrowed</option>
              <option value="repay_received">Repayments Received</option>
              <option value="repay_paid">Repayments Paid</option>
              <option value="adjustment">Adjustments</option>
              <option value="opening">Opening Balances</option>
            </select>

            <select
              className="history-filter-select"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="history-empty-state">
            <div className="history-empty-icon-wrap">
              <Clock size={28} />
            </div>
            <h3 className="history-empty-title">No transactions recorded</h3>
            <p className="history-empty-sub">No transactions have been recorded matching your selected filters.</p>
          </div>
        ) : (
          <div className="history-table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description & Notes</th>
                  <th>Method / Ref</th>
                  <th>Due Date</th>
                  <th className="text-right">Receivable</th>
                  <th className="text-right">Payable</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => {
                  const isRec =
                    e.entry_type === 'lend' ||
                    (e.entry_type === 'opening' && e.direction === 'receivable');
                  const isPay =
                    e.entry_type === 'borrow' ||
                    (e.entry_type === 'opening' && e.direction === 'payable');
                  const isRepayRec = e.entry_type === 'repay_received';
                  const isRepayPaid = e.entry_type === 'repay_paid';

                  return (
                    <tr key={e.id} className="history-table-row">
                      <td className="font-mono text-muted">{e.transaction_date}</td>
                      <td>
                        <span className={`entry-type-pill pill-${e.entry_type}`}>
                          {e.entry_type === 'lend' && 'Money Lent'}
                          {e.entry_type === 'borrow' && 'Money Borrowed'}
                          {e.entry_type === 'repay_received' && 'Repayment (In)'}
                          {e.entry_type === 'repay_paid' && 'Repayment (Out)'}
                          {e.entry_type === 'adjustment' && 'Adjustment'}
                          {e.entry_type === 'opening' && 'Opening Balance'}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium text-heading">
                          {e.description || e.adjustment_reason || '—'}
                        </span>
                        {e.original_entry_id && (
                          <span className="text-xs text-muted block">Linked Reversal Entry</span>
                        )}
                      </td>
                      <td>
                        <div className="method-ref-col">
                          <span className="payment-method-tag">{e.payment_method || 'Cash'}</span>
                          {e.reference_number && (
                            <span className="ref-number-text">{e.reference_number}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {e.due_date ? (
                          <span className="due-date-pill">
                            <Calendar size={11} />
                            {e.due_date}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-right font-bold">
                        {isRec && (
                          <span className="text-emerald">+{formatLedgerINR(e.amount)}</span>
                        )}
                        {isRepayRec && (
                          <span className="text-muted">-{formatLedgerINR(e.amount)}</span>
                        )}
                        {!isRec && !isRepayRec && '—'}
                      </td>
                      <td className="text-right font-bold">
                        {isPay && (
                          <span className="text-danger">+{formatLedgerINR(e.amount)}</span>
                        )}
                        {isRepayPaid && (
                          <span className="text-muted">-{formatLedgerINR(e.amount)}</span>
                        )}
                        {!isPay && !isRepayPaid && '—'}
                      </td>
                      <td className="text-center">
                        {e.entry_type !== 'opening' && (
                          <button
                            type="button"
                            className="btn-reverse-entry"
                            title="Reverse / correct this entry"
                            onClick={() => setReversalTarget(e)}
                          >
                            <RotateCcw size={13} />
                            <span>Reverse</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <div
          className="ledger-modal-overlay"
          onClick={() => setReversalTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="ledger-modal-card card" onClick={(e) => e.stopPropagation()}>
            <div className="ledger-modal-header">
              <h2 className="ledger-modal-title">Reverse Ledger Entry</h2>
              <button
                type="button"
                className="ledger-modal-close-btn"
                onClick={() => setReversalTarget(null)}
              >
                <X size={18} />
              </button>
            </div>
            <p className="ledger-modal-subtitle">
              Reversing will create an audited counter-entry of{' '}
              <strong>{formatLedgerINR(reversalTarget.amount)}</strong> to correct the balance while
              preserving complete financial audit history.
            </p>
            <form onSubmit={handleConfirmReversal} className="ledger-modal-form">
              <div className="ledger-form-field">
                <label className="ledger-form-label" htmlFor="rev-reason">
                  Reason for Reversal <span className="required-star">*</span>
                </label>
                <input
                  id="rev-reason"
                  type="text"
                  className="ledger-text-input"
                  placeholder="e.g. Accidental duplicate, wrong amount entered, loan cancelled"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="ledger-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setReversalTarget(null)}
                  disabled={isReversing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-secondary text-danger"
                  disabled={isReversing}
                >
                  {isReversing ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Person Modal */}
      <AddPersonModal
        isOpen={isEditPersonOpen}
        onClose={() => setIsEditPersonOpen(false)}
        contactToEdit={contact}
        onSaved={loadContactData}
      />

      {/* Record Transaction Modal */}
      <RecordTransactionModal
        isOpen={isRecordTxOpen}
        onClose={() => setIsRecordTxOpen(false)}
        initialContactId={contact.id}
        initialType={modalType}
        onRecorded={loadContactData}
      />
    </div>
  );
}
