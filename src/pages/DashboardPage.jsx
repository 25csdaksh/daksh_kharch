import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  CalendarRange,
  TrendingDown,
  CreditCard,
  PlusCircle,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import WeeklySpendingChart from '../components/dashboard/WeeklySpendingChart';
import CategoryBreakdownChart from '../components/dashboard/CategoryBreakdownChart';
import BudgetProgress from '../components/dashboard/BudgetProgress';
import RecentExpenses from '../components/dashboard/RecentExpenses';
import AddExpenseModal from '../components/common/AddExpenseModal';
import { getDashboardMetrics, deleteExpense } from '../services/expenseService';
import { formatCurrencyINR } from '../utils/dateUtils';
import '../components/dashboard/DashboardCharts.css';
import './DashboardPage.css';

export default function DashboardPage() {
  const { onOpenAddExpense } = useOutletContext() || {};

  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit / Delete states
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'Failed to load live dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    // Listen for real-time mutations
    const handleExpenseChange = () => {
      fetchMetrics();
    };

    window.addEventListener('expense:changed', handleExpenseChange);
    return () => {
      window.removeEventListener('expense:changed', handleExpenseChange);
    };
  }, [fetchMetrics]);

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const handleDelete = async (expense) => {
    const confirmMessage = `Are you sure you want to delete the ${expense.category} expense of ${formatCurrencyINR(expense.amount)}?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      setDeletingId(expense.id);
      await deleteExpense(expense.id);
    } catch (err) {
      alert(`Failed to delete expense: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const monthlyBudgetLimit = 45000;
  const spentThisMonth = metrics?.month?.amount || 0;
  const remainingMonthBudget = Math.max(0, monthlyBudgetLimit - spentThisMonth);

  return (
    <div className="dashboard-layout">
      {/* Top Banner with Quick Actions & Live Refresh */}
      <section className="dashboard-welcome-banner card" aria-label="Financial Overview">
        <div className="welcome-text">
          <div className="welcome-tag">
            <span className="pulse-dot" />
            <span>Live Supabase PostgreSQL Engine</span>
          </div>
          <h2 className="welcome-heading">Financial Pulse & Live Ledger</h2>
          <p className="welcome-description">
            Real-time daily expenditure, weekly breakdown, and categorized budget monitoring.
          </p>
        </div>
        <div className="welcome-action" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-outline"
            onClick={fetchMetrics}
            disabled={isLoading}
            title="Refresh Metrics"
            aria-label="Refresh live metrics"
          >
            <RefreshCw size={16} className={isLoading ? 'spinner-icon' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={onOpenAddExpense}
            aria-label="Add New Expense Transaction"
          >
            <PlusCircle size={16} />
            <span>+ Add Expense</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="modal-error-banner" role="alert" style={{ marginBottom: 0 }}>
          <AlertCircle size={18} className="flex-shrink-0" />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span>{error}</span>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={fetchMetrics}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <section className="dashboard-stats-grid" aria-label="Key Performance Indicators">
        <StatCard
          title="Spent Today"
          amount={metrics?.today?.amount || 0}
          subtitle={
            metrics?.today?.count
              ? `${metrics.today.count} transaction${metrics.today.count > 1 ? 's' : ''}`
              : 'No expenses today'
          }
          icon={CalendarDays}
          badgeText="Today"
        />

        <StatCard
          title="Spent This Week"
          amount={metrics?.week?.amount || 0}
          subtitle={
            metrics?.week?.startDate
              ? `${metrics.week.startDate.slice(5)} to ${metrics.week.endDate.slice(5)}`
              : 'Mon – Sun'
          }
          icon={CalendarRange}
          badgeText="Weekly"
        />

        <StatCard
          title="Spent This Month"
          amount={spentThisMonth}
          subtitle={
            metrics?.month?.count
              ? `${metrics.month.count} transaction${metrics.month.count > 1 ? 's' : ''} in ${metrics.month.monthName}`
              : `${metrics?.month?.monthName || 'Current Month'}`
          }
          icon={TrendingDown}
          badgeText="Monthly"
        />

        <StatCard
          title="Monthly Budget Limit"
          amount={monthlyBudgetLimit}
          subtitle={`${formatCurrencyINR(remainingMonthBudget, false)} remaining`}
          icon={CreditCard}
          badgeText="Budget"
        />
      </section>

      {/* Charts & Budget Progress Grid */}
      <section className="dashboard-charts-grid" aria-label="Expense Charts">
        <div className="grid-col-left">
          <WeeklySpendingChart
            data={metrics?.week?.chartData || []}
            isLoading={isLoading}
          />
          <BudgetProgress
            spentAmount={spentThisMonth}
            totalBudget={monthlyBudgetLimit}
            monthName={metrics?.month?.monthName || 'This Month'}
            isLoading={isLoading}
          />
        </div>

        <div className="grid-col-right">
          <CategoryBreakdownChart
            categories={metrics?.month?.categories || []}
            monthName={metrics?.month?.monthName || 'This Month'}
            isLoading={isLoading}
          />
          <RecentExpenses
            expenses={metrics?.recentExpenses || []}
            isLoading={isLoading}
            onOpenAddExpense={onOpenAddExpense}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </section>

      {/* Edit Expense Modal Instance */}
      {isEditModalOpen && (
        <AddExpenseModal
          isOpen={isEditModalOpen}
          expenseToEdit={editingExpense}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingExpense(null);
          }}
          onSuccess={() => {
            fetchMetrics();
          }}
        />
      )}
    </div>
  );
}
