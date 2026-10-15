import React from 'react';
import {
  Receipt,
  TrendingUp,
  ArrowRightLeft,
  Calendar,
  Wallet,
  Repeat,
  Users,
  Search,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { formatCurrencyINR, formatDateDisplay } from '../../utils/dateUtils';
import { getHighlightedSegments } from '../../utils/filterUtils';
import './TransactionList.css';

function HighlightedText({ text, query }) {
  if (!text) return null;
  const segments = getHighlightedSegments(text, query);

  return (
    <span>
      {segments.map((seg, idx) =>
        seg.isMatch ? (
          <mark key={idx} className="search-highlight">
            {seg.text}
          </mark>
        ) : (
          <span key={idx}>{seg.text}</span>
        )
      )}
    </span>
  );
}

export default function TransactionList({
  transactions = [],
  query = '',
  totalCount = 0,
  hasMore = false,
  onLoadMore,
  isLoading = false,
  onSelectTransaction
}) {
  if (!isLoading && transactions.length === 0) {
    return (
      <div className="search-empty-state">
        <div className="search-empty-icon" aria-hidden="true">
          <Search size={26} />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>
          No Matching Transactions Found
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '0 auto', maxWidth: '380px' }}>
          Try clearing some filters, searching for a different keyword, or expanding your date range.
        </p>
      </div>
    );
  }

  return (
    <div className="transaction-list-container">
      {transactions.map((tx) => {
        const isExpense = tx.type === 'expense';
        const isIncome = tx.type === 'income';
        const isTransfer = tx.type === 'transfer';

        return (
          <div
            key={`${tx.type}-${tx.id}`}
            className="transaction-search-card"
            onClick={() => onSelectTransaction && onSelectTransaction(tx)}
            role="button"
            tabIndex={0}
          >
            <div className="card-left-section">
              <div className={`transaction-type-icon ${tx.type}`}>
                {isExpense ? (
                  <Receipt size={18} />
                ) : isIncome ? (
                  <TrendingUp size={18} />
                ) : (
                  <ArrowRightLeft size={18} />
                )}
              </div>

              <div className="card-text-group">
                <div className="card-title-row">
                  <span className="card-main-title">
                    <HighlightedText text={tx.title} query={query} />
                  </span>
                  {tx.isRecurring && (
                    <span className="tag-badge recurring-tag">
                      <Repeat size={10} /> Recurring
                    </span>
                  )}
                  {tx.isSplit && (
                    <span className="tag-badge split-tag">
                      <Users size={10} /> Split
                    </span>
                  )}
                </div>

                <div className="card-meta-row">
                  <span>{formatDateDisplay(tx.date)}</span>
                  <span>•</span>
                  <span>{tx.category}</span>

                  {tx.account && (
                    <>
                      <span>•</span>
                      <span className="tag-badge account-tag">
                        <Wallet size={10} /> {tx.account.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="card-right-section">
              <div className={`card-amount ${tx.type}`}>
                {isExpense ? '- ' : isIncome ? '+ ' : ''}
                {formatCurrencyINR(tx.amount)}
              </div>
              <div className="card-sub-method">
                {tx.paymentMethod}
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <button
          type="button"
          className="btn-load-more"
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="spin" />
              <span>Loading more records...</span>
            </>
          ) : (
            <>
              <span>Load More ({transactions.length} of {totalCount})</span>
              <ChevronDown size={16} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
