import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Target,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  AlertCircle,
  Filter,
  PieChart,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  getCurrentMonthYear,
  getPrevMonthYear,
  getNextMonthYear,
  MONTH_NAMES
} from '../utils/budgetUtils';
import { getMonthlyBudgetOverview, deleteBudget } from '../services/budgetService';
import BudgetOverviewCard from '../components/budget/BudgetOverviewCard';
import CategoryBudgetCard from '../components/budget/CategoryBudgetCard';
import BudgetVsActualChart from '../components/budget/BudgetVsActualChart';
import BudgetModal from '../components/budget/BudgetModal';
import './BudgetPage.css';

export default function BudgetPage() {
  const currentLocal = useMemo(() => getCurrentMonthYear(), []);
  const [selectedYear, setSelectedYear] = useState(currentLocal.year);
  const [selectedMonth, setSelectedMonth] = useState(currentLocal.month);

  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active filter tab for categories
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'budgeted' | 'over' | 'warning' | 'no-spending'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialData, setModalInitialData] = useState(null);
  const [modalDefaultCategory, setModalDefaultCategory] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMonthlyBudgetOverview(selectedYear, selectedMonth);
      setOverview(data);
    } catch (err) {
      console.error('Error fetching budget overview:', err);
      setError(err.message || 'Failed to load budget data for this month.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchOverview();

    // Listen to real-time budget and expense mutations
    const handleBudgetChange = () => fetchOverview();
    const handleExpenseChange = () => fetchOverview();

    window.addEventListener('budget:changed', handleBudgetChange);
    window.addEventListener('expense:changed', handleExpenseChange);

    return () => {
      window.removeEventListener('budget:changed', handleBudgetChange);
      window.removeEventListener('expense:changed', handleExpenseChange);
    };
  }, [fetchOverview]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    const prev = getPrevMonthYear(selectedYear, selectedMonth);
    setSelectedYear(prev.year);
    setSelectedMonth(prev.month);
  };

  const handleNextMonth = () => {
    const next = getNextMonthYear(selectedYear, selectedMonth);
    setSelectedYear(next.year);
    setSelectedMonth(next.month);
  };

  const handleResetToCurrent = () => {
    setSelectedYear(currentLocal.year);
    setSelectedMonth(currentLocal.month);
  };

  const isCurrentMonth = selectedYear === currentLocal.year && selectedMonth === currentLocal.month;

  // Modal Triggers
  const handleOpenTotalBudgetModal = () => {
    if (overview?.totalBudgetRecord) {
      setModalInitialData({
        ...overview.totalBudgetRecord,
        category: null
      });
    } else {
      setModalInitialData(null);
    }
    setModalDefaultCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenCategoryModal = (catName = null) => {
    setModalInitialData(null);
    setModalDefaultCategory(catName || 'Food');
    setIsModalOpen(true);
  };

  const handleEditCategoryBudget = (categoryItem) => {
    setModalInitialData({
      id: categoryItem.budgetId,
      amount: categoryItem.budgetAmount,
      month: selectedMonth,
      year: selectedYear,
      category: categoryItem.category
    });
    setModalDefaultCategory(categoryItem.category);
    setIsModalOpen(true);
  };

  const handleDeleteBudget = async (item) => {
    if (!item.budgetId) return;
    const confirmMsg = `Are you sure you want to remove the ${item.category} budget of ₹${item.budgetAmount.toLocaleString('en-IN')}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteBudget(item.budgetId);
      fetchOverview();
    } catch (err) {
      alert(`Failed to delete budget: ${err.message}`);
    }
  };

  // Filter category breakdown
  const filteredCategories = useMemo(() => {
    if (!overview?.categoryBreakdown) return [];
    switch (categoryFilter) {
      case 'budgeted':
        return overview.categoryBreakdown.filter((c) => c.isBudgeted);
      case 'over':
        return overview.categoryBreakdown.filter((c) => c.isOverBudget);
      case 'warning':
        return overview.categoryBreakdown.filter((c) => c.isNearLimit);
      case 'no-spending':
        return overview.categoryBreakdown.filter((c) => c.isBudgeted && c.spentAmount === 0);
      default:
        return overview.categoryBreakdown;
    }
  }, [overview, categoryFilter]);

  const hasAnyBudget = overview && (overview.hasTotalBudget || overview.categoryBreakdown.some((c) => c.isBudgeted));

  return (
    <div className="budget-page-container">
      {/* Top Header & Month Navigator */}
      <div className="budget-page-header">
        <div className="header-titles">
          <div className="budget-badge-tag">
            <Target size={14} />
            <span>SMART BUDGET MANAGER</span>
          </div>
          <h1 className="budget-page-title">Monthly Budgets & Allocations</h1>
          <p className="budget-page-subtitle">
            Set proactive spending targets, track category limits, and receive real-time threshold alerts.
          </p>
        </div>

        {/* Month Navigation Control Bar */}
        <div className="month-navigation-bar" aria-label="Month Navigation">
          <button
            type="button"
            className="btn-month-nav"
            onClick={handlePrevMonth}
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="current-month-display">
            <Calendar size={16} className="text-muted" aria-hidden="true" />
            <span className="month-display-text">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
          </div>

          <button
            type="button"
            className="btn-month-nav"
            onClick={handleNextMonth}
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight size={20} />
          </button>

          {!isCurrentMonth && (
            <button
              type="button"
              className="btn-return-today"
              onClick={handleResetToCurrent}
              title="Return to Current Month"
            >
              Current Month
            </button>
          )}

          <button
            type="button"
            className="btn-refresh-budgets"
            onClick={fetchOverview}
            disabled={isLoading}
            title="Refresh Budget Metrics"
            aria-label="Refresh Budget Metrics"
          >
            <RefreshCw size={16} className={isLoading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="budget-error-card" role="alert">
          <AlertCircle size={20} className="text-danger flex-shrink-0" />
          <div className="error-content">
            <strong>Error loading budgets:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={fetchOverview}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Primary Actions Header */}
      <div className="budget-action-toolbar">
        <div className="action-buttons-group">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenTotalBudgetModal}
          >
            <Target size={16} />
            <span>{overview?.hasTotalBudget ? 'Edit Total Budget' : 'Set Total Monthly Budget'}</span>
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => handleOpenCategoryModal('Food')}
          >
            <Plus size={16} />
            <span>Add Category Budget</span>
          </button>
        </div>
      </div>

      {/* Main Budget Dashboard Overview */}
      {isLoading && !overview ? (
        <div className="budget-loading-card">
          <div className="pulse-spinner" />
          <span>Analyzing monthly budget targets & transactions...</span>
        </div>
      ) : (
        <>
          {/* Executive Overview Card */}
          <BudgetOverviewCard
            overview={overview}
            onEditTotalBudget={handleOpenTotalBudgetModal}
            onOpenAddModal={() => handleOpenCategoryModal('Food')}
          />

          {/* Empty State Banner if no budgets at all */}
          {!hasAnyBudget && !isLoading && (
            <div className="budget-empty-state-card">
              <div className="empty-spark-icon" aria-hidden="true">
                <Sparkles size={36} />
              </div>
              <h3 className="empty-title">No Budgets Created for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</h3>
              <p className="empty-desc">
                Take control of your financial velocity. Set an overall monthly spending ceiling or allocate specific budgets for Food, Transport, Bills, and other categories.
              </p>
              <div className="empty-action-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleOpenTotalBudgetModal}
                >
                  <Target size={16} />
                  <span>Set Total Budget</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleOpenCategoryModal('Food')}
                >
                  <Plus size={16} />
                  <span>Allocate Category Target</span>
                </button>
              </div>
            </div>
          )}

          {/* Category-wise Budget vs Actual Recharts Comparison */}
          {hasAnyBudget && (
            <BudgetVsActualChart
              items={overview?.categoryBreakdown || []}
              monthLabel={`${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`}
              isLoading={isLoading}
            />
          )}

          {/* Category Budgets Section */}
          <div className="category-budgets-section">
            <div className="category-section-header">
              <div>
                <h2 className="section-title">Category Targets & Ledger Breakdown</h2>
                <p className="section-subtitle">
                  Monitor individual category ceilings, zero-spending buckets, and overspending indicators.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="category-filter-tabs" role="tablist">
                <button
                  type="button"
                  className={`filter-tab ${categoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('all')}
                  role="tab"
                  aria-selected={categoryFilter === 'all'}
                >
                  All ({overview?.categoryBreakdown?.length || 9})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${categoryFilter === 'budgeted' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('budgeted')}
                  role="tab"
                  aria-selected={categoryFilter === 'budgeted'}
                >
                  Budgeted ({overview?.categoryBreakdown?.filter((c) => c.isBudgeted).length || 0})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${categoryFilter === 'over' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('over')}
                  role="tab"
                  aria-selected={categoryFilter === 'over'}
                >
                  Over Budget ({overview?.overBudgetCategories?.length || 0})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${categoryFilter === 'warning' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('warning')}
                  role="tab"
                  aria-selected={categoryFilter === 'warning'}
                >
                  Near Limit ({overview?.categoryBreakdown?.filter((c) => c.isNearLimit).length || 0})
                </button>
                <button
                  type="button"
                  className={`filter-tab ${categoryFilter === 'no-spending' ? 'active' : ''}`}
                  onClick={() => setCategoryFilter('no-spending')}
                  role="tab"
                  aria-selected={categoryFilter === 'no-spending'}
                >
                  No Spending ({overview?.categoriesWithNoSpending?.length || 0})
                </button>
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="category-cards-grid">
              {filteredCategories.map((item) => (
                <CategoryBudgetCard
                  key={item.category}
                  item={item}
                  onEdit={handleEditCategoryBudget}
                  onDelete={handleDeleteBudget}
                  onSetBudget={handleOpenCategoryModal}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Budget Creation & Edit Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={modalInitialData}
        defaultYear={selectedYear}
        defaultMonth={selectedMonth}
        defaultCategory={modalDefaultCategory}
        onSuccess={fetchOverview}
      />
    </div>
  );
}
