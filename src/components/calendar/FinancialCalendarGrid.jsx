import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Grid,
  List,
  Receipt,
  TrendingUp,
  ArrowRightLeft,
  Repeat
} from 'lucide-react';
import { formatCurrencyINR, getTodayLocalDateString } from '../../utils/dateUtils';
import './FinancialCalendarGrid.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FinancialCalendarGrid({
  year,
  month,
  daysMap = {},
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday
}) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'agenda'
  const todayStr = getTodayLocalDateString();

  // First day of this month
  const firstDayObj = new Date(year, month - 1, 1);
  const startDayOfWeek = firstDayObj.getDay(); // 0 is Sunday
  const lastDayObj = new Date(year, month, 0);
  const totalDays = lastDayObj.getDate();

  // Days from previous month for leading padding
  const prevMonthLastDayObj = new Date(year, month - 1, 0);
  const prevMonthTotalDays = prevMonthLastDayObj.getDate();

  const gridCells = [];

  // 1. Leading padding days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    gridCells.push({
      isCurrentMonth: false,
      dayNum,
      dateString: null
    });
  }

  // 2. Days of current month
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = daysMap[dateStr] || {
      expensesTotal: 0,
      incomesTotal: 0,
      transfersTotal: 0,
      pendingBillsTotal: 0,
      hasActivity: false,
      expenses: [],
      incomes: [],
      transfers: [],
      pendingBills: []
    };

    gridCells.push({
      isCurrentMonth: true,
      dayNum: d,
      dateString: dateStr,
      data: dayData
    });
  }

  // 3. Trailing padding days to fill 7-column grid
  const remaining = 7 - (gridCells.length % 7);
  if (remaining < 7) {
    for (let t = 1; t <= remaining; t++) {
      gridCells.push({
        isCurrentMonth: false,
        dayNum: t,
        dateString: null
      });
    }
  }

  // For Agenda view: list days in this month that have activity
  const activeDaysList = Object.values(daysMap)
    .filter((d) => d.hasActivity)
    .sort((a, b) => a.dateString.localeCompare(b.dateString));

  return (
    <div className="calendar-grid-wrapper">
      {/* Top navigation bar */}
      <div className="calendar-top-bar">
        <div className="month-nav-group">
          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onPrevMonth}
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft size={18} />
          </button>

          <h2 className="current-month-heading">
            {MONTH_NAMES[month - 1]} {year}
          </h2>

          <button
            type="button"
            className="nav-arrow-btn"
            onClick={onNextMonth}
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="btn-today-nav"
            onClick={onToday}
          >
            Today
          </button>
        </div>

        <div className="view-toggle-pills">
          <button
            type="button"
            className={`view-pill-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <Grid size={14} />
            <span>Grid</span>
          </button>

          <button
            type="button"
            className={`view-pill-btn ${viewMode === 'agenda' ? 'active' : ''}`}
            onClick={() => setViewMode('agenda')}
          >
            <List size={14} />
            <span>Agenda</span>
          </button>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="calendar-legend-bar">
        <div className="legend-item">
          <span className="legend-dot expense" />
          <span>Expense</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot income" />
          <span>Income</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot transfer" />
          <span>Transfer</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot pending-bill" />
          <span>Scheduled Due Bill</span>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <>
          <div className="calendar-days-header-row">
            {DAY_NAMES.map((name) => (
              <div key={name} className="day-col-header">
                {name}
              </div>
            ))}
          </div>

          <div className="calendar-grid-cells">
            {gridCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div key={`pad-${idx}`} className="calendar-cell outside-month">
                    <span className="cell-day-num">{cell.dayNum}</span>
                  </div>
                );
              }

              const d = cell.data;
              const isToday = cell.dateString === todayStr;
              const isSelected = cell.dateString === selectedDate;

              return (
                <div
                  key={cell.dateString}
                  className={`calendar-cell ${isToday ? 'is-today' : ''} ${
                    isSelected ? 'is-selected' : ''
                  }`}
                  onClick={() => onSelectDate(cell.dateString)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cell-header">
                    <span className="cell-day-num">{cell.dayNum}</span>
                    <div className="cell-dots-row">
                      {d.expenses.length > 0 && <span className="cell-dot expense" title="Expenses" />}
                      {d.incomes.length > 0 && <span className="cell-dot income" title="Incomes" />}
                      {d.transfers.length > 0 && <span className="cell-dot transfer" title="Transfers" />}
                      {d.pendingBills.length > 0 && <span className="cell-dot pending-bill" title="Scheduled Bills" />}
                    </div>
                  </div>

                  <div className="cell-amounts-stack">
                    {d.expensesTotal > 0 && (
                      <span className="cell-amount-pill expense" title={`Total spent: ₹${d.expensesTotal}`}>
                        -{formatCurrencyINR(d.expensesTotal, false)}
                      </span>
                    )}

                    {d.incomesTotal > 0 && (
                      <span className="cell-amount-pill income" title={`Total income: ₹${d.incomesTotal}`}>
                        +{formatCurrencyINR(d.incomesTotal, false)}
                      </span>
                    )}

                    {d.pendingBillsTotal > 0 && (
                      <span className="cell-amount-pill pending-bill" title={`Bill due: ₹${d.pendingBillsTotal}`}>
                        Due ₹{d.pendingBillsTotal}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Agenda / List View */
        <div className="calendar-agenda-view">
          {activeDaysList.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              No financial activity recorded in {MONTH_NAMES[month - 1]} {year}.
            </div>
          ) : (
            activeDaysList.map((day) => {
              const isToday = day.dateString === todayStr;
              const isSelected = day.dateString === selectedDate;

              return (
                <div
                  key={day.dateString}
                  className={`agenda-day-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onSelectDate(day.dateString)}
                >
                  <div className="agenda-day-date">
                    <Calendar size={16} className={isToday ? 'text-emerald' : 'text-muted'} />
                    <span>
                      {new Date(day.dateString + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                      {isToday && ' (Today)'}
                    </span>
                  </div>

                  <div className="agenda-day-totals">
                    {day.expensesTotal > 0 && (
                      <span style={{ color: '#DC2626' }}>
                        -{formatCurrencyINR(day.expensesTotal)}
                      </span>
                    )}
                    {day.incomesTotal > 0 && (
                      <span style={{ color: '#059669' }}>
                        +{formatCurrencyINR(day.incomesTotal)}
                      </span>
                    )}
                    {day.pendingBillsTotal > 0 && (
                      <span style={{ color: '#B45309' }}>
                        Due {formatCurrencyINR(day.pendingBillsTotal)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
