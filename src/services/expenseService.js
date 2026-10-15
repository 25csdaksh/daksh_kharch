/**
 * PaisaTrack Expense Service
 * Interacts with Supabase PostgreSQL 'expenses' table with Row Level Security.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import {
  getTodayLocalDateString,
  getCurrentWeekRange,
  getCurrentMonthRange,
  validateExpenseInput,
  CATEGORY_COLORS
} from '../utils/dateUtils.js';
import {
  calculatePeriodComparison,
  aggregateCategories
} from '../utils/reportUtils.js';

function notifyExpenseChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('expense:changed'));
  }
}

/**
 * Retrieves a list of expenses with optional filtering, sorting, and pagination.
 */
export async function getExpenses({
  startDate,
  endDate,
  category,
  paymentMethod,
  searchQuery,
  limit = 100,
  offset = 0,
  sortBy = 'expense_date',
  order = 'desc'
} = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Please check your .env settings.');
  }

  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' });

  if (startDate) {
    query = query.gte('expense_date', startDate);
  }
  if (endDate) {
    query = query.lte('expense_date', endDate);
  }
  if (category && category !== 'All') {
    query = query.eq('category', category);
  }
  if (paymentMethod && paymentMethod !== 'All') {
    query = query.eq('payment_method', paymentMethod);
  }
  if (searchQuery && searchQuery.trim()) {
    query = query.ilike('description', `%${searchQuery.trim()}%`);
  }

  query = query
    .order(sortBy, { ascending: order === 'asc' })
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('Error fetching expenses from Supabase:', error.message);
    throw error;
  }

  return {
    expenses: data || [],
    totalCount: count || 0
  };
}

/**
 * Retrieves a single expense by ID.
 */
export async function getExpenseById(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching expense ${id}:`, error.message);
    throw error;
  }

  return data;
}

/**
 * Creates a new expense record in the database.
 */
export async function createExpense(expensePayload) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const validation = validateExpenseInput(expensePayload);
  if (!validation.isValid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    throw new Error(firstErrorMessage || 'Invalid expense data.');
  }

  const record = {
    amount: parseFloat(Number(expensePayload.amount).toFixed(2)),
    category: expensePayload.category,
    description: expensePayload.description?.trim() || null,
    expense_date: expensePayload.expense_date,
    payment_method: expensePayload.payment_method,
    ...(expensePayload.account_id !== undefined ? { account_id: expensePayload.account_id || null } : {})
  };

  const { data, error } = await supabase
    .from('expenses')
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error('Error creating expense in Supabase:', error.message);
    throw error;
  }

  notifyExpenseChange();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('account:changed'));
  }
  return data;
}

/**
 * Updates an existing expense record.
 */
export async function updateExpense(id, updates) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!id) throw new Error('Expense ID is required for updates.');

  const validation = validateExpenseInput(updates);
  if (!validation.isValid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    throw new Error(firstErrorMessage || 'Invalid expense data.');
  }

  const record = {
    amount: parseFloat(Number(updates.amount).toFixed(2)),
    category: updates.category,
    description: updates.description?.trim() || null,
    expense_date: updates.expense_date,
    payment_method: updates.payment_method,
    ...(updates.account_id !== undefined ? { account_id: updates.account_id || null } : {})
  };

  const { data, error } = await supabase
    .from('expenses')
    .update(record)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating expense ${id}:`, error.message);
    throw error;
  }

  notifyExpenseChange();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('account:changed'));
  }
  return data;
}

/**
 * Deletes an expense record.
 */
export async function deleteExpense(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!id) throw new Error('Expense ID is required.');

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting expense ${id}:`, error.message);
    throw error;
  }

  notifyExpenseChange();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('account:changed'));
  }
  return true;
}

/**
 * Computes live dashboard metrics for KPI cards, weekly spending chart,
 * category distribution, and recent activity list.
 */
export async function getDashboardMetrics() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const todayStr = getTodayLocalDateString();
  const weekRange = getCurrentWeekRange();
  const monthRange = getCurrentMonthRange();

  // Fetch all expenses for the current month and week
  const queryStartDate = weekRange.startDate < monthRange.startDate ? weekRange.startDate : monthRange.startDate;
  const queryEndDate = weekRange.endDate > monthRange.endDate ? weekRange.endDate : monthRange.endDate;

  const { data: monthAndWeekExpenses, error } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', queryStartDate)
    .lte('expense_date', queryEndDate)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error calculating dashboard metrics:', error.message);
    throw error;
  }

  const allRecords = monthAndWeekExpenses || [];

  // 1. Calculate Today's Total
  let spentToday = 0;
  let todayCount = 0;

  // 2. Calculate Current Week's Total & Daily Breakdown (Mon-Sun)
  let spentThisWeek = 0;
  const dailyWeekMap = {};
  weekRange.days.forEach((dayObj) => {
    dailyWeekMap[dayObj.dateString] = {
      day: dayObj.name,
      dateString: dayObj.dateString,
      amount: 0
    };
  });

  // 3. Calculate Current Month's Total & Category Breakdown
  let spentThisMonth = 0;
  let monthCount = 0;
  const categoryMap = {};

  allRecords.forEach((item) => {
    const amount = Number(item.amount) || 0;
    const dateStr = item.expense_date;

    // Check Today
    if (dateStr === todayStr) {
      spentToday += amount;
      todayCount += 1;
    }

    // Check This Week
    if (dateStr >= weekRange.startDate && dateStr <= weekRange.endDate) {
      spentThisWeek += amount;
      if (dailyWeekMap[dateStr]) {
        dailyWeekMap[dateStr].amount += amount;
      }
    }

    // Check This Month
    if (dateStr >= monthRange.startDate && dateStr <= monthRange.endDate) {
      spentThisMonth += amount;
      monthCount += 1;
      categoryMap[item.category] = (categoryMap[item.category] || 0) + amount;
    }
  });

  // Format weekly chart array
  const weeklySpendingData = weekRange.days.map((d) => ({
    day: d.name,
    date: d.dateString,
    amount: parseFloat(dailyWeekMap[d.dateString]?.amount.toFixed(2) || 0)
  }));

  // Format category breakdown array
  const categoryBreakdownData = Object.entries(categoryMap)
    .map(([name, val]) => ({
      name,
      value: parseFloat(val.toFixed(2)),
      percentage: spentThisMonth > 0 ? Math.round((val / spentThisMonth) * 100) : 0,
      color: CATEGORY_COLORS[name] || '#64748B'
    }))
    .sort((a, b) => b.value - a.value);

  // Fetch top 5 recent expenses globally for the user
  const { data: recent5, error: recentError } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentError) {
    console.error('Error fetching recent transactions:', recentError.message);
  }

  return {
    today: {
      amount: parseFloat(spentToday.toFixed(2)),
      count: todayCount,
      dateString: todayStr
    },
    week: {
      amount: parseFloat(spentThisWeek.toFixed(2)),
      startDate: weekRange.startDate,
      endDate: weekRange.endDate,
      chartData: weeklySpendingData
    },
    month: {
      amount: parseFloat(spentThisMonth.toFixed(2)),
      count: monthCount,
      monthName: monthRange.monthName,
      year: monthRange.year,
      startDate: monthRange.startDate,
      endDate: monthRange.endDate,
      categories: categoryBreakdownData
    },
    recentExpenses: recent5 || []
  };
}

/**
 * Computes deep report analytics for a specified reporting period.
 * Supports Weekly, Monthly, Yearly, and Custom intervals with comparative delta.
 */
export async function getReportAnalytics({
  periodType,
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
  days = [],
  months = [],
  daysCount = 1
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  // 1. Fetch current period expenses
  const { data: currentRecords, error: currentError } = await supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (currentError) {
    console.error('Error fetching report expenses:', currentError.message);
    throw currentError;
  }

  const currentExpenses = currentRecords || [];

  // 2. Fetch previous period expenses for comparison if applicable
  let previousTotal = 0;
  let previousCount = 0;

  if (prevStartDate && prevEndDate) {
    const { data: prevRecords, error: prevError } = await supabase
      .from('expenses')
      .select('amount')
      .gte('expense_date', prevStartDate)
      .lte('expense_date', prevEndDate);

    if (!prevError && prevRecords) {
      previousTotal = prevRecords.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      previousCount = prevRecords.length;
    }
  }

  // 3. Compute Current Totals
  const totalExpenditure = currentExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalSafeExpenditure = parseFloat(totalExpenditure.toFixed(2));
  const transactionCount = currentExpenses.length;

  // 4. Comparison Analysis
  const comparison = calculatePeriodComparison(totalSafeExpenditure, previousTotal);

  // 5. Timeline Chart & High-Metric Calculations based on periodType
  let timelineChartData = [];
  let highestMetric = { label: 'None', amount: 0, subtext: '' };
  let averageSpending = 0;

  if (periodType === 'weekly') {
    // Map each of the 7 days (Mon-Sun)
    const dayMap = {};
    days.forEach((d) => {
      dayMap[d.dateString] = {
        name: d.name,
        date: d.dateString,
        amount: 0,
        count: 0
      };
    });

    currentExpenses.forEach((item) => {
      if (dayMap[item.expense_date]) {
        dayMap[item.expense_date].amount += Number(item.amount) || 0;
        dayMap[item.expense_date].count += 1;
      }
    });

    timelineChartData = days.map((d) => ({
      name: d.name,
      fullDate: d.dateString,
      amount: parseFloat((dayMap[d.dateString]?.amount || 0).toFixed(2)),
      count: dayMap[d.dateString]?.count || 0
    }));

    averageSpending = parseFloat((totalSafeExpenditure / 7).toFixed(2));

    // Find highest spending day
    let maxDay = null;
    timelineChartData.forEach((d) => {
      if (!maxDay || d.amount > maxDay.amount) {
        maxDay = d;
      }
    });

    if (maxDay && maxDay.amount > 0) {
      highestMetric = {
        label: `${maxDay.name}`,
        amount: maxDay.amount,
        subtext: `Highest spending day (${maxDay.fullDate})`
      };
    } else {
      highestMetric = { label: 'None', amount: 0, subtext: 'No spending this week' };
    }
  } else if (periodType === 'monthly') {
    // Map each day of the month (1 to N)
    const dayMap = {};
    days.forEach((d) => {
      dayMap[d.dateString] = {
        name: `${d.dayNumber}`,
        fullDate: d.dateString,
        amount: 0,
        count: 0
      };
    });

    currentExpenses.forEach((item) => {
      if (dayMap[item.expense_date]) {
        dayMap[item.expense_date].amount += Number(item.amount) || 0;
        dayMap[item.expense_date].count += 1;
      }
    });

    timelineChartData = days.map((d) => ({
      name: `${d.dayNumber}`,
      fullDate: d.dateString,
      amount: parseFloat((dayMap[d.dateString]?.amount || 0).toFixed(2)),
      count: dayMap[d.dateString]?.count || 0
    }));

    const safeDaysCount = daysCount > 0 ? daysCount : days.length || 30;
    averageSpending = parseFloat((totalSafeExpenditure / safeDaysCount).toFixed(2));

    let maxDay = null;
    timelineChartData.forEach((d) => {
      if (!maxDay || d.amount > maxDay.amount) {
        maxDay = d;
      }
    });

    if (maxDay && maxDay.amount > 0) {
      highestMetric = {
        label: `Day ${maxDay.name}`,
        amount: maxDay.amount,
        subtext: `Peak daily spend on ${maxDay.fullDate}`
      };
    } else {
      highestMetric = { label: 'None', amount: 0, subtext: 'No spending this month' };
    }
  } else if (periodType === 'yearly') {
    // Map each of the 12 months (Jan-Dec)
    const monthMap = {};
    months.forEach((m) => {
      monthMap[m.monthIndex] = {
        name: m.name,
        amount: 0,
        count: 0
      };
    });

    currentExpenses.forEach((item) => {
      // Timezone-safe extraction from YYYY-MM-DD format
      const monthIdx = parseInt(item.expense_date.slice(5, 7), 10) - 1;
      if (monthMap[monthIdx]) {
        monthMap[monthIdx].amount += Number(item.amount) || 0;
        monthMap[monthIdx].count += 1;
      }
    });

    timelineChartData = months.map((m) => ({
      name: m.name,
      amount: parseFloat((monthMap[m.monthIndex]?.amount || 0).toFixed(2)),
      count: monthMap[m.monthIndex]?.count || 0
    }));

    averageSpending = parseFloat((totalSafeExpenditure / 12).toFixed(2));

    let maxMonth = null;
    timelineChartData.forEach((m) => {
      if (!maxMonth || m.amount > maxMonth.amount) {
        maxMonth = m;
      }
    });

    if (maxMonth && maxMonth.amount > 0) {
      highestMetric = {
        label: `${maxMonth.name}`,
        amount: maxMonth.amount,
        subtext: `Peak month of the year`
      };
    } else {
      highestMetric = { label: 'None', amount: 0, subtext: 'No spending this year' };
    }
  } else if (periodType === 'custom') {
    // Custom range: group by date or list
    const dateMap = {};
    currentExpenses.forEach((item) => {
      const d = item.expense_date;
      if (!dateMap[d]) {
        dateMap[d] = { name: d.slice(5), fullDate: d, amount: 0, count: 0 };
      }
      dateMap[d].amount += Number(item.amount) || 0;
      dateMap[d].count += 1;
    });

    timelineChartData = Object.values(dateMap).map((d) => ({
      name: d.name,
      fullDate: d.fullDate,
      amount: parseFloat(d.amount.toFixed(2)),
      count: d.count
    }));

    const safeDaysCount = daysCount > 0 ? daysCount : timelineChartData.length || 1;
    averageSpending = parseFloat((totalSafeExpenditure / safeDaysCount).toFixed(2));

    let maxEntry = null;
    timelineChartData.forEach((d) => {
      if (!maxEntry || d.amount > maxEntry.amount) {
        maxEntry = d;
      }
    });

    if (maxEntry && maxEntry.amount > 0) {
      highestMetric = {
        label: `${maxEntry.fullDate}`,
        amount: maxEntry.amount,
        subtext: `Peak day in custom range`
      };
    } else {
      highestMetric = { label: 'None', amount: 0, subtext: 'No spending in custom range' };
    }
  }

  // 6. Category Breakdown
  const categoryAnalytics = aggregateCategories(currentExpenses, totalSafeExpenditure);

  return {
    periodType,
    startDate,
    endDate,
    totalExpenditure: totalSafeExpenditure,
    transactionCount,
    previousTotal: parseFloat(previousTotal.toFixed(2)),
    previousCount,
    comparison,
    averageSpending,
    highestMetric,
    timelineChartData,
    categories: categoryAnalytics.categories,
    topCategory: categoryAnalytics.topCategory,
    expenses: currentExpenses
  };
}
