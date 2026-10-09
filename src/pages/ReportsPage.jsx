import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Layers,
  Coins,
  Receipt,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { getReportAnalytics } from '../services/expenseService';
import {
  getWeekBoundaries,
  getMonthBoundaries,
  getYearBoundaries,
  validateCustomDateRange,
  generateExpensesCSV,
  triggerCSVDownload
} from '../utils/reportUtils';
import {
  formatCurrencyINR,
  getTodayLocalDateString
} from '../utils/dateUtils';
import ReportTimelineChart from '../components/reports/ReportTimelineChart';
import ReportCategoryTable from '../components/reports/ReportCategoryTable';
import CategoryBreakdownChart from '../components/dashboard/CategoryBreakdownChart';
import './ReportsPage.css';
import '../components/dashboard/DashboardCharts.css';

export default function ReportsPage() {
  const [periodTab, setPeriodTab] = useState('weekly'); // 'weekly' | 'monthly' | 'yearly' | 'custom'

  // Navigation offsets
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);

  // Custom date range state
  const todayStr = getTodayLocalDateString();
  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);

  // Report Data State
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState('');

  // Calculate Active Period Boundaries
  const periodParams = useMemo(() => {
    if (periodTab === 'weekly') {
      return getWeekBoundaries(weekOffset);
    }
    if (periodTab === 'monthly') {
      return getMonthBoundaries(monthOffset);
    }
    if (periodTab === 'yearly') {
      return getYearBoundaries(yearOffset);
    }
    if (periodTab === 'custom') {
      const validation = validateCustomDateRange(customStartDate, customEndDate);
      if (!validation.isValid) {
        return {
          isValid: false,
          error: validation.error,
          label: 'Custom Range',
          periodType: 'custom',
          startDate: customStartDate,
          endDate: customEndDate
        };
      }
      return {
        isValid: true,
        ...validation
      };
    }
    return getWeekBoundaries(0);
  }, [periodTab, weekOffset, monthOffset, yearOffset, customStartDate, customEndDate]);

  const fetchAnalytics = useCallback(async () => {
    if (periodTab === 'custom' && periodParams.isValid === false) {
      setError(periodParams.error);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await getReportAnalytics({
        periodType: periodTab,
        startDate: periodParams.startDate,
        endDate: periodParams.endDate,
        prevStartDate: periodParams.prevStartDate,
        prevEndDate: periodParams.prevEndDate,
        days: periodParams.days || [],
        months: periodParams.months || [],
        daysCount: periodParams.daysCount || (periodParams.days ? periodParams.days.length : 1)
      });

      setReportData(data);
    } catch (err) {
      console.error('Failed to load report analytics:', err);
      setError(err.message || 'Failed to generate financial report.');
    } finally {
      setIsLoading(false);
    }
  }, [periodTab, periodParams]);

  useEffect(() => {
    fetchAnalytics();

    const handleExpenseChange = () => {
      fetchAnalytics();
    };

    window.addEventListener('expense:changed', handleExpenseChange);
    return () => {
      window.removeEventListener('expense:changed', handleExpenseChange);
    };
  }, [fetchAnalytics]);

  // Navigation handlers
  const handlePrev = () => {
    if (periodTab === 'weekly') setWeekOffset((prev) => prev - 1);
    if (periodTab === 'monthly') setMonthOffset((prev) => prev - 1);
    if (periodTab === 'yearly') setYearOffset((prev) => prev - 1);
  };

  const handleNext = () => {
    if (periodTab === 'weekly') setWeekOffset((prev) => prev + 1);
    if (periodTab === 'monthly') setMonthOffset((prev) => prev + 1);
    if (periodTab === 'yearly') setYearOffset((prev) => prev + 1);
  };

  const handleResetCurrent = () => {
    if (periodTab === 'weekly') setWeekOffset(0);
    if (periodTab === 'monthly') setMonthOffset(0);
    if (periodTab === 'yearly') setYearOffset(0);
    if (periodTab === 'custom') {
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
    }
  };

  const isCurrentActive = useMemo(() => {
    if (periodTab === 'weekly') return weekOffset === 0;
    if (periodTab === 'monthly') return monthOffset === 0;
    if (periodTab === 'yearly') return yearOffset === 0;
    return false;
  }, [periodTab, weekOffset, monthOffset, yearOffset]);

  // CSV Export Handler
  const handleDownloadCSV = () => {
    if (!reportData || !reportData.expenses || reportData.expenses.length === 0) {
      alert('No expense records available to export for this reporting period.');
      return;
    }

    try {
      const csvString = generateExpensesCSV(reportData.expenses, periodParams.label);
      const safeFilename = `paisatrack-${periodTab}-report-${periodParams.startDate}-to-${periodParams.endDate}.csv`;
      triggerCSVDownload(csvString, safeFilename);

      setDownloadSuccess(`Exported ${reportData.expenses.length} records to ${safeFilename}`);
      setTimeout(() => setDownloadSuccess(''), 3500);
    } catch (err) {
      alert(`Failed to export CSV: ${err.message}`);
    }
  };

  return (
    <div className="reports-layout">
      {/* Top Header Card with Period Switcher */}
      <section className="reports-header-card card" aria-label="Report Period Selection">
        <div className="reports-top-row">
          <div className="reports-title-group">
            <div className="reports-icon-badge">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="reports-main-title">Financial Reports & Analytics</h1>
              <p className="reports-main-subtitle">
                Multi-period financial breakdown, comparative trends, and category distribution
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="period-tabs" role="tablist" aria-label="Reporting Interval">
            <button
              role="tab"
              aria-selected={periodTab === 'weekly'}
              className={`period-tab-btn ${periodTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setPeriodTab('weekly')}
            >
              Weekly
            </button>
            <button
              role="tab"
              aria-selected={periodTab === 'monthly'}
              className={`period-tab-btn ${periodTab === 'monthly' ? 'active' : ''}`}
              onClick={() => setPeriodTab('monthly')}
            >
              Monthly
            </button>
            <button
              role="tab"
              aria-selected={periodTab === 'yearly'}
              className={`period-tab-btn ${periodTab === 'yearly' ? 'active' : ''}`}
              onClick={() => setPeriodTab('yearly')}
            >
              Yearly
            </button>
            <button
              role="tab"
              aria-selected={periodTab === 'custom'}
              className={`period-tab-btn ${periodTab === 'custom' ? 'active' : ''}`}
              onClick={() => setPeriodTab('custom')}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Period Navigator Bar */}
        <div className="period-navigator-bar">
          <div className="navigator-controls">
            {periodTab !== 'custom' ? (
              <>
                <button
                  className="nav-arrow-btn"
                  onClick={handlePrev}
                  aria-label="Previous Period"
                  title="Previous Period"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="current-period-display">
                  <Calendar size={16} className="text-primary" />
                  <span>{periodParams.label}</span>
                </div>
                <button
                  className="nav-arrow-btn"
                  onClick={handleNext}
                  aria-label="Next Period"
                  title="Next Period"
                >
                  <ChevronRight size={18} />
                </button>
                {!isCurrentActive && (
                  <button className="btn-reset-period" onClick={handleResetCurrent}>
                    Current
                  </button>
                )}
              </>
            ) : (
              <div className="custom-date-controls">
                <div className="custom-date-field">
                  <label htmlFor="custom-start">From:</label>
                  <input
                    id="custom-start"
                    type="date"
                    className="custom-date-input"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="custom-date-field">
                  <label htmlFor="custom-end">To:</label>
                  <input
                    id="custom-end"
                    type="date"
                    className="custom-date-input"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
                <span className="current-period-display" style={{ fontSize: 'var(--font-size-xs)' }}>
                  ({periodParams.daysCount || 0} days)
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <button
              className="btn btn-outline"
              onClick={fetchAnalytics}
              disabled={isLoading}
              title="Refresh Report"
            >
              <RefreshCw size={15} className={isLoading ? 'spinner-icon' : ''} />
              <span>Refresh</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={handleDownloadCSV}
              disabled={isLoading || !reportData?.expenses || reportData.expenses.length === 0}
              title="Download RFC-4180 CSV export"
            >
              <Download size={15} />
              <span>Download CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* Download Alert Banner */}
      {downloadSuccess && (
        <div className="preview-feedback-banner" role="status" style={{ marginBottom: 0 }}>
          <Sparkles size={16} className="feedback-icon" />
          <p className="feedback-main">{downloadSuccess}</p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="modal-error-banner" role="alert" style={{ marginBottom: 0 }}>
          <AlertCircle size={18} className="flex-shrink-0" />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span>{error}</span>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={fetchAnalytics}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <section className="reports-kpi-grid" aria-label="Period Key Performance Indicators">
        {/* Total Expenditure */}
        <div className="kpi-card card">
          <div className="kpi-header">
            <span className="kpi-title">Total Expenditure</span>
            <div className="kpi-icon" aria-hidden="true">
              <Coins size={16} />
            </div>
          </div>
          <div className="kpi-amount">
            {formatCurrencyINR(reportData?.totalExpenditure || 0)}
          </div>
          <div className="kpi-footer">
            {periodTab !== 'custom' && reportData?.comparison && (
              <span
                className={`comparison-tag ${
                  reportData.comparison.direction === 'increase'
                    ? 'comparison-increase'
                    : reportData.comparison.direction === 'decrease'
                    ? 'comparison-decrease'
                    : 'comparison-neutral'
                }`}
              >
                {reportData.comparison.direction === 'increase' && <TrendingUp size={12} />}
                {reportData.comparison.direction === 'decrease' && <TrendingDown size={12} />}
                <span>{reportData.comparison.label}</span>
              </span>
            )}
            {periodTab === 'custom' && (
              <span>Selected custom date range</span>
            )}
          </div>
        </div>

        {/* Total Transactions */}
        <div className="kpi-card card">
          <div className="kpi-header">
            <span className="kpi-title">Total Transactions</span>
            <div className="kpi-icon" aria-hidden="true">
              <Receipt size={16} />
            </div>
          </div>
          <div className="kpi-amount">
            {reportData?.transactionCount || 0}
          </div>
          <div className="kpi-footer">
            <span>
              {reportData?.previousCount !== undefined && periodTab !== 'custom'
                ? `${reportData.previousCount} in prior period`
                : 'Recorded transactions'}
            </span>
          </div>
        </div>

        {/* Average Spending */}
        <div className="kpi-card card">
          <div className="kpi-header">
            <span className="kpi-title">
              {periodTab === 'yearly' ? 'Avg Monthly Spend' : 'Avg Daily Spend'}
            </span>
            <div className="kpi-icon" aria-hidden="true">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="kpi-amount">
            {formatCurrencyINR(reportData?.averageSpending || 0)}
          </div>
          <div className="kpi-footer">
            <span>
              {periodTab === 'yearly' ? 'Across 12 months' : 'Per calendar day'}
            </span>
          </div>
        </div>

        {/* Peak Spending Metric */}
        <div className="kpi-card card">
          <div className="kpi-header">
            <span className="kpi-title">
              {periodTab === 'yearly'
                ? 'Highest Month'
                : periodTab === 'custom'
                ? 'Top Category'
                : 'Highest Day'}
            </span>
            <div className="kpi-icon" aria-hidden="true">
              <Layers size={16} />
            </div>
          </div>
          <div className="kpi-amount" style={{ fontSize: 'var(--font-size-xl)' }}>
            {periodTab === 'custom' && reportData?.topCategory
              ? `${reportData.topCategory.name}`
              : reportData?.highestMetric?.label || 'None'}
          </div>
          <div className="kpi-footer">
            <span>
              {periodTab === 'custom' && reportData?.topCategory
                ? `${formatCurrencyINR(reportData.topCategory.value)} (${reportData.topCategory.percentage}%)`
                : reportData?.highestMetric?.amount
                ? `${formatCurrencyINR(reportData.highestMetric.amount)} peak spend`
                : reportData?.highestMetric?.subtext || 'No spend recorded'}
            </span>
          </div>
        </div>
      </section>

      {/* Visual Analytics Grid: Timeline Chart + Category Pie Chart */}
      <section className="reports-analytics-grid" aria-label="Visual Analytics Charts">
        <ReportTimelineChart
          data={reportData?.timelineChartData || []}
          isLoading={isLoading}
          periodType={periodTab}
          periodLabel={periodParams.label}
        />

        <CategoryBreakdownChart
          categories={reportData?.categories || []}
          isLoading={isLoading}
          monthName={periodParams.label}
        />
      </section>

      {/* Detailed Category Table */}
      <section aria-label="Category Distribution Breakdown">
        <ReportCategoryTable
          categories={reportData?.categories || []}
          isLoading={isLoading}
          totalSpend={reportData?.totalExpenditure || 0}
        />
      </section>
    </div>
  );
}
