import React, { useState, useEffect } from 'react';
import {
  X,
  Repeat,
  Sparkles,
  Calendar,
  AlertCircle,
  Check,
  Bell,
  Home,
  Wifi,
  Smartphone,
  Zap,
  Tv,
  Dumbbell
} from 'lucide-react';
import { ALLOWED_CATEGORIES, ALLOWED_PAYMENT_METHODS } from '../../utils/dateUtils';
import {
  ALLOWED_FREQUENCIES,
  COMMON_PRESETS,
  validateRecurringInput
} from '../../utils/recurringUtils';
import {
  createRecurringExpense,
  updateRecurringExpense
} from '../../services/recurringService';
import './RecurringModal.css';

const PRESET_ICONS = {
  Home,
  Wifi,
  Smartphone,
  Zap,
  Tv,
  Dumbbell
};

export default function RecurringModal({
  isOpen,
  onClose,
  initialData = null,
  onSuccess
}) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Bills');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderDays, setReminderDays] = useState(1);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(initialData?.id);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);

      if (initialData) {
        setTitle(initialData.title || '');
        setAmount(String(initialData.amount || ''));
        setCategory(initialData.category || 'Bills');
        setPaymentMethod(initialData.payment_method || 'UPI');
        setFrequency(initialData.frequency || 'monthly');
        setStartDate(initialData.start_date || '');
        setNextDueDate(initialData.next_due_date || initialData.start_date || '');
        setEndDate(initialData.end_date || '');
        setNotes(initialData.notes || '');
        setReminderDays(initialData.reminder_days_before !== undefined ? initialData.reminder_days_before : 1);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setTitle('');
        setAmount('');
        setCategory('Bills');
        setPaymentMethod('UPI');
        setFrequency('monthly');
        setStartDate(today);
        setNextDueDate(today);
        setEndDate('');
        setNotes('');
        setReminderDays(1);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setTitle(preset.title);
    setAmount(String(preset.amount));
    setCategory(preset.category);
    setPaymentMethod(preset.payment_method);
    setFrequency(preset.frequency);
    setReminderDays(preset.reminder_days_before);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const payload = {
      title,
      amount,
      category,
      payment_method: paymentMethod,
      frequency,
      start_date: startDate,
      next_due_date: nextDueDate || startDate,
      end_date: endDate || null,
      notes,
      reminder_days_before: Number(reminderDays)
    };

    const validation = validateRecurringInput(payload);
    if (!validation.isValid) {
      setError(Object.values(validation.errors)[0]);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateRecurringExpense(initialData.id, payload);
      } else {
        await createRecurringExpense(payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to save recurring bill:', err);
      setError(err.message || 'Failed to save recurring schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container recurring-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" aria-hidden="true">
              <Repeat size={20} />
            </div>
            <div>
              <h2 className="modal-title">
                {isEditing ? 'Edit Recurring Schedule' : 'New Recurring Bill'}
              </h2>
              <p className="modal-subtitle">
                Automate due dates, reminders, and ledger logging
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="modal-error-alert" role="alert">
              <AlertCircle size={16} className="text-danger flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Preset Selector for New Bills */}
          {!isEditing && (
            <div className="form-group">
              <div className="presets-label-row">
                <span className="presets-title">
                  <Sparkles size={13} className="text-gold" />
                  <span>Quick Templates</span>
                </span>
              </div>
              <div className="presets-scroll-grid">
                {COMMON_PRESETS.map((p) => {
                  const Icon = PRESET_ICONS[p.icon] || Repeat;
                  return (
                    <button
                      key={p.title}
                      type="button"
                      className="preset-chip"
                      onClick={() => handleApplyPreset(p)}
                    >
                      <Icon size={14} className="preset-icon" />
                      <span>{p.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Title / Merchant */}
          <div className="form-group">
            <label className="form-label" htmlFor="rec-title-input">
              Bill / Subscription Name
            </label>
            <input
              id="rec-title-input"
              type="text"
              className="form-control"
              placeholder="e.g. House Rent, Netflix, Airtel Fiber"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Amount & Frequency Row */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="rec-amount-input">
                Amount (₹)
              </label>
              <div className="input-currency-wrap">
                <span className="currency-prefix">₹</span>
                <input
                  id="rec-amount-input"
                  type="number"
                  step="0.01"
                  min="1"
                  max="9999999999.99"
                  className="form-control input-with-prefix"
                  placeholder="e.g. 15000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rec-frequency-select">
                Frequency
              </label>
              <select
                id="rec-frequency-select"
                className="form-control"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                {ALLOWED_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Payment Method Row */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="rec-category-select">
                Category
              </label>
              <select
                id="rec-category-select"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {ALLOWED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rec-payment-select">
                Payment Method
              </label>
              <select
                id="rec-payment-select"
                className="form-control"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {ALLOWED_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates: Start Date & Next Due Date */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="rec-start-date">
                Start Date
              </label>
              <input
                id="rec-start-date"
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!isEditing && (!nextDueDate || nextDueDate === startDate)) {
                    setNextDueDate(e.target.value);
                  }
                }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rec-due-date">
                Next Due Date
              </label>
              <input
                id="rec-due-date"
                type="date"
                className="form-control"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* End Date (Optional) & Reminder Timing */}
          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="rec-end-date">
                End Date (Optional)
              </label>
              <input
                id="rec-end-date"
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="rec-reminder-select">
                Reminder Notice
              </label>
              <select
                id="rec-reminder-select"
                className="form-control"
                value={reminderDays}
                onChange={(e) => setReminderDays(Number(e.target.value))}
              >
                <option value={0}>On the due date</option>
                <option value={1}>1 day before</option>
                <option value={2}>2 days before</option>
                <option value={3}>3 days before</option>
                <option value={7}>1 week before</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="rec-notes">
              Notes (Optional)
            </label>
            <input
              id="rec-notes"
              type="text"
              className="form-control"
              placeholder="e.g. Account No, UPI ID, or Policy number"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              <Check size={16} />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Schedule' : 'Create Recurring Bill'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
