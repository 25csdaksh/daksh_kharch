/**
 * PaisaTrack Financial & Date Utilities
 */

export const ALLOWED_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Education',
  'Entertainment',
  'Bills',
  'Healthcare',
  'Personal Care',
  'Other'
];

export const ALLOWED_PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Card',
  'Bank Transfer',
  'Other'
];

export const CATEGORY_COLORS = {
  Food: '#10B981',
  Transport: '#2563EB',
  Shopping: '#EC4899',
  Education: '#8B5CF6',
  Entertainment: '#F59E0B',
  Bills: '#EF4444',
  Healthcare: '#06B6D4',
  'Personal Care': '#F97316',
  Other: '#64748B'
};

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 */
export function getTodayLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates current week boundaries (Monday through Sunday) in user local dates YYYY-MM-DD.
 */
export function getCurrentWeekRange(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  // getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const dayOfWeek = date.getDay();
  // Distance from Monday (0 if Monday, -1 if Tuesday, ..., 6 if Sunday)
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return {
      name,
      dateString: formatDate(d),
      dayOfMonth: d.getDate()
    };
  });

  return {
    startDate: formatDate(monday),
    endDate: formatDate(sunday),
    days
  };
}

/**
 * Calculates current month boundaries (1st day to last day) in user local dates YYYY-MM-DD.
 */
export function getCurrentMonthRange(referenceDate = new Date()) {
  const date = new Date(referenceDate);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
    year,
    monthIndex: month,
    monthName: monthNames[month]
  };
}

/**
 * Formats a date string (YYYY-MM-DD) into user-friendly display text.
 */
export function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  
  const todayStr = getTodayLocalDateString();
  if (dateStr === todayStr) {
    return 'Today';
  }

  // Check if yesterday
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const yYear = now.getFullYear();
  const yMonth = String(now.getMonth() + 1).padStart(2, '0');
  const yDay = String(now.getDate()).padStart(2, '0');
  const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;
  
  if (dateStr === yesterdayStr) {
    return 'Yesterday';
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Formats a numeric currency amount into INR currency representation.
 */
export function formatCurrencyINR(amount, includeDecimals = true) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num)) return '₹0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals && num % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2
  }).format(num);
}

/**
 * Validates an expense payload against business constraints.
 */
export function validateExpenseInput(expense) {
  const errors = {};

  // 1. Amount validation
  if (expense.amount === undefined || expense.amount === null || expense.amount === '') {
    errors.amount = 'Amount is required.';
  } else {
    const num = Number(expense.amount);
    if (isNaN(num) || !isFinite(num)) {
      errors.amount = 'Amount must be a valid number.';
    } else if (num <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    } else if (num > 9999999999.99) {
      errors.amount = 'Amount exceeds maximum permitted limit.';
    }
  }

  // 2. Category validation
  if (!expense.category) {
    errors.category = 'Category is required.';
  } else if (!ALLOWED_CATEGORIES.includes(expense.category)) {
    errors.category = `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`;
  }

  // 3. Payment Method validation
  if (!expense.payment_method) {
    errors.payment_method = 'Payment method is required.';
  } else if (!ALLOWED_PAYMENT_METHODS.includes(expense.payment_method)) {
    errors.payment_method = `Invalid payment method. Must be one of: ${ALLOWED_PAYMENT_METHODS.join(', ')}`;
  }

  // 4. Expense Date validation
  if (!expense.expense_date) {
    errors.expense_date = 'Expense date is required.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(expense.expense_date)) {
    errors.expense_date = 'Expense date must be in YYYY-MM-DD format.';
  } else {
    const [y, m, d] = expense.expense_date.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime()) || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      errors.expense_date = 'Invalid calendar date.';
    }
  }

  // 5. Description validation
  if (expense.description && typeof expense.description === 'string' && expense.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
