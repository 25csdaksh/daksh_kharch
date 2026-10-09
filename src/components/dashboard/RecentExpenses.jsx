import React from 'react';
import { Link } from 'react-router-dom';
import {
  Utensils,
  Navigation,
  ShoppingCart,
  GraduationCap,
  Film,
  FileText,
  HeartPulse,
  Sparkles,
  CreditCard,
  ArrowUpRight,
  PlusCircle,
  Inbox,
  Pencil,
  Trash2
} from 'lucide-react';
import { formatDateDisplay, formatCurrencyINR } from '../../utils/dateUtils';

export const getCategoryIcon = (category) => {
  switch (category) {
    case 'Food':
      return <Utensils size={16} />;
    case 'Transport':
      return <Navigation size={16} />;
    case 'Shopping':
      return <ShoppingCart size={16} />;
    case 'Education':
      return <GraduationCap size={16} />;
    case 'Entertainment':
      return <Film size={16} />;
    case 'Bills':
      return <FileText size={16} />;
    case 'Healthcare':
      return <HeartPulse size={16} />;
    case 'Personal Care':
      return <Sparkles size={16} />;
    default:
      return <CreditCard size={16} />;
  }
};

export default function RecentExpenses({
  expenses = [],
  isLoading = false,
  onOpenAddExpense,
  onEdit,
  onDelete
}) {
  const hasExpenses = expenses && expenses.length > 0;

  return (
    <div className="card recent-expenses-card">
      <div className="recent-expenses-header">
        <div>
          <h3 className="card-heading">Recent Expenses</h3>
          <p className="card-subheading">Latest recorded transactions</p>
        </div>
        <div className="header-actions">
          {hasExpenses && (
            <Link to="/expenses" className="view-all-link">
              <span>View All</span>
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="chart-loading-state" style={{ minHeight: '180px' }}>
          <span className="loading-pulse-text">Loading transaction records...</span>
        </div>
      ) : !hasExpenses ? (
        <div className="chart-empty-state" style={{ padding: '2.5rem 1rem' }}>
          <Inbox size={36} className="empty-state-icon" />
          <p className="empty-state-title">No transactions recorded</p>
          <p className="empty-state-subtitle">
            Get started by adding your first expense to the ledger.
          </p>
          {onOpenAddExpense && (
            <button
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={onOpenAddExpense}
            >
              <PlusCircle size={16} />
              <span>Record First Expense</span>
            </button>
          )}
        </div>
      ) : (
        <div className="expenses-table-wrapper">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th>Payment</th>
                <th className="th-amount">Amount</th>
                {(onEdit || onDelete) && <th className="th-actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="expense-row">
                  <td className="cell-title">
                    <div className="expense-avatar-icon" aria-hidden="true">
                      {getCategoryIcon(expense.category)}
                    </div>
                    <span className="title-text">
                      {expense.description || `${expense.category} Expense`}
                    </span>
                  </td>
                  <td className="cell-category">
                    <span className="category-pill">{expense.category}</span>
                  </td>
                  <td className="cell-date">{formatDateDisplay(expense.expense_date)}</td>
                  <td className="cell-payment">
                    <span className="payment-tag">{expense.payment_method}</span>
                  </td>
                  <td className="cell-amount">
                    -{formatCurrencyINR(expense.amount)}
                  </td>
                  {(onEdit || onDelete) && (
                    <td className="cell-actions">
                      <div className="action-buttons-group">
                        {onEdit && (
                          <button
                            className="btn-icon-action"
                            title="Edit Expense"
                            onClick={() => onEdit(expense)}
                            aria-label={`Edit ${expense.description || expense.category}`}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="btn-icon-action btn-delete-action"
                            title="Delete Expense"
                            onClick={() => onDelete(expense)}
                            aria-label={`Delete ${expense.description || expense.category}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
