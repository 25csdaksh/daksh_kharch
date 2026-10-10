/**
 * PaisaTrack Report & Analytics Utilities
 * Provides exact calendar period boundaries, financial aggregation,
 * comparative delta calculations, and CSV sanitization.
 */

import {
  formatCurrencyINR,
  CATEGORY_COLORS,
  ALLOWED_CATEGORIES
} from './dateUtils.js';

/**
 * Returns Monday–Sunday boundaries for a given relative week offset.
 * @param {number} offsetWeeks - 0 for current week, -1 for previous week, +1 for next week, etc.
 * @param {Date} referenceDate - Anchor date
 */
export function getWeekBoundaries(offsetWeeks = 0, referenceDate = new Date()) {
  const baseDate = new Date(referenceDate);
  baseDate.setDate(baseDate.getDate() + offsetWeeks * 7);

  const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = dayNames.map((name, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return {
      name,
      dateString: formatDate(d),
      dayOfMonth: d.getDate(),
      month: d.getMonth() + 1
    };
  });

  // Prior week for comparative analytics
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);

  const startFormatted = formatDate(monday);
  const endFormatted = formatDate(sunday);

  const monLabel = monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const sunLabel = sunday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return {
    startDate: startFormatted,
    endDate: endFormatted,
    days,
    label: `${monLabel} – ${sunLabel}`,
    periodType: 'weekly',
    prevStartDate: formatDate(prevMonday),
    prevEndDate: formatDate(prevSunday)
  };
}

/**
 * Returns month boundaries (1st to last day) for a relative month offset.
 * Correctly accounts for 28, 29 (leap years), 30, and 31 days.
 * @param {number} offsetMonths - 0 for current month, -1 for previous month, etc.
 * @param {Date} referenceDate - Anchor date
 */
export function getMonthBoundaries(offsetMonths = 0, referenceDate = new Date()) {
  const baseDate = new Date(referenceDate);
  const targetYear = baseDate.getFullYear();
  const targetMonth = baseDate.getMonth() + offsetMonths;

  const firstDay = new Date(targetYear, targetMonth, 1);
  const lastDay = new Date(targetYear, targetMonth + 1, 0); // Last day of month

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const daysCount = lastDay.getDate();
  const days = [];
  for (let i = 1; i <= daysCount; i++) {
    const d = new Date(firstDay.getFullYear(), firstDay.getMonth(), i);
    days.push({
      dayNumber: i,
      name: `Day ${i}`,
      dateString: formatDate(d)
    });
  }

  // Prior month boundaries
  const prevMonthFirst = new Date(firstDay.getFullYear(), firstDay.getMonth() - 1, 1);
  const prevMonthLast = new Date(firstDay.getFullYear(), firstDay.getMonth(), 0);

  const monthName = firstDay.toLocaleDateString('en-IN', { month: 'long' });
  const year = firstDay.getFullYear();

  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
    daysCount,
    days,
    monthName,
    year,
    label: `${monthName} ${year}`,
    periodType: 'monthly',
    prevStartDate: formatDate(prevMonthFirst),
    prevEndDate: formatDate(prevMonthLast)
  };
}

/**
 * Returns year boundaries (Jan 1 to Dec 31) for a relative year offset.
 * @param {number} offsetYears - 0 for current year, -1 for previous year, etc.
 * @param {Date} referenceDate - Anchor date
 */
export function getYearBoundaries(offsetYears = 0, referenceDate = new Date()) {
  const baseDate = new Date(referenceDate);
  const year = baseDate.getFullYear() + offsetYears;

  const firstDay = new Date(year, 0, 1);
  const lastDay = new Date(year, 11, 31);

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const monthNamesShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const months = monthNamesShort.map((shortName, index) => {
    const mStart = new Date(year, index, 1);
    const mEnd = new Date(year, index + 1, 0);
    return {
      name: shortName,
      monthIndex: index,
      monthNumber: index + 1,
      startDate: formatDate(mStart),
      endDate: formatDate(mEnd)
    };
  });

  const prevYearFirst = new Date(year - 1, 0, 1);
  const prevYearLast = new Date(year - 1, 11, 31);

  return {
    startDate: formatDate(firstDay),
    endDate: formatDate(lastDay),
    year,
    months,
    label: `Year ${year}`,
    periodType: 'yearly',
    prevStartDate: formatDate(prevYearFirst),
    prevEndDate: formatDate(prevYearLast)
  };
}

/**
 * Validates a custom date range.
 */
export function validateCustomDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Both start date and end date are required.' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { isValid: false, error: 'Dates must be in YYYY-MM-DD format.' };
  }

  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);

  const sDate = new Date(sy, sm - 1, sd);
  const eDate = new Date(ey, em - 1, ed);

  if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
    return { isValid: false, error: 'Invalid calendar date provided.' };
  }

  if (sDate > eDate) {
    return { isValid: false, error: 'End date cannot be earlier than start date.' };
  }

  const diffTime = Math.abs(eDate - sDate);
  const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const sLabel = sDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const eLabel = eDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return {
    isValid: true,
    startDate,
    endDate,
    daysCount,
    label: `${sLabel} – ${eLabel}`,
    periodType: 'custom'
  };
}

/**
 * Computes difference and percentage change between current and previous period spending.
 * Safely handles zero denominators and zero spending.
 */
export function calculatePeriodComparison(currentTotal, previousTotal) {
  const current = Number(currentTotal) || 0;
  const previous = Number(previousTotal) || 0;
  const diff = parseFloat((current - previous).toFixed(2));

  if (previous === 0 && current === 0) {
    return {
      diff: 0,
      percentage: 0,
      direction: 'neutral',
      label: 'No change vs prior period'
    };
  }

  if (previous === 0 && current > 0) {
    return {
      diff,
      percentage: null,
      direction: 'increase',
      label: 'No prior spending (+100% new)'
    };
  }

  if (previous > 0 && current === 0) {
    return {
      diff,
      percentage: -100,
      direction: 'decrease',
      label: '-100% vs prior period'
    };
  }

  const pct = ((current - previous) / previous) * 100;
  const percentage = parseFloat(pct.toFixed(1));
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;

  return {
    diff,
    percentage: Math.abs(percentage),
    direction: isIncrease ? 'increase' : isDecrease ? 'decrease' : 'neutral',
    label: `${percentage > 0 ? '+' : ''}${percentage}% vs prior period`
  };
}

/**
 * Aggregates category distribution and percentage shares from a list of expenses.
 */
export function aggregateCategories(expenses, totalSpend) {
  const categoryMap = {};

  // Initialize with 0
  ALLOWED_CATEGORIES.forEach((cat) => {
    categoryMap[cat] = { amount: 0, count: 0 };
  });

  expenses.forEach((item) => {
    const amt = Number(item.amount) || 0;
    const cat = item.category || 'Other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { amount: 0, count: 0 };
    }
    categoryMap[cat].amount += amt;
    categoryMap[cat].count += 1;
  });

  const total = totalSpend > 0 ? totalSpend : Object.values(categoryMap).reduce((s, c) => s + c.amount, 0);

  const categories = Object.entries(categoryMap)
    .filter(([_, data]) => data.amount > 0)
    .map(([name, data]) => {
      const amount = parseFloat(data.amount.toFixed(2));
      const percentage = total > 0 ? parseFloat(((amount / total) * 100).toFixed(1)) : 0;
      return {
        name,
        value: amount,
        count: data.count,
        percentage,
        color: CATEGORY_COLORS[name] || '#64748B',
        avgPerTransaction: data.count > 0 ? parseFloat((amount / data.count).toFixed(2)) : 0
      };
    })
    .sort((a, b) => b.value - a.value);

  const topCategory = categories.length > 0 ? categories[0] : null;

  return {
    categories,
    topCategory
  };
}

/**
 * Sanitizes a field for CSV export to mitigate CSV formula injection.
 * Escapes characters =, +, -, @, Tab, Carriage Return.
 */
export function sanitizeCSVField(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Formula injection protection: if string starts with unsafe formula characters, prefix with single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If string contains comma, quote, or newline, escape inner quotes and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates an RFC-4180 compliant, injection-safe CSV file payload from expense records.
 */
export function generateExpensesCSV(expenses, periodLabel = 'Report') {
  const headers = ['Date', 'Category', 'Description', 'Payment Method', 'Amount (INR)'];
  const rows = [headers.join(',')];

  expenses.forEach((item) => {
    const row = [
      sanitizeCSVField(item.expense_date),
      sanitizeCSVField(item.category),
      sanitizeCSVField(item.description || ''),
      sanitizeCSVField(item.payment_method),
      sanitizeCSVField(Number(item.amount).toFixed(2))
    ];
    rows.push(row.join(','));
  });

  // Include UTF-8 BOM for accurate character encoding in Microsoft Excel
  return `\uFEFF${rows.join('\r\n')}`;
}

/**
 * Triggers a browser download of the generated CSV file.
 */
export function triggerCSVDownload(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
