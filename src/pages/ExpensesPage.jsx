import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Receipt,
  PlusCircle,
  Filter,
  Search,
  RefreshCw,
  AlertCircle,
  Pencil,
  Trash2,
  Inbox,
  Calendar,
  Layers,
  CreditCard
} from 'lucide-react';
import { getExpenses, deleteExpense } from '../services/expenseService';
import AddExpenseModal from '../components/common/AddExpenseModal';
import { getCategoryIcon } from '../components/dashboard/RecentExpenses';
import {
  ALLOWED_CATEGORIES,
  ALLOWED_PAYMENT_METHODS,
  formatDateDisplay,
  formatCurrencyINR,
  getTodayLocalDateString,
  getCurrentWeekRange,
  getCurrentMonthRange
} from '../utils/dateUtils';
import './PlaceholderPage.css';
import '../components/dashboard/DashboardCharts.css';

export default function ExpensesPage() {
  const { onOpenAddExpense } = useOutletContext() || {};

  const [expenses, setExpenses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPayment, setSelectedPayment] = useState('All');
  const [dateFilterType, setDateFilterType] = useState('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit / Delete Modal State
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchExpensesList = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let startDate = null;
      let endDate = null;

      if (dateFilterType === 'Today') {
        startDate = getTodayLocalDateString();
        endDate = startDate;
      } else if (dateFilterType === 'This Week') {
        const week = getCurrentWeekRange();
        startDate = week.startDate;
        endDate = week.endDate;
      } else if (dateFilterType === 'This Month') {
        const month = getCurrentMonthRange();
        startDate = month.startDate;
        endDate = month.endDate;
      } else if (dateFilterType === 'Custom') {
        startDate = customStartDate || null;
        endDate = customEndDate || null;
      }

      const result = await getExpenses({
        startDate,
        endDate,
        category: selectedCategory,
        paymentMethod: selectedPayment,
        searchQuery,
        limit: 100,
        offset: 0
      });

      setExpenses(result.expenses);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error('Failed to load expense ledger:', err);
      setError(err.message || 'Failed to load expense records.');
    } finally {
      setIsLoading(false);
    }
  }, [dateFilterType, customStartDate, customEndDate, selectedCategory, selectedPayment, searchQuery]);

  useEffect(() => {
    fetchExpensesList();

    const handleExpenseChange = () => {
      fetchExpensesList();
    };

    window.addEventListener('expense:changed', handleExpenseChange);
    return () => {
      window.removeEventListener('expense:changed', handleExpenseChange);
    };
  }, [fetchExpensesList]);

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (expense) => {
    const confirmMsg = `Are you sure you want to delete this ${expense.category} expense of ${formatCurrencyINR(expense.amount)}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteExpense(expense.id);
    } catch (err) {
      alert(`Error deleting expense: ${err.message}`);
    }
  };

  const totalFilteredSum = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="page-container">
      {/* Header Banner */}
      <div className="page-header-card card">
        <div className="page-header-info">
          <div className="page-header-icon">
            <Receipt size={24} />
          </div>
          <div>
            <h1 className="page-main-heading">Expense Ledger</h1>
            <p className="page-main-subheading">
              Browse, filter, search, and manage your PostgreSQL transactions
            </p>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={fetchExpensesList}
            disabled={isLoading}
            title="Refresh Ledger"
          >
            <RefreshCw size={16} className={isLoading ? 'spinner-icon' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => (onOpenAddExpense ? onOpenAddExpense() : setIsAddModalOpen(true))}
            aria-label="Add Expense"
          >
            <PlusCircle size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="modal-error-banner" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span>{error}</span>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={fetchExpensesList}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-md)' }}>
          <Filter size={18} className="text-primary" />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700 }}>Filter & Search Ledger</h3>
        </div>

        <div className="placeholder-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
          {/* Search Query */}
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Search Description</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--color-muted)' }} />
              <input
                type="text"
                placeholder="Search merchant, notes..."
                className="form-text-input"
                style={{ paddingLeft: '2rem', width: '100%' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Category</label>
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {ALLOWED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Payment Method</label>
            <select
              className="form-select"
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
            >
              <option value="All">All Payment Methods</option>
              {ALLOWED_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Date Range</label>
            <select
              className="form-select"
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week (Mon - Sun)</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Date Range</option>
            </select>
          </div>
        </div>

        {dateFilterType === 'Custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-text-input"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">End Date</label>
              <input
                type="date"
                className="form-text-input"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary Stat Pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 var(--spacing-xs)' }}>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-muted)', fontWeight: 600 }}>
          Showing {expenses.length} of {totalCount} record{totalCount !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', fontWeight: 700 }}>
          Filtered Total: <span style={{ color: 'var(--color-primary)' }}>{formatCurrencyINR(totalFilteredSum)}</span>
        </span>
      </div>

      {/* Ledger Table */}
      <div className="card recent-expenses-card" style={{ padding: 'var(--spacing-lg)' }}>
        {isLoading ? (
          <div className="chart-loading-state" style={{ minHeight: '220px' }}>
            <span className="loading-pulse-text">Querying PostgreSQL database...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="chart-empty-state" style={{ padding: '3rem 1rem' }}>
            <Inbox size={40} className="empty-state-icon" />
            <p className="empty-state-title">No matching expenses found</p>
            <p className="empty-state-subtitle">
              {searchQuery || selectedCategory !== 'All' || dateFilterType !== 'All'
                ? 'Try adjusting your filters or search terms.'
                : 'Your expense ledger is currently empty. Record an expense to see it here.'}
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '1.25rem' }}
              onClick={() => (onOpenAddExpense ? onOpenAddExpense() : setIsAddModalOpen(true))}
            >
              <PlusCircle size={16} />
              <span>Record Expense</span>
            </button>
          </div>
        ) : (
          <div className="expenses-table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Description / Merchant</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th className="th-amount">Amount</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="expense-row">
                    <td className="cell-title">
                      <div className="expense-avatar-icon" aria-hidden="true">
                        {getCategoryIcon(expense.category)}
                      </div>
                      <div>
                        <span className="title-text" style={{ display: 'block' }}>
                          {expense.description || `${expense.category} Expense`}
                        </span>
                      </div>
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
                    <td className="cell-actions">
                      <div className="action-buttons-group">
                        <button
                          className="btn-icon-action"
                          title="Edit Expense"
                          onClick={() => handleEdit(expense)}
                          aria-label={`Edit ${expense.description || expense.category}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn-icon-action btn-delete-action"
                          title="Delete Expense"
                          onClick={() => handleDelete(expense)}
                          aria-label={`Delete ${expense.description || expense.category}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <AddExpenseModal
          isOpen={isEditModalOpen}
          expenseToEdit={editingExpense}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingExpense(null);
          }}
          onSuccess={() => {
            fetchExpensesList();
          }}
        />
      )}

      {/* Standalone Add Modal */}
      {isAddModalOpen && (
        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            fetchExpensesList();
          }}
        />
      )}
    </div>
  );
}
