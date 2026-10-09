/**
 * PaisaTrack Expense Service
 * Interacts with Supabase PostgreSQL 'expenses' table with Row Level Security.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  getTodayLocalDateString,
  getCurrentWeekRange,
  getCurrentMonthRange,
  validateExpenseInput,
  CATEGORY_COLORS
} from '../utils/dateUtils';

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
    payment_method: expensePayload.payment_method
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
    payment_method: updates.payment_method
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

  // Fetch all expenses for the current month (which covers today, this week, and the month)
  // Also fetch any week expenses that might cross month boundaries if the week started in previous month
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
      color: CATEGORY_COLORS[name] || '#727B73'
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
