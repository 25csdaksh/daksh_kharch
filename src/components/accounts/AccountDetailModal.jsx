import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Receipt,
  Calendar,
  Loader2,
  Inbox
} from 'lucide-react';
import { formatCurrencyINR, formatDateDisplay } from '../../utils/dateUtils';
import { isLiabilityAccount } from '../../utils/accountUtils';
import { getAccountTransactions } from '../../services/accountService';
import './AccountDetailModal.css';

export default function AccountDetailModal({
  isOpen,
  onClose,
  account
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'expense' | 'income' | 'transfer'
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && account?.id) {
      setIsLoading(true);
      setError(null);
      getAccountTransactions(account.id, { limit: 100 })
        .then((items) => setTransactions(items))
        .catch((err) => {
          console.error('Failed to load transactions:', err);
          setError('Failed to fetch account transactions.');
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, account?.id]);

  if (!isOpen || !account) return null;

  const isCredit = isLiabilityAccount(account.type);
  const computed = account.computed || {};
  const currentBalance = isCredit
    ? computed.outstandingDebt ?? account.opening_balance
    : computed.balance ?? account.opening_balance;

  const filteredItems = transactions.filter((t) => {
    if (filterType === 'all') return true;
    if (filterType === 'expense') return t.type === 'expense';
    if (filterType === 'income') return t.type === 'income';
    if (filterType === 'transfer') return t.type.startsWith('transfer');
    return true;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container account-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" style={{ background: account.color || '#064E3B', color: '#FFF' }} aria-hidden="true">
              <History size={20} />
            </div>
            <div>
              <h2 className="modal-title">{account.name} Ledger</h2>
              <p className="modal-subtitle">
                {account.type.replace('_', ' ').toUpperCase()} • Account Transaction History
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

        <div className="modal-body">
          <div className="account-detail-header-card">
            <div className="detail-balance-group">
              <span className="detail-balance-label">
                {isCredit ? 'Outstanding Unpaid Debt' : 'Current Available Balance'}
              </span>
              <span className="detail-balance-amount">
                {formatCurrencyINR(currentBalance)}
              </span>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748B' }}>
              <div>Opening: {formatCurrencyINR(account.opening_balance)}</div>
              <div>{transactions.length} Activity record(s)</div>
            </div>
          </div>

          <div className="detail-filter-tabs">
            <button
              type="button"
              className={`detail-tab-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All Activity ({transactions.length})
            </button>
            <button
              type="button"
              className={`detail-tab-btn ${filterType === 'expense' ? 'active' : ''}`}
              onClick={() => setFilterType('expense')}
            >
              Expenses
            </button>
            <button
              type="button"
              className={`detail-tab-btn ${filterType === 'income' ? 'active' : ''}`}
              onClick={() => setFilterType('income')}
            >
              Incomes
            </button>
            <button
              type="button"
              className={`detail-tab-btn ${filterType === 'transfer' ? 'active' : ''}`}
              onClick={() => setFilterType('transfer')}
            >
              Transfers
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
              <div>Loading account transactions...</div>
            </div>
          ) : error ? (
            <div className="modal-error-alert">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="timeline-empty">
              <Inbox size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
              <div>No transactions found for this account.</div>
            </div>
          ) : (
            <div className="account-timeline-list">
              {filteredItems.map((item) => {
                const isDebit = item.isDebit;
                return (
                  <div key={`${item.type}-${item.id}`} className="timeline-item">
                    <div className="timeline-item-left">
                      <div
                        className={`timeline-icon-box ${
                          item.type === 'expense'
                            ? 'expense'
                            : item.type === 'income'
                            ? 'income'
                            : 'transfer'
                        }`}
                      >
                        {item.type === 'expense' ? (
                          <Receipt size={18} />
                        ) : item.type === 'income' ? (
                          <TrendingUp size={18} />
                        ) : (
                          <ArrowRightLeft size={18} />
                        )}
                      </div>
                      <div className="timeline-meta">
                        <span className="timeline-title">{item.title}</span>
                        <span className="timeline-subtitle">
                          {formatDateDisplay(item.date)} • {item.subtitle}
                        </span>
                      </div>
                    </div>
                    <div className={`timeline-amount ${isDebit ? 'debit' : 'credit'}`}>
                      {isDebit ? '- ' : '+ '}
                      {formatCurrencyINR(item.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', padding: '1rem 1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
