/**
 * HisabSetu Recurring Expenses & Bill Reminders Utilities
 * Accurate date arithmetic, anchor-preserving month clamping,
 * leap-year handling, validation, and due-date status classifications.
 */

import {
  ALLOWED_CATEGORIES,
  ALLOWED_PAYMENT_METHODS,
  getTodayLocalDateString
} from './dateUtils.js';

export const ALLOWED_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

export const RECURRING_STATUSES = ['active', 'paused', 'completed'];

export const OCCURRENCE_STATUSES = ['pending', 'paid', 'skipped'];

export const COMMON_PRESETS = [
  {
    title: 'House Rent',
    amount: 15000,
    category: 'Bills',
    payment_method: 'Bank Transfer',
    frequency: 'monthly',
    reminder_days_before: 3,
    icon: 'Home'
  },
  {
    title: 'Wi-Fi Broadband',
    amount: 999,
    category: 'Bills',
    payment_method: 'UPI',
    frequency: 'monthly',
    reminder_days_before: 2,
    icon: 'Wifi'
  },
  {
    title: 'Mobile Recharge',
    amount: 399,
    category: 'Bills',
    payment_method: 'UPI',
    frequency: 'monthly',
    reminder_days_before: 2,
    icon: 'Smartphone'
  },
  {
    title: 'Electricity Bill',
    amount: 2200,
    category: 'Bills',
    payment_method: 'UPI',
    frequency: 'monthly',
    reminder_days_before: 3,
    icon: 'Zap'
  },
  {
    title: 'Streaming Subscriptions (OTT)',
    amount: 649,
    category: 'Entertainment',
    payment_method: 'Card',
    frequency: 'monthly',
    reminder_days_before: 1,
    icon: 'Tv'
  },
  {
    title: 'Gym & Fitness',
    amount: 1500,
    category: 'Personal Care',
    payment_method: 'UPI',
    frequency: 'monthly',
    reminder_days_before: 2,
    icon: 'Dumbbell'
  }
];

/**
 * Parses YYYY-MM-DD into integer [year, month (1-12), day].
 */
export function parseDateParts(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return { year: parts[0], month: parts[1], day: parts[2] };
}

/**
 * Formats year, month (1-12), day into YYYY-MM-DD string.
 */
export function formatDateFromParts(year, month, day) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Returns the number of days in a given year and month (1-12).
 * Handles leap years correctly for February (29 in leap, 28 in regular).
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Computes the next scheduled due date without calendar drift.
 * - Daily: +1 day
 * - Weekly: +7 days
 * - Monthly: Anchors to original day-of-month (e.g. 31st). If a shorter month
 *   (like Feb 28 or April 30) is reached, clamps to the last day of that month.
 *   When moving back into a longer month (e.g. March), the original anchor day (31st) is restored.
 * - Yearly: Feb 29 leap years are clamped to Feb 28 in non-leap years.
 *
 * @param {string} currentDueDateStr - YYYY-MM-DD
 * @param {'daily'|'weekly'|'monthly'|'yearly'} frequency
 * @param {number|null} anchorDay - Original day of month (1-31)
 * @returns {{ nextDueDate: string, anchorDay: number }}
 */
export function calculateNextDueDate(currentDueDateStr, frequency, anchorDay = null) {
  const parsed = parseDateParts(currentDueDateStr);
  if (!parsed) {
    throw new Error(`Invalid due date string: ${currentDueDateStr}`);
  }

  const { year, month, day } = parsed;
  const effectiveAnchor = anchorDay || day;

  if (frequency === 'daily') {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 1);
    const nextStr = formatDateFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { nextDueDate: nextStr, anchorDay: effectiveAnchor };
  }

  if (frequency === 'weekly') {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 7);
    const nextStr = formatDateFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { nextDueDate: nextStr, anchorDay: effectiveAnchor };
  }

  if (frequency === 'monthly') {
    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
      nextYear += 1;
      nextMonth = 1;
    }

    const maxDays = getDaysInMonth(nextYear, nextMonth);
    const clampedDay = Math.min(effectiveAnchor, maxDays);
    const nextStr = formatDateFromParts(nextYear, nextMonth, clampedDay);
    return { nextDueDate: nextStr, anchorDay: effectiveAnchor };
  }

  if (frequency === 'yearly') {
    const nextYear = year + 1;
    const maxDays = getDaysInMonth(nextYear, month);
    const clampedDay = Math.min(effectiveAnchor, maxDays);
    const nextStr = formatDateFromParts(nextYear, month, clampedDay);
    return { nextDueDate: nextStr, anchorDay: effectiveAnchor };
  }

  throw new Error(`Unsupported frequency: ${frequency}`);
}

/**
 * Calculates due date status relative to today.
 * @returns {'overdue'|'due-today'|'upcoming-7-days'|'due-later'}
 */
export function getDueStatus(dueDateStr, todayStr = getTodayLocalDateString()) {
  if (!dueDateStr) return 'due-later';

  if (dueDateStr < todayStr) {
    return 'overdue';
  }
  if (dueDateStr === todayStr) {
    return 'due-today';
  }

  const [y1, m1, d1] = todayStr.split('-').map(Number);
  const [y2, m2, d2] = dueDateStr.split('-').map(Number);

  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  const diffDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) {
    return 'upcoming-7-days';
  }
  return 'due-later';
}

/**
 * Calculates human-readable status text and badge metadata.
 */
export function getDueBadgeInfo(dueDateStr, todayStr = getTodayLocalDateString()) {
  const status = getDueStatus(dueDateStr, todayStr);

  const [y1, m1, d1] = todayStr.split('-').map(Number);
  const [y2, m2, d2] = dueDateStr.split('-').map(Number);
  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  const diffDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));

  switch (status) {
    case 'overdue':
      return {
        status,
        badgeText: `Overdue (${Math.abs(diffDays)}d)`,
        badgeClass: 'badge-danger',
        isActionRequired: true
      };
    case 'due-today':
      return {
        status,
        badgeText: 'Due Today',
        badgeClass: 'badge-warning',
        isActionRequired: true
      };
    case 'upcoming-7-days':
      return {
        status,
        badgeText: `Due in ${diffDays}d`,
        badgeClass: 'badge-info',
        isActionRequired: false
      };
    case 'due-later':
    default:
      return {
        status,
        badgeText: `Due in ${diffDays}d`,
        badgeClass: 'badge-neutral',
        isActionRequired: false
      };
  }
}

/**
 * Validates a recurring expense creation or update payload.
 */
export function validateRecurringInput(payload) {
  const errors = {};

  // 1. Title validation
  if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
    errors.title = 'Title or merchant name is required.';
  } else if (payload.title.trim().length > 200) {
    errors.title = 'Title cannot exceed 200 characters.';
  }

  // 2. Amount validation
  if (payload.amount === undefined || payload.amount === null || payload.amount === '') {
    errors.amount = 'Amount is required.';
  } else {
    const num = Number(payload.amount);
    if (isNaN(num) || !isFinite(num)) {
      errors.amount = 'Amount must be a valid number.';
    } else if (num <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    } else if (num > 9999999999.99) {
      errors.amount = 'Amount exceeds maximum permitted limit.';
    }
  }

  // 3. Category validation
  if (!payload.category) {
    errors.category = 'Category is required.';
  } else if (!ALLOWED_CATEGORIES.includes(payload.category)) {
    errors.category = `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`;
  }

  // 4. Payment Method validation
  if (!payload.payment_method) {
    errors.payment_method = 'Payment method is required.';
  } else if (!ALLOWED_PAYMENT_METHODS.includes(payload.payment_method)) {
    errors.payment_method = `Invalid payment method. Must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}`;
  }

  // 5. Frequency validation
  if (!payload.frequency) {
    errors.frequency = 'Recurrence frequency is required.';
  } else if (!ALLOWED_FREQUENCIES.includes(payload.frequency)) {
    errors.frequency = `Invalid frequency. Must be one of: ${ALLOWED_FREQUENCIES.join(', ')}`;
  }

  // 6. Start Date validation
  if (!payload.start_date) {
    errors.start_date = 'Start date is required.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.start_date)) {
    errors.start_date = 'Start date must be in YYYY-MM-DD format.';
  } else {
    const parts = parseDateParts(payload.start_date);
    if (!parts || parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.day > getDaysInMonth(parts.year, parts.month)) {
      errors.start_date = 'Invalid calendar start date.';
    }
  }

  // 7. Next Due Date validation
  if (!payload.next_due_date) {
    errors.next_due_date = 'Next due date is required.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.next_due_date)) {
    errors.next_due_date = 'Next due date must be in YYYY-MM-DD format.';
  }

  // 8. End Date validation (Optional)
  if (payload.end_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.end_date)) {
      errors.end_date = 'End date must be in YYYY-MM-DD format.';
    } else if (payload.start_date && payload.end_date < payload.start_date) {
      errors.end_date = 'End date cannot be earlier than start date.';
    }
  }

  // 9. Reminder Days validation
  if (payload.reminder_days_before !== undefined && payload.reminder_days_before !== null) {
    const rDays = Number(payload.reminder_days_before);
    if (!Number.isInteger(rDays) || rDays < 0 || rDays > 14) {
      errors.reminder_days_before = 'Reminder timing must be between 0 and 14 days.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      title: payload.title?.trim(),
      amount: payload.amount ? parseFloat(Number(payload.amount).toFixed(2)) : 0,
      category: payload.category,
      payment_method: payload.payment_method,
      frequency: payload.frequency,
      start_date: payload.start_date,
      next_due_date: payload.next_due_date || payload.start_date,
      end_date: payload.end_date || null,
      notes: payload.notes?.trim() || null,
      reminder_days_before: payload.reminder_days_before !== undefined ? Number(payload.reminder_days_before) : 1,
      status: payload.status || 'active'
    }
  };
}
