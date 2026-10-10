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
import { useAuth } from '../context/AuthContext';
import { getDashboardMetrics, deleteExpense } from '../services/expenseService';
import { formatCurrencyINR } from '../utils/dateUtils';
import '../components/dashboard/DashboardCharts.css';
import './DashboardPage.css';

export default function DashboardPage() {
  const { onOpenAddExpense } = useOutletContext() || {};
  const { user } = useAuth();

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

  const monthlyBudgetLimit = Number(localStorage.getItem('hisabsetu_monthly_budget') || localStorage.getItem('paisatrack_monthly_budget')) || 45000;
  const spentThisMonth = metrics?.month?.amount || 0;
  const remainingMonthBudget = Math.max(0, monthlyBudgetLimit - spentThisMonth);
  const budgetUsagePercent = monthlyBudgetLimit > 0
    ? Math.min(100, Math.round((spentThisMonth / monthlyBudgetLimit) * 100))
    : 0;

  const userGreetingName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Friend';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-layout">
      {/* Executive Financial Hero Banner */}
      <section className="dashboard-hero-card" aria-label="Financial Overview">
        <div className="hero-content">
          <div className="hero-badge-row">
            <div className="hero-live-badge">
              <span className="hero-pulse-dot" />
              <span>LIVE FINANCIAL PULSE</span>
            </div>
            <span className="hero-date-pill">
              {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <h2 className="hero-greeting">
            {getGreeting()}, <span className="hero-name-highlight">{userGreetingName}</span>
          </h2>
          <p className="hero-tagline">
            Your personal wealth bridge. Real-time expense velocity, weekly analytics, and budget targets.
          </p>

          <div className="hero-quick-stats">
            <div className="hero-stat-pill">
              <span className="stat-pill-label">Month Spend</span>
              <span className="stat-pill-value">{formatCurrencyINR(spentThisMonth, false)}</span>
            </div>
            <div className="hero-stat-pill">
              <span className="stat-pill-label">Budget Available</span>
              <span className="stat-pill-value text-gold">{formatCurrencyINR(remainingMonthBudget, false)} left ({budgetUsagePercent}% used)</span>
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <button
            className="hero-btn-sync"
            onClick={fetchMetrics}
            disabled={isLoading}
            title="Sync live ledger"
            aria-label="Sync live ledger"
          >
            <RefreshCw size={15} className={isLoading ? 'spinner-icon' : ''} />
            <span>Sync Ledger</span>
          </button>
          <button
            className="hero-btn-add"
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
          variant="today"
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
          variant="week"
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
          variant="month"
        />

        <StatCard
          title="Monthly Budget Limit"
          amount={monthlyBudgetLimit}
          subtitle={`${formatCurrencyINR(remainingMonthBudget, false)} remaining`}
          icon={CreditCard}
          badgeText="Budget"
          variant="budget"
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
