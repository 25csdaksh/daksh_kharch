import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HandCoins,
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  UserPlus,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Phone,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Clock,
  Filter
} from 'lucide-react';
import { getLedgerOverview } from '../services/ledgerService';
import { formatLedgerINR } from '../utils/ledgerEngine';
import AddPersonModal from '../components/ledger/AddPersonModal';
import RecordTransactionModal from '../components/ledger/RecordTransactionModal';
import './LedgerPage.css';

export default function LedgerPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalReceivable: 0,
    totalPayable: 0,
    netPosition: 0,
    activeAccounts: 0,
    settledAccounts: 0,
    totalAccounts: 0,
    overdueAccounts: 0,
    overdueAmount: 0
  });
  const [contacts, setContacts] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Modals state
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [modalInitialContactId, setModalInitialContactId] = useState(null);
  const [modalInitialType, setModalInitialType] = useState('lend');

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'receivable' | 'payable' | 'settled' | 'overdue'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'receivable' | 'payable' | 'name'

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getLedgerOverview();
      setSummary(data.summary);
      setContacts(data.contacts);
      setRecentActivity(data.recentActivity);
    } catch (err) {
      console.error('Error loading ledger overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleChanged = () => {
      loadData();
    };

    window.addEventListener('ledger:changed', handleChanged);
    return () => {
      window.removeEventListener('ledger:changed', handleChanged);
    };
  }, []);

  // Filtered & sorted contacts
  const filteredContacts = useMemo(() => {
    let list = [...contacts];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    // Status filter
    const today = new Date().toISOString().split('T')[0];
    if (statusFilter === 'receivable') {
      list = list.filter((c) => c.balance?.status === 'receivable');
    } else if (statusFilter === 'payable') {
      list = list.filter((c) => c.balance?.status === 'payable');
    } else if (statusFilter === 'settled') {
      list = list.filter((c) => c.balance?.status === 'settled');
    } else if (statusFilter === 'overdue') {
      list = list.filter((c) => c.balance?.due_date && c.balance.due_date < today && c.balance.receivable > 0);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'receivable') {
        return (b.balance?.receivable || 0) - (a.balance?.receivable || 0);
      }
      if (sortBy === 'payable') {
        return (b.balance?.payable || 0) - (a.balance?.payable || 0);
      }
      // recent activity default
      const da = new Date(a.balance?.lastActivityDate || a.created_at || 0).getTime();
      const db = new Date(b.balance?.lastActivityDate || b.created_at || 0).getTime();
      return db - da;
    });

    return list;
  }, [contacts, searchQuery, statusFilter, sortBy]);

  const openRecordModalForContact = (cId, type = 'lend') => {
    setModalInitialContactId(cId);
    setModalInitialType(type);
    setIsRecordTxOpen(true);
  };

  return (
    <div className="ledger-page-container">
      {/* 1. Header & Quick Actions */}
      <div className="ledger-header-card card">
        <div className="ledger-header-info">
          <div className="ledger-header-icon-wrap">
            <HandCoins size={28} />
          </div>
          <div>
            <div className="ledger-header-badge-row">
              <span className="ledger-badge-tag">Personal Ledger</span>
              <span className="ledger-badge-gujarati">મારું ખાતું / ઉધાર ખાતું</span>
            </div>
            <h1 className="ledger-main-title">My Ledger — Personal Debt & Credit</h1>
            <p className="ledger-main-sub">
              Track money you have lent, borrowed, and repayments. Private, auditable, and never double-counted with living expenses.
            </p>
          </div>
        </div>

        <div className="ledger-header-actions">
          <button
            type="button"
            className="btn btn-outline ledger-header-btn"
            onClick={() => {
              setModalInitialContactId(null);
              setModalInitialType('lend');
              setIsRecordTxOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Record Transaction</span>
          </button>
          <button
            type="button"
            className="btn btn-primary ledger-header-btn-primary"
            onClick={() => setIsAddPersonOpen(true)}
          >
            <UserPlus size={16} />
            <span>Add Person (ખાતું ઉમેરો)</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Dashboard KPI Cards */}
      <div className="ledger-kpi-grid">
        {/* Total Receivable */}
        <div className="ledger-kpi-card card border-receivable">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Receivable (કુલ લેવાના)</span>
            <div className="kpi-card-icon icon-rec">
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div className="kpi-card-value text-emerald">{formatLedgerINR(summary.totalReceivable)}</div>
          <div className="kpi-card-footer">
            <span>Money lent to friends & contacts</span>
          </div>
        </div>

        {/* Total Payable */}
        <div className="ledger-kpi-card card border-payable">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total Payable (કુલ આપવાના)</span>
            <div className="kpi-card-icon icon-pay">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="kpi-card-value text-danger">{formatLedgerINR(summary.totalPayable)}</div>
          <div className="kpi-card-footer">
            <span>Money borrowed to repay</span>
          </div>
        </div>

        {/* Net Ledger Balance */}
        <div className="ledger-kpi-card card border-net">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Net Balance (ચોખ્ખી સ્થિતિ)</span>
            <div className="kpi-card-icon icon-net">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className={`kpi-card-value ${summary.netPosition >= 0 ? 'text-emerald' : 'text-danger'}`}>
            {formatLedgerINR(summary.netPosition)}
          </div>
          <div className="kpi-card-footer">
            <span>{summary.netPosition >= 0 ? 'Net in your favor' : 'Net you owe'}</span>
          </div>
        </div>

        {/* Active Accounts */}
        <div className="ledger-kpi-card card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Active People (ખાતાઓ)</span>
            <div className="kpi-card-icon icon-users">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-card-value text-heading">{summary.activeAccounts}</div>
          <div className="kpi-card-footer">
            <span>{summary.settledAccounts} fully settled</span>
          </div>
        </div>

        {/* Overdue Accounts */}
        {summary.overdueAccounts > 0 && (
          <div className="ledger-kpi-card card border-overdue">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Overdue Accounts (મુદત વીતી)</span>
              <div className="kpi-card-icon icon-overdue">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="kpi-card-value text-amber">{summary.overdueAccounts}</div>
            <div className="kpi-card-footer">
              <span className="text-amber font-semibold">{formatLedgerINR(summary.overdueAmount)} past due date</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Search, Filters & Sorting Controls */}
      <div className="ledger-controls-bar card">
        <div className="ledger-search-box">
          <Search size={16} className="ledger-search-icon" />
          <input
            type="search"
            className="ledger-search-input"
            placeholder="Search by name, phone or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="ledger-filters-wrap">
          <div className="ledger-filter-chips">
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({contacts.length})
            </button>
            <button
              type="button"
              className={`filter-chip chip-rec ${statusFilter === 'receivable' ? 'active' : ''}`}
              onClick={() => setStatusFilter('receivable')}
            >
              Receivable ({contacts.filter((c) => c.balance?.status === 'receivable').length})
            </button>
            <button
              type="button"
              className={`filter-chip chip-pay ${statusFilter === 'payable' ? 'active' : ''}`}
              onClick={() => setStatusFilter('payable')}
            >
              Payable ({contacts.filter((c) => c.balance?.status === 'payable').length})
            </button>
            <button
              type="button"
              className={`filter-chip chip-settled ${statusFilter === 'settled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('settled')}
            >
              Settled ({contacts.filter((c) => c.balance?.status === 'settled').length})
            </button>
            {summary.overdueAccounts > 0 && (
              <button
                type="button"
                className={`filter-chip chip-overdue ${statusFilter === 'overdue' ? 'active' : ''}`}
                onClick={() => setStatusFilter('overdue')}
              >
                Overdue ({summary.overdueAccounts})
              </button>
            )}
          </div>

          <div className="ledger-sort-wrap">
            <span className="sort-label">Sort:</span>
            <select
              className="ledger-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recent">Recent Activity</option>
              <option value="receivable">Highest Receivable</option>
              <option value="payable">Highest Payable</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Contact Accounts List */}
      <div className="ledger-contacts-section">
        {loading ? (
          <div className="ledger-empty-card card">
            <RefreshCw size={24} className="animate-spin text-muted" />
            <p className="empty-text">Loading ledger accounts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="ledger-empty-card card">
            <Users size={40} className="empty-icon text-muted" />
            <h3 className="empty-title">
              {contacts.length === 0
                ? 'No ledger accounts created yet'
                : 'No contacts match your filter'}
            </h3>
            <p className="empty-desc">
              {contacts.length === 0
                ? 'Create a ledger account for friends, colleagues, or vendors to keep transparent track of lent and borrowed money.'
                : 'Try clearing your search query or switching to All filter.'}
            </p>
            {contacts.length === 0 && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsAddPersonOpen(true)}
              >
                <UserPlus size={16} />
                <span>Add First Person (પહેલું ખાતું ઉમેરો)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="ledger-contacts-grid">
            {filteredContacts.map((contact) => {
              const balance = contact.balance || {};
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
                <div
                  key={contact.id}
                  className="ledger-contact-card card"
                  onClick={() => navigate(`/ledger/${contact.id}`)}
                >
                  <div className="contact-card-top">
                    <div className="contact-avatar-col">
                      <div className="contact-avatar-circle">{initials}</div>
                      <div className="contact-meta-info">
                        <h3 className="contact-name">{contact.name}</h3>
                        {contact.phone && (
                          <span className="contact-phone">
                            <Phone size={12} />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="contact-card-badge-wrap">
                      {balance.status === 'receivable' && (
                        <span className="status-badge status-rec">
                          Receivable: {formatLedgerINR(balance.receivable)}
                        </span>
                      )}
                      {balance.status === 'payable' && (
                        <span className="status-badge status-pay">
                          Payable: {formatLedgerINR(balance.payable)}
                        </span>
                      )}
                      {balance.status === 'settled' && (
                        <span className="status-badge status-settled">
                          Settled (₹0.00)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Balance Details Breakdown */}
                  <div className="contact-balance-breakdown">
                    <div className="breakdown-stat">
                      <span className="stat-label">Total Lent:</span>
                      <span className="stat-num">{formatLedgerINR(balance.totalLent || 0)}</span>
                    </div>
                    <div className="breakdown-stat">
                      <span className="stat-label">Total Repaid:</span>
                      <span className="stat-num">{formatLedgerINR(balance.totalRepaidReceived || 0)}</span>
                    </div>
                    <div className="breakdown-stat">
                      <span className="stat-label">Net Position:</span>
                      <strong className={`stat-num ${balance.netBalance >= 0 ? 'text-emerald' : 'text-danger'}`}>
                        {formatLedgerINR(balance.netBalance || 0)}
                      </strong>
                    </div>
                  </div>

                  {/* Card Footer: Due Date & Actions */}
                  <div className="contact-card-footer">
                    <div className="footer-date-info">
                      {isOverdue ? (
                        <span className="badge-overdue-tag">
                          <AlertTriangle size={12} />
                          Overdue: {balance.due_date}
                        </span>
                      ) : balance.lastActivityDate ? (
                        <span className="last-activity-date">
                          <Clock size={12} /> Last: {balance.lastActivityDate}
                        </span>
                      ) : (
                        <span className="last-activity-date">New Account</span>
                      )}
                    </div>

                    <div className="footer-quick-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn-card-action"
                        title="Record Transaction"
                        onClick={() => openRecordModalForContact(contact.id, 'lend')}
                      >
                        + Entry
                      </button>
                      <button
                        type="button"
                        className="btn-card-action btn-card-primary"
                        onClick={() => navigate(`/ledger/${contact.id}`)}
                      >
                        <span>View</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Recent Activity Ledger Feed */}
      {recentActivity.length > 0 && (
        <div className="ledger-recent-activity-section card">
          <div className="activity-section-header">
            <h2 className="activity-section-title">
              <Clock size={18} className="text-emerald" />
              <span>Recent Ledger Activity (તાજેતરના વ્યવહારો)</span>
            </h2>
            <span className="activity-badge">{recentActivity.length} recent</span>
          </div>

          <div className="activity-table-wrapper">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Person</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Payment Method</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((tx) => {
                  const isRec =
                    tx.entry_type === 'lend' ||
                    (tx.entry_type === 'opening' && tx.direction === 'receivable');
                  const isPay =
                    tx.entry_type === 'borrow' ||
                    (tx.entry_type === 'opening' && tx.direction === 'payable');
                  const isRepayRec = tx.entry_type === 'repay_received';
                  const isRepayPaid = tx.entry_type === 'repay_paid';

                  return (
                    <tr
                      key={tx.id}
                      className="activity-table-row"
                      onClick={() => navigate(`/ledger/${tx.contact_id}`)}
                    >
                      <td className="font-mono text-muted">{tx.transaction_date}</td>
                      <td className="font-semibold text-heading">{tx.contact_name}</td>
                      <td>
                        <span className={`entry-type-pill pill-${tx.entry_type}`}>
                          {tx.entry_type === 'lend' && 'Lent'}
                          {tx.entry_type === 'borrow' && 'Borrowed'}
                          {tx.entry_type === 'repay_received' && 'Repayment (In)'}
                          {tx.entry_type === 'repay_paid' && 'Repayment (Out)'}
                          {tx.entry_type === 'adjustment' && 'Adjustment'}
                          {tx.entry_type === 'opening' && 'Opening'}
                        </span>
                      </td>
                      <td className="text-muted">{tx.description || tx.adjustment_reason || '—'}</td>
                      <td>
                        <span className="payment-method-tag">{tx.payment_method || 'Cash'}</span>
                      </td>
                      <td className="text-right font-bold">
                        <span className={isRec || isRepayPaid ? 'text-emerald' : 'text-danger'}>
                          {isRec || isRepayPaid ? '+' : '-'}
                          {formatLedgerINR(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onSaved={loadData}
      />

      {/* Record Transaction Modal */}
      <RecordTransactionModal
        isOpen={isRecordTxOpen}
        onClose={() => setIsRecordTxOpen(false)}
        initialContactId={modalInitialContactId}
        initialType={modalInitialType}
        onRecorded={loadData}
      />
    </div>
  );
}
