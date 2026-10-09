import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CalendarDays,
  CalendarRange,
  TrendingDown,
  CreditCard,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import WeeklySpendingChart from '../components/dashboard/WeeklySpendingChart';
import CategoryBreakdownChart from '../components/dashboard/CategoryBreakdownChart';
import BudgetProgress from '../components/dashboard/BudgetProgress';
import RecentExpenses from '../components/dashboard/RecentExpenses';
import { SUMMARY_STATS } from '../data/mockData';
import '../components/dashboard/DashboardCharts.css';
import './DashboardPage.css';

export default function DashboardPage() {
  const { onOpenAddExpense } = useOutletContext() || {};

  return (
    <div className="dashboard-layout">
      {/* Top Banner Alert */}
      <section className="dashboard-welcome-banner card" aria-label="Welcome and Demo Status">
        <div className="welcome-text">
          <div className="welcome-tag">
            <span className="pulse-dot" />
            <span>Interactive Phase 1 Prototype</span>
          </div>
          <h2 className="welcome-heading">Financial Pulse & Expense Tracker</h2>
          <p className="welcome-description">
            Track daily spending, observe category breakdowns, and monitor your monthly financial budget.
          </p>
        </div>
        <div className="welcome-action">
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

      {/* Summary KPI Cards Grid */}
      <section className="dashboard-stats-grid" aria-label="Key Performance Indicators">
        <StatCard
          title="Spent Today"
          amount={SUMMARY_STATS.spentToday.amount}
          changePercentage={SUMMARY_STATS.spentToday.changePercentage}
          comparisonText={SUMMARY_STATS.spentToday.comparisonText}
          icon={CalendarDays}
          badgeText="Sample"
        />

        <StatCard
          title="Spent This Week"
          amount={SUMMARY_STATS.spentThisWeek.amount}
          changePercentage={SUMMARY_STATS.spentThisWeek.changePercentage}
          comparisonText={SUMMARY_STATS.spentThisWeek.comparisonText}
          icon={CalendarRange}
          badgeText="Sample"
        />

        <StatCard
          title="Spent This Month"
          amount={SUMMARY_STATS.spentThisMonth.amount}
          changePercentage={SUMMARY_STATS.spentThisMonth.changePercentage}
          comparisonText={SUMMARY_STATS.spentThisMonth.comparisonText}
          icon={TrendingDown}
          badgeText="Sample"
        />

        <StatCard
          title="Monthly Budget Limit"
          amount={SUMMARY_STATS.monthlyBudget.totalBudget}
          subtitle={`₹${SUMMARY_STATS.monthlyBudget.remainingAmount.toLocaleString('en-IN')} remaining`}
          icon={CreditCard}
          badgeText="Limit"
        />
      </section>

      {/* Charts & Budget Progress Grid */}
      <section className="dashboard-charts-grid" aria-label="Expense Charts">
        <div className="grid-col-left">
          <WeeklySpendingChart />
          <BudgetProgress />
        </div>

        <div className="grid-col-right">
          <CategoryBreakdownChart />
          <RecentExpenses onOpenAddExpense={onOpenAddExpense} />
        </div>
      </section>
    </div>
  );
}
