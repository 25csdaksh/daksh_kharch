import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Repeat
} from 'lucide-react';
import FinancialCalendarGrid from '../components/calendar/FinancialCalendarGrid';
import DayDetailDrawer from '../components/calendar/DayDetailDrawer';
import MarkPaidModal from '../components/recurring/MarkPaidModal';
import AddExpenseModal from '../components/common/AddExpenseModal';
import { getCalendarMonthData } from '../services/calendarService';
import { formatCurrencyINR, getTodayLocalDateString } from '../utils/dateUtils';
import './CalendarPage.css';

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12

  const [calendarData, setCalendarData] = useState({
    daysMap: {},
    summary: {
      monthlyExpenses: 0,
      monthlyIncome: 0,
      netCashFlow: 0,
      totalTransfers: 0,
      pendingBillsCount: 0,
      pendingBillsTotal: 0,
      transactionCount: 0
    }
  });

  const [selectedDate, setSelectedDate] = useState(getTodayLocalDateString());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals for editing / paying from calendar
  const [payingBillOccurrence, setPayingBillOccurrence] = useState(null);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);

  const [editingExpense, setEditingExpense] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchMonthData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getCalendarMonthData({
        year: currentYear,
        month: currentMonth
      });
      setCalendarData(data);
    } catch (err) {
      console.error('Failed to load financial calendar:', err);
      setError(err.message || 'Failed to load calendar events.');
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchMonthData();

    const handleDataChanged = () => {
      fetchMonthData();
    };

    window.addEventListener('expense:changed', handleDataChanged);
    window.addEventListener('account:changed', handleDataChanged);
    window.addEventListener('recurring:changed', handleDataChanged);

    return () => {
      window.removeEventListener('expense:changed', handleDataChanged);
      window.removeEventListener('account:changed', handleDataChanged);
      window.removeEventListener('recurring:changed', handleDataChanged);
    };
  }, [fetchMonthData]);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setSelectedDate(getTodayLocalDateString());
  };

  const handlePayBill = (billOcc) => {
    setPayingBillOccurrence(billOcc);
    setIsMarkPaidOpen(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };

  const selectedDayData = selectedDate ? calendarData.daysMap[selectedDate] : null;

  return (
    <div className="calendar-page-container">
      <div className="calendar-header-titles">
        <h1>Financial Calendar & Daily Ledger</h1>
        <p>Visual month-by-month financial timeline, daily cash flow, and upcoming bill reminders</p>
      </div>

      {error && (
        <div className="modal-error-alert" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={16} className="text-danger flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Monthly Summary KPI Cards */}
      <div className="calendar-kpi-summary-grid">
        <div className="calendar-kpi-card spend">
          <span className="cal-kpi-label">Month Spend</span>
          <span className="cal-kpi-value spend">
            {formatCurrencyINR(calendarData.summary.monthlyExpenses)}
          </span>
          <span className="cal-kpi-sub">
            Confirmed personal expenses
          </span>
        </div>

        <div className="calendar-kpi-card income">
          <span className="cal-kpi-label">Month Income</span>
          <span className="cal-kpi-value income">
            {formatCurrencyINR(calendarData.summary.monthlyIncome)}
          </span>
          <span className="cal-kpi-sub">
            Inflow deposits & earnings
          </span>
        </div>

        <div className="calendar-kpi-card net">
          <span className="cal-kpi-label">Net Cash Flow</span>
          <span className={`cal-kpi-value ${calendarData.summary.netCashFlow >= 0 ? 'income' : 'spend'}`}>
            {formatCurrencyINR(calendarData.summary.netCashFlow)}
          </span>
          <span className="cal-kpi-sub">
            Income minus Expenses
          </span>
        </div>

        <div className="calendar-kpi-card bills">
          <span className="cal-kpi-label">Scheduled Due Bills</span>
          <span className="cal-kpi-value bills">
            {formatCurrencyINR(calendarData.summary.pendingBillsTotal)}
          </span>
          <span className="cal-kpi-sub">
            {calendarData.summary.pendingBillsCount} upcoming recurring bill(s)
          </span>
        </div>
      </div>

      {/* Main Layout: Calendar Grid + Day Details Drawer */}
      <div className={`calendar-main-layout ${selectedDate ? 'has-drawer' : ''}`}>
        <FinancialCalendarGrid
          year={currentYear}
          month={currentMonth}
          daysMap={calendarData.daysMap}
          selectedDate={selectedDate}
          onSelectDate={(dt) => setSelectedDate(dt)}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
        />

        {selectedDate && (
          <DayDetailDrawer
            selectedDate={selectedDate}
            dayData={selectedDayData}
            onClose={() => setSelectedDate(null)}
            onPayBill={handlePayBill}
            onEditExpense={handleEditExpense}
          />
        )}
      </div>

      {/* Mark Bill Paid Modal */}
      {isMarkPaidOpen && payingBillOccurrence && (
        <MarkPaidModal
          isOpen={isMarkPaidOpen}
          onClose={() => {
            setIsMarkPaidOpen(false);
            setPayingBillOccurrence(null);
          }}
          occurrence={payingBillOccurrence}
          onSuccess={fetchMonthData}
        />
      )}

      {/* Edit Expense Modal */}
      {isEditModalOpen && editingExpense && (
        <AddExpenseModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingExpense(null);
          }}
          expenseToEdit={editingExpense}
          onSuccess={fetchMonthData}
        />
      )}
    </div>
  );
}
