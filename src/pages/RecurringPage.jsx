import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Repeat,
  Plus,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  History,
  Bell,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Home,
  Wifi,
  Tv,
  Smartphone
} from 'lucide-react';
import { CATEGORY_COLORS, formatCurrencyINR, getTodayLocalDateString } from '../utils/dateUtils';
import {
  getDueBadgeInfo,
  COMMON_PRESETS
} from '../utils/recurringUtils';
import {
  getDueDashboardData,
  deleteRecurringExpense,
  pauseRecurringExpense,
  resumeRecurringExpense
} from '../services/recurringService';
import {
  areNotificationsEnabled,
  setNotificationsEnabled,
  requestNotificationPermission
} from '../services/notificationService';
import RecurringModal from '../components/recurring/RecurringModal';
import MarkPaidModal from '../components/recurring/MarkPaidModal';
import OccurrenceHistoryModal from '../components/recurring/OccurrenceHistoryModal';
import './RecurringPage.css';

export default function RecurringPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active filter tab: 'upcoming' | 'all' | 'overdue' | 'due-today' | 'active' | 'paused' | 'paid'
  const [activeTab, setActiveTab] = useState('upcoming');

  // Modals state
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [payingOccurrence, setPayingOccurrence] = useState(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySchedule, setHistorySchedule] = useState(null);

  // Notifications toggle
  const [notificationsOn, setNotificationsOn] = useState(areNotificationsEnabled());
  const [notifPermissionState, setNotifPermissionState] = useState('prompt');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getDueDashboardData();
      setData(result);
    } catch (err) {
      console.error('Failed to load recurring bills dashboard:', err);
      setError(err.message || 'Failed to load recurring bills.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const handleRecurringChange = () => fetchData();
    const handleExpenseChange = () => fetchData();

    window.addEventListener('recurring:changed', handleRecurringChange);
    window.addEventListener('expense:changed', handleExpenseChange);

    return () => {
      window.removeEventListener('recurring:changed', handleRecurringChange);
      window.removeEventListener('expense:changed', handleExpenseChange);
    };
  }, [fetchData]);

  const handleToggleNotifications = async () => {
    if (!notificationsOn) {
      const res = await requestNotificationPermission();
      if (res.granted) {
        setNotificationsEnabled(true);
        setNotificationsOn(true);
        setNotifPermissionState('granted');
      } else {
        alert('Notification permission was not granted. You can enable it in your device settings.');
      }
    } else {
      setNotificationsEnabled(false);
      setNotificationsOn(false);
    }
  };

  const handleOpenCreateModal = (preset = null) => {
    if (preset) {
      setEditingSchedule({
        title: preset.title,
        amount: preset.amount,
        category: preset.category,
        payment_method: preset.payment_method,
        frequency: preset.frequency,
        reminder_days_before: preset.reminder_days_before,
        start_date: getTodayLocalDateString(),
        next_due_date: getTodayLocalDateString()
      });
    } else {
      setEditingSchedule(null);
    }
    setIsRecurringModalOpen(true);
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setIsRecurringModalOpen(true);
  };

  const handlePauseToggle = async (schedule) => {
    try {
      if (schedule.status === 'paused') {
        await resumeRecurringExpense(schedule.id);
      } else {
        await pauseRecurringExpense(schedule.id);
      }
      fetchData();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    const confirmMsg = `Are you sure you want to delete "${schedule.title}"? This will delete the schedule and all future pending occurrences. Previously paid expenses in your ledger will not be deleted.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteRecurringExpense(schedule.id);
      fetchData();
    } catch (err) {
      alert(`Failed to delete recurring schedule: ${err.message}`);
    }
  };

  const handleOpenMarkPaid = (occurrence) => {
    setPayingOccurrence(occurrence);
    setIsMarkPaidOpen(true);
  };

  const handleOpenHistory = (schedule) => {
    setHistorySchedule(schedule);
    setIsHistoryOpen(true);
  };

  const todayStr = getTodayLocalDateString();

  // Filtered schedules or occurrences based on active tab
  const displayedItems = useMemo(() => {
    if (!data) return [];

    switch (activeTab) {
      case 'overdue':
        return data.overdueBills;
      case 'due-today':
        return data.dueTodayBills;
      case 'upcoming':
        // Overdue + Due Today + Next 7 days
        return [...data.overdueBills, ...data.dueTodayBills, ...data.upcoming7DaysBills];
      case 'paid':
        return data.paidBills;
      case 'paused':
        return data.schedules.filter((s) => s.status === 'paused');
      case 'active':
        return data.schedules.filter((s) => s.status === 'active');
      case 'all':
      default:
        return data.schedules;
    }
  }, [data, activeTab]);

  const hasAnyRecurring = data && data.schedules.length > 0;

  return (
    <div className="recurring-page-container">
      {/* Top Header */}
      <div className="recurring-page-header">
        <div className="header-titles">
          <div className="recurring-badge-tag">
            <Repeat size={14} />
            <span>RECURRING EXPENSES & BILLS</span>
          </div>
          <h1 className="recurring-page-title">Subscriptions & Bill Reminders</h1>
          <p className="recurring-page-subtitle">
            Never miss rent, utilities, or subscriptions. Review due occurrences and safely log them to your ledger.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className={`btn-notification-toggle ${notificationsOn ? 'active' : ''}`}
            onClick={handleToggleNotifications}
            title={notificationsOn ? 'Bill notifications are enabled' : 'Enable bill reminders'}
          >
            <Bell size={16} />
            <span>{notificationsOn ? 'Reminders On' : 'Enable Reminders'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleOpenCreateModal()}
          >
            <Plus size={16} />
            <span>New Recurring Bill</span>
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="recurring-error-banner" role="alert">
          <AlertCircle size={18} className="text-danger flex-shrink-0" />
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline" onClick={fetchData}>
            Retry
          </button>
        </div>
      )}

      {/* Executive Due-Date Dashboard KPI Grid */}
      <section className="recurring-kpi-grid" aria-label="Bill Due Metrics">
        <div className="kpi-card card">
          <div className="kpi-header">
            <span className="kpi-title">Total Upcoming</span>
            <div className="kpi-icon" aria-hidden="true">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-amount">
            {formatCurrencyINR(data?.summary?.totalPendingAmount || 0, false)}
          </div>
          <div className="kpi-footer">
            <span>{data?.summary?.totalPendingCount || 0} bills pending payment</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-header">
            <span className="kpi-title">Overdue Bills</span>
            <div className="kpi-icon" aria-hidden="true">
              <AlertCircle size={16} className={data?.summary?.overdueCount > 0 ? 'text-danger' : ''} />
            </div>
          </div>
          <div className={`kpi-amount ${data?.summary?.overdueCount > 0 ? 'text-danger' : ''}`}>
            {formatCurrencyINR(data?.summary?.overdueAmount || 0, false)}
          </div>
          <div className="kpi-footer">
            <span className={data?.summary?.overdueCount > 0 ? 'text-danger font-bold' : ''}>
              {data?.summary?.overdueCount || 0} overdue
            </span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-header">
            <span className="kpi-title">Due Today</span>
            <div className="kpi-icon" aria-hidden="true">
              <Calendar size={16} className={data?.summary?.dueTodayCount > 0 ? 'text-warning' : ''} />
            </div>
          </div>
          <div className={`kpi-amount ${data?.summary?.dueTodayCount > 0 ? 'text-warning' : ''}`}>
            {formatCurrencyINR(data?.summary?.dueTodayAmount || 0, false)}
          </div>
          <div className="kpi-footer">
            <span>{data?.summary?.dueTodayCount || 0} bills due today</span>
          </div>
        </div>

        <div className="kpi-card card">
          <div className="kpi-header">
            <span className="kpi-title">Due in Next 7 Days</span>
            <div className="kpi-icon" aria-hidden="true">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-amount">
            {formatCurrencyINR(data?.summary?.upcoming7DaysAmount || 0, false)}
          </div>
          <div className="kpi-footer">
            <span>{data?.summary?.upcoming7DaysCount || 0} bills approaching</span>
          </div>
        </div>
      </section>

      {/* Critical Alerts Banner (If Overdue or Due Today) */}
      {(data?.summary?.overdueCount > 0 || data?.summary?.dueTodayCount > 0) && (
        <div className="critical-alerts-strip">
          {data?.summary?.overdueCount > 0 && (
            <div className="bill-alert-pill alert-danger" role="alert">
              <AlertCircle size={18} className="text-danger flex-shrink-0" />
              <div className="alert-text">
                <strong>Attention Required:</strong> You have {data.summary.overdueCount} overdue bill(s) totaling {formatCurrencyINR(data.summary.overdueAmount, false)}.
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline alert-action-btn"
                onClick={() => setActiveTab('overdue')}
              >
                View Overdue
              </button>
            </div>
          )}

          {data?.summary?.dueTodayCount > 0 && (
            <div className="bill-alert-pill alert-warning" role="alert">
              <AlertTriangle size={18} className="text-warning flex-shrink-0" />
              <div className="alert-text">
                <strong>Due Today:</strong> {data.summary.dueTodayCount} bill(s) are due today ({formatCurrencyINR(data.summary.dueTodayAmount, false)}).
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline alert-action-btn"
                onClick={() => setActiveTab('due-today')}
              >
                View Due Today
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="recurring-tabs-row" role="tablist">
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
          role="tab"
          aria-selected={activeTab === 'upcoming'}
        >
          Upcoming & Due ({data?.summary?.totalPendingCount || 0})
        </button>
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'overdue' ? 'active' : ''}`}
          onClick={() => setActiveTab('overdue')}
          role="tab"
          aria-selected={activeTab === 'overdue'}
        >
          Overdue ({data?.summary?.overdueCount || 0})
        </button>
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'due-today' ? 'active' : ''}`}
          onClick={() => setActiveTab('due-today')}
          role="tab"
          aria-selected={activeTab === 'due-today'}
        >
          Due Today ({data?.summary?.dueTodayCount || 0})
        </button>
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
          role="tab"
          aria-selected={activeTab === 'all'}
        >
          All Schedules ({data?.schedules?.length || 0})
        </button>
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'paid' ? 'active' : ''}`}
          onClick={() => setActiveTab('paid')}
          role="tab"
          aria-selected={activeTab === 'paid'}
        >
          Paid History ({data?.summary?.paidCount || 0})
        </button>
        <button
          type="button"
          className={`rec-tab-btn ${activeTab === 'paused' ? 'active' : ''}`}
          onClick={() => setActiveTab('paused')}
          role="tab"
          aria-selected={activeTab === 'paused'}
        >
          Paused ({data?.schedules?.filter((s) => s.status === 'paused').length || 0})
        </button>
      </div>

      {/* Content Section */}
      {isLoading && !data ? (
        <div className="recurring-loading-state">
          <div className="pulse-spinner" />
          <span>Loading recurring schedules & due dates...</span>
        </div>
      ) : !hasAnyRecurring ? (
        /* Empty State with Presets */
        <div className="recurring-empty-state card">
          <div className="empty-spark-icon" aria-hidden="true">
            <Repeat size={36} />
          </div>
          <h3 className="empty-title">No Recurring Expenses Configured</h3>
          <p className="empty-desc">
            Keep your finances effortlessly on track. Configure recurring bills like House Rent, Wi-Fi, OTT subscriptions, or insurance to receive due reminders and log payments in one tap.
          </p>

          <div className="presets-recommend-title">Quick Select a Common Bill:</div>
          <div className="presets-recommend-grid">
            {COMMON_PRESETS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                className="preset-recommend-card"
                onClick={() => handleOpenCreateModal(preset)}
              >
                <div className="preset-card-title">{preset.title}</div>
                <div className="preset-card-amount">{formatCurrencyINR(preset.amount, false)}</div>
                <div className="preset-card-sub">{preset.frequency} • {preset.category}</div>
              </button>
            ))}
          </div>

          <div className="empty-cta-wrap">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleOpenCreateModal()}
            >
              <Plus size={16} />
              <span>Create Custom Recurring Bill</span>
            </button>
          </div>
        </div>
      ) : (
        /* Bills & Schedules List */
        <div className="recurring-items-container">
          {displayedItems.length === 0 ? (
            <div className="tab-empty-notice card">
              <Clock size={32} className="empty-state-icon" />
              <p className="empty-state-title">No bills found under "{activeTab}"</p>
              <p className="empty-state-subtitle">
                No items match the selected filter. Switch tabs or add a new recurring bill.
              </p>
            </div>
          ) : (
            <div className="bills-grid">
              {displayedItems.map((item) => {
                // Item can be an occurrence or a schedule
                const isOccurrence = Boolean(item.scheduled_due_date);
                const schedule = isOccurrence ? item.schedule || {} : item;
                const dueDate = isOccurrence ? item.scheduled_due_date : schedule.next_due_date;
                const amount = isOccurrence
                  ? item.actual_paid_amount || schedule.amount
                  : schedule.amount;

                const dueInfo = getDueBadgeInfo(dueDate, todayStr);
                const categoryColor = CATEGORY_COLORS[schedule.category] || '#64748B';
                const isPaid = isOccurrence && item.status === 'paid';
                const isPaused = schedule.status === 'paused';

                return (
                  <div
                    key={item.id}
                    className={`bill-card card ${
                      dueInfo.status === 'overdue' && !isPaid ? 'card-overdue' : ''
                    } ${isPaused ? 'card-paused' : ''}`}
                  >
                    <div className="bill-card-header">
                      <div className="bill-title-group">
                        <div
                          className="bill-cat-badge"
                          style={{ backgroundColor: `${categoryColor}18`, color: categoryColor }}
                        >
                          <Repeat size={16} />
                        </div>
                        <div>
                          <h3 className="bill-title">{schedule.title || 'Untitled Bill'}</h3>
                          <span className="bill-category-sub">
                            {schedule.category} • {schedule.frequency?.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="bill-badges">
                        {isPaid ? (
                          <span className="badge badge-success">Paid</span>
                        ) : isPaused ? (
                          <span className="badge badge-neutral">Paused</span>
                        ) : (
                          <span className={`badge ${dueInfo.badgeClass}`}>
                            {dueInfo.badgeText}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bill-card-body">
                      <div className="bill-amount-row">
                        <span className="amount-label">{isPaid ? 'Paid Amount' : 'Amount Due'}</span>
                        <span className="amount-val">{formatCurrencyINR(amount, false)}</span>
                      </div>

                      <div className="bill-details-row">
                        <div className="detail-item">
                          <Calendar size={13} className="text-muted" />
                          <span>
                            {isPaid
                              ? `Paid on ${item.actual_payment_date}`
                              : `Due on ${dueDate}`}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="dot" style={{ backgroundColor: categoryColor }} />
                          <span>{schedule.payment_method || 'UPI'}</span>
                        </div>
                      </div>

                      {schedule.notes && (
                        <p className="bill-notes-text">
                          {schedule.notes}
                        </p>
                      )}
                    </div>

                    <div className="bill-card-footer">
                      {!isPaid && (
                        <button
                          type="button"
                          className="btn btn-sm btn-mark-paid"
                          onClick={() => {
                            if (isOccurrence) {
                              handleOpenMarkPaid(item);
                            } else {
                              // If rendered from schedule list, construct occurrence payload
                              handleOpenMarkPaid({
                                id: item.id, // will be resolved or occurrence created
                                scheduled_due_date: item.next_due_date,
                                schedule: item
                              });
                            }
                          }}
                        >
                          <CheckCircle2 size={15} />
                          <span>Mark Paid</span>
                        </button>
                      )}

                      <div className="bill-actions-secondary">
                        <button
                          type="button"
                          className="icon-action-btn"
                          onClick={() => handleOpenHistory(schedule)}
                          title="View Payment History"
                          aria-label="View Payment History"
                        >
                          <History size={15} />
                        </button>

                        <button
                          type="button"
                          className="icon-action-btn"
                          onClick={() => handlePauseToggle(schedule)}
                          title={isPaused ? 'Resume schedule' : 'Pause schedule'}
                          aria-label={isPaused ? 'Resume schedule' : 'Pause schedule'}
                        >
                          {isPaused ? <PlayCircle size={15} /> : <PauseCircle size={15} />}
                        </button>

                        <button
                          type="button"
                          className="icon-action-btn"
                          onClick={() => handleEditSchedule(schedule)}
                          title="Edit Schedule"
                          aria-label="Edit Schedule"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="icon-action-btn btn-trash"
                          onClick={() => handleDeleteSchedule(schedule)}
                          title="Delete Schedule"
                          aria-label="Delete Schedule"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        initialData={editingSchedule}
        onSuccess={fetchData}
      />

      <MarkPaidModal
        isOpen={isMarkPaidOpen}
        onClose={() => setIsMarkPaidOpen(false)}
        occurrence={payingOccurrence}
        onSuccess={fetchData}
      />

      <OccurrenceHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        schedule={historySchedule}
        onRefresh={fetchData}
      />
    </div>
  );
}
