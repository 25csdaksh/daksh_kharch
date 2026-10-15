/**
 * HisabSetu Smart Budget Manager Utilities
 * Handles validation, threshold calculation, month navigation,
 * category reconciliation, and financial analytics.
 */

import { ALLOWED_CATEGORIES, formatCurrencyINR } from './dateUtils.js';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns current local year and month (1-indexed, 1-12).
 */
export function getCurrentMonthYear() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };
}

/**
 * Computes previous month and year.
 */
export function getPrevMonthYear(year, month) {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Computes next month and year.
 */
export function getNextMonthYear(year, month) {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Returns date range boundaries YYYY-MM-DD for a specific month (1-12) and year.
 */
export function getMonthDateRange(year, month) {
  const safeYear = Number(year);
  const safeMonth = Number(month);
  
  if (isNaN(safeYear) || isNaN(safeMonth) || safeMonth < 1 || safeMonth > 12) {
    throw new Error(`Invalid month (${month}) or year (${year}) specified.`);
  }

  const mm = String(safeMonth).padStart(2, '0');
  const startDate = `${safeYear}-${mm}-01`;
  const lastDay = new Date(safeYear, safeMonth, 0).getDate();
  const endDate = `${safeYear}-${mm}-${String(lastDay).padStart(2, '0')}`;

  return {
    year: safeYear,
    month: safeMonth,
    monthName: MONTH_NAMES[safeMonth - 1],
    label: `${MONTH_NAMES[safeMonth - 1]} ${safeYear}`,
    startDate,
    endDate,
    daysInMonth: lastDay
  };
}

/**
 * Validates budget input payload.
 */
export function validateBudgetInput(payload) {
  const errors = {};

  // 1. Amount validation
  if (payload.amount === undefined || payload.amount === null || payload.amount === '') {
    errors.amount = 'Budget amount is required.';
  } else {
    const num = Number(payload.amount);
    if (isNaN(num) || !isFinite(num)) {
      errors.amount = 'Budget amount must be a valid number.';
    } else if (num <= 0) {
      errors.amount = 'Budget amount must be greater than zero.';
    } else if (num > 9999999999.99) {
      errors.amount = 'Budget amount exceeds maximum permitted limit.';
    }
  }

  // 2. Month validation (1 - 12)
  if (payload.month === undefined || payload.month === null || payload.month === '') {
    errors.month = 'Month is required.';
  } else {
    const m = Number(payload.month);
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      errors.month = 'Month must be an integer between 1 and 12.';
    }
  }

  // 3. Year validation (2000 - 2100)
  if (payload.year === undefined || payload.year === null || payload.year === '') {
    errors.year = 'Year is required.';
  } else {
    const y = Number(payload.year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      errors.year = 'Year must be a 4-digit year between 2000 and 2100.';
    }
  }

  // 4. Category validation (Optional: null / empty means Total Monthly Budget)
  const category = payload.category ? String(payload.category).trim() : null;
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    errors.category = `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized: {
      amount: payload.amount ? parseFloat(Number(payload.amount).toFixed(2)) : 0,
      month: Number(payload.month),
      year: Number(payload.year),
      category: category || null
    }
  };
}

/**
 * Computes threshold and alert indicators for a budget and actual spending.
 * Thresholds:
 * - >= 100%: Over-budget (danger)
 * - >= 80% & < 100%: Warning (warning)
 * - < 80%: Healthy (success)
 */
export function calculateBudgetMetrics(budgetAmount, actualSpent) {
  const budget = Number(budgetAmount) || 0;
  const spent = Number(actualSpent) || 0;

  const remaining = budget - spent;
  const isOverBudget = spent > budget && budget > 0;
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const roundedPercentage = Math.round(percentage);

  let status = 'healthy';
  let badgeText = 'On Track';

  if (budget <= 0) {
    status = spent > 0 ? 'unbudgeted' : 'empty';
    badgeText = spent > 0 ? 'No Budget Set' : 'No Spending';
  } else if (percentage >= 100) {
    status = 'danger';
    badgeText = 'Over Budget';
  } else if (percentage >= 80) {
    status = 'warning';
    badgeText = '80% Warning';
  }

  return {
    budget,
    spent,
    remaining,
    isOverBudget,
    isNearLimit: percentage >= 80 && percentage < 100,
    percentage: Number(percentage.toFixed(1)),
    roundedPercentage,
    status,
    badgeText
  };
}

/**
 * Reconciles user budgets and real expense transactions for a given month and year.
 * Guarantee:
 * - Category spending totals reconcile 100% with total monthly spending.
 * - Categories with no spending are cleanly handled.
 * - Categories with spending but no budget are cleanly handled.
 * - Deterministic alerts generated for >= 80% and >= 100%.
 */
export function reconcileMonthlyBudget(budgets = [], expenses = [], year, month) {
  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  // 1. Identify Total Monthly Budget (where category IS NULL)
  const totalBudgetRecord = safeBudgets.find(
    (b) => Number(b.month) === Number(month) &&
           Number(b.year) === Number(year) &&
           (b.category === null || b.category === undefined || b.category === '')
  );

  const explicitTotalBudget = totalBudgetRecord ? Number(totalBudgetRecord.amount) : 0;

  // 2. Map category-specific budgets
  const categoryBudgetMap = {};
  safeBudgets.forEach((b) => {
    if (
      Number(b.month) === Number(month) &&
      Number(b.year) === Number(year) &&
      b.category
    ) {
      categoryBudgetMap[b.category] = {
        id: b.id,
        amount: Number(b.amount),
        createdAt: b.created_at,
        updatedAt: b.updated_at
      };
    }
  });

  // 3. Aggregate actual expenses by category
  let totalActualSpent = 0;
  const categorySpentMap = {};
  const categoryCountMap = {};

  // Initialize allowed categories with 0
  ALLOWED_CATEGORIES.forEach((cat) => {
    categorySpentMap[cat] = 0;
    categoryCountMap[cat] = 0;
  });

  safeExpenses.forEach((exp) => {
    const amount = Number(exp.amount) || 0;
    const cat = exp.category || 'Other';
    totalActualSpent += amount;

    if (categorySpentMap[cat] !== undefined) {
      categorySpentMap[cat] += amount;
      categoryCountMap[cat] += 1;
    } else {
      categorySpentMap[cat] = (categorySpentMap[cat] || 0) + amount;
      categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1;
    }
  });

  totalActualSpent = parseFloat(totalActualSpent.toFixed(2));

  // 4. Calculate overall monthly metrics
  // If an explicit total budget exists, use it. If not, fallback to sum of category budgets if any exist.
  const sumCategoryBudgets = Object.values(categoryBudgetMap).reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const effectiveTotalBudget = explicitTotalBudget > 0 ? explicitTotalBudget : sumCategoryBudgets;
  const hasTotalBudget = explicitTotalBudget > 0 || sumCategoryBudgets > 0;

  const overallMetrics = calculateBudgetMetrics(effectiveTotalBudget, totalActualSpent);

  // 5. Generate category-wise reconciliation items
  const categoryBreakdown = ALLOWED_CATEGORIES.map((category) => {
    const budgetConfig = categoryBudgetMap[category];
    const budgetAmount = budgetConfig ? budgetConfig.amount : 0;
    const spentAmount = parseFloat((categorySpentMap[category] || 0).toFixed(2));
    const txCount = categoryCountMap[category] || 0;
    const metrics = calculateBudgetMetrics(budgetAmount, spentAmount);

    return {
      category,
      budgetId: budgetConfig?.id || null,
      isBudgeted: Boolean(budgetConfig),
      budgetAmount,
      spentAmount,
      remainingAmount: metrics.remaining,
      percentage: metrics.percentage,
      roundedPercentage: metrics.roundedPercentage,
      isOverBudget: metrics.isOverBudget,
      isNearLimit: metrics.isNearLimit,
      status: metrics.status,
      badgeText: metrics.badgeText,
      transactionCount: txCount,
      hasSpending: spentAmount > 0
    };
  });

  // 6. Generate Alerts List
  const alerts = [];

  // Check overall monthly budget alert
  if (hasTotalBudget) {
    if (overallMetrics.isOverBudget) {
      alerts.push({
        id: 'alert-total-over',
        type: 'danger',
        scope: 'total',
        title: 'Monthly Budget Exceeded',
        message: `Total spending (${formatCurrencyINR(totalActualSpent)}) has exceeded your monthly target of ${formatCurrencyINR(effectiveTotalBudget)} by ${formatCurrencyINR(totalActualSpent - effectiveTotalBudget)}.`
      });
    } else if (overallMetrics.isNearLimit) {
      alerts.push({
        id: 'alert-total-warning',
        type: 'warning',
        scope: 'total',
        title: '80% Monthly Budget Warning',
        message: `You have consumed ${overallMetrics.roundedPercentage}% of your total monthly budget (${formatCurrencyINR(totalActualSpent)} of ${formatCurrencyINR(effectiveTotalBudget)}).`
      });
    }
  }

  // Check category alerts
  categoryBreakdown.forEach((item) => {
    if (item.isBudgeted) {
      if (item.isOverBudget) {
        alerts.push({
          id: `alert-${item.category}-over`,
          type: 'danger',
          scope: 'category',
          category: item.category,
          title: `${item.category} Budget Exceeded`,
          message: `${item.category} spending (${formatCurrencyINR(item.spentAmount)}) has exceeded its budget of ${formatCurrencyINR(item.budgetAmount)}.`
        });
      } else if (item.isNearLimit) {
        alerts.push({
          id: `alert-${item.category}-warning`,
          type: 'warning',
          scope: 'category',
          category: item.category,
          title: `${item.category} Approaching Limit`,
          message: `${item.category} is at ${item.roundedPercentage}% of budget (${formatCurrencyINR(item.spentAmount)} of ${formatCurrencyINR(item.budgetAmount)}).`
        });
      }
    }
  });

  // Categories with no spending yet
  const categoriesWithNoSpending = categoryBreakdown.filter(
    (item) => item.isBudgeted && item.spentAmount === 0
  );

  // Over-budget categories
  const overBudgetCategories = categoryBreakdown.filter((item) => item.isOverBudget);

  return {
    year: Number(year),
    month: Number(month),
    monthRange: getMonthDateRange(year, month),
    totalBudget: effectiveTotalBudget,
    explicitTotalBudget,
    sumCategoryBudgets,
    totalBudgetRecord,
    hasTotalBudget,
    totalActualSpent,
    overallMetrics,
    categoryBreakdown,
    categoriesWithNoSpending,
    overBudgetCategories,
    alerts,
    expenseCount: safeExpenses.length
  };
}
