import React from 'react';
import {
  X,
  Receipt,
  TrendingUp,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  Repeat,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import { formatCurrencyINR, formatDateDisplay } from '../../utils/dateUtils';
import './DayDetailDrawer.css';

export default function DayDetailDrawer({
  selectedDate,
  dayData,
  onClose,
  onPayBill,
  onEditExpense
}) {
  if (!selectedDate) return null;

  const dateObj = new Date(selectedDate + 'T00:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const {
    expenses = [],
    incomes = [],
    transfers = [],
    pendingBills = [],
    expensesTotal = 0,
    incomesTotal = 0,
    transfersTotal = 0,
    pendingBillsTotal = 0
  } = dayData || {};

  const totalEvents = expenses.length + incomes.length + transfers.length + pendingBills.length;

  return (
    <div className="day-detail-drawer">
      <div className="day-detail-header">
        <div className="day-detail-title-group">
          <h3>{formattedDate}</h3>
          <p>{totalEvents} transaction(s) recorded</p>
        </div>

        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close day details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="day-summary-badges-row">
        <div className="day-stat-pill">
          <span className="day-stat-label">Spent</span>
          <span className="day-stat-value expense">
            {formatCurrencyINR(expensesTotal)}
          </span>
        </div>

        <div className="day-stat-pill">
          <span className="day-stat-label">Income</span>
          <span className="day-stat-value income">
            {formatCurrencyINR(incomesTotal)}
          </span>
        </div>

        {transfersTotal > 0 && (
          <div className="day-stat-pill">
            <span className="day-stat-label">Transferred</span>
            <span className="day-stat-value transfer">
              {formatCurrencyINR(transfersTotal)}
            </span>
          </div>
        )}

        {pendingBillsTotal > 0 && (
          <div className="day-stat-pill">
            <span className="day-stat-label">Bills Due</span>
            <span className="day-stat-value bill">
              {formatCurrencyINR(pendingBillsTotal)}
            </span>
          </div>
        )}
      </div>

      {totalEvents === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.875rem' }}>
          No financial activity recorded on this date.
        </div>
      ) : (
        <div className="day-transactions-stack">
          {/* Pending Recurring Bills */}
          {pendingBills.map((bill) => (
            <div key={`bill-${bill.id}`} className="day-tx-item">
              <div className="day-tx-left">
                <div className="day-tx-icon-box bill">
                  <Repeat size={16} />
                </div>
                <div className="day-tx-meta">
                  <span className="day-tx-title">
                    {bill.schedule?.title || 'Recurring Bill'}
                  </span>
                  <span className="day-tx-sub">
                    Scheduled Bill Due • {bill.schedule?.category}
                  </span>
                </div>
              </div>

              <div className="day-tx-right">
                <div className="day-tx-amount bill">
                  Due {formatCurrencyINR(bill.schedule?.amount || bill.actual_paid_amount || 0)}
                </div>
                <button
                  type="button"
                  className="btn-pay-bill-inline"
                  onClick={() => onPayBill(bill)}
                >
                  Pay Now
                </button>
              </div>
            </div>
          ))}

          {/* Confirmed Expenses */}
          {expenses.map((e) => (
            <div
              key={`exp-${e.id}`}
              className="day-tx-item"
              onClick={() => onEditExpense && onEditExpense(e)}
              style={{ cursor: onEditExpense ? 'pointer' : 'default' }}
            >
              <div className="day-tx-left">
                <div className="day-tx-icon-box expense">
                  <Receipt size={16} />
                </div>
                <div className="day-tx-meta">
                  <span className="day-tx-title">{e.description || e.category}</span>
                  <span className="day-tx-sub">
                    {e.category} • {e.payment_method}
                    {e.account && ` • ${e.account.name}`}
                  </span>
                </div>
              </div>

              <div className="day-tx-right">
                <div className="day-tx-amount expense">
                  -{formatCurrencyINR(e.amount)}
                </div>
              </div>
            </div>
          ))}

          {/* Incomes */}
          {incomes.map((i) => (
            <div key={`inc-${i.id}`} className="day-tx-item">
              <div className="day-tx-left">
                <div className="day-tx-icon-box income">
                  <TrendingUp size={16} />
                </div>
                <div className="day-tx-meta">
                  <span className="day-tx-title">{i.description || i.source}</span>
                  <span className="day-tx-sub">
                    Inflow • {i.source}
                    {i.account && ` • ${i.account.name}`}
                  </span>
                </div>
              </div>

              <div className="day-tx-right">
                <div className="day-tx-amount income">
                  +{formatCurrencyINR(i.amount)}
                </div>
              </div>
            </div>
          ))}

          {/* Transfers */}
          {transfers.map((t) => (
            <div key={`tr-${t.id}`} className="day-tx-item">
              <div className="day-tx-left">
                <div className="day-tx-icon-box transfer">
                  <ArrowRightLeft size={16} />
                </div>
                <div className="day-tx-meta">
                  <span className="day-tx-title">
                    {t.source_account?.name || 'Account'} → {t.destination_account?.name || 'Account'}
                  </span>
                  <span className="day-tx-sub">
                    {t.note ? `Note: ${t.note}` : 'Inter-account transfer'}
                  </span>
                </div>
              </div>

              <div className="day-tx-right">
                <div className="day-tx-amount transfer">
                  {formatCurrencyINR(t.amount)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
