/**
 * HisabSetu Budget Service
 * Interacts with Supabase PostgreSQL 'budgets' table with Row Level Security.
 * Provides CRUD operations, duplicate prevention, and real-time expense reconciliation.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import {
  validateBudgetInput,
  getMonthDateRange,
  reconcileMonthlyBudget
} from '../utils/budgetUtils.js';

function notifyBudgetChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('budget:changed'));
  }
}

/**
 * Retrieves all budgets for a given year and month.
 */
export async function getBudgets(year, month) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Please check your .env settings.');
  }

  let query = supabase
    .from('budgets')
    .select('*')
    .order('category', { ascending: true, nullsFirst: true });

  if (year !== undefined && year !== null) {
    query = query.eq('year', Number(year));
  }
  if (month !== undefined && month !== null) {
    query = query.eq('month', Number(month));
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching budgets from Supabase:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Retrieves a single budget record by ID.
 */
export async function getBudgetById(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching budget ${id}:`, error.message);
    throw error;
  }

  return data;
}

/**
 * Creates a new budget record with duplicate prevention and validation.
 */
export async function createBudget(budgetPayload) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const validation = validateBudgetInput(budgetPayload);
  if (!validation.isValid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    throw new Error(firstErrorMessage || 'Invalid budget payload.');
  }

  const { amount, month, year, category } = validation.sanitized;

  // Duplicate Check: Check if budget already exists for this user, year, month, and category
  let duplicateQuery = supabase
    .from('budgets')
    .select('id, amount')
    .eq('year', year)
    .eq('month', month);

  if (category) {
    duplicateQuery = duplicateQuery.eq('category', category);
  } else {
    duplicateQuery = duplicateQuery.is('category', null);
  }

  const { data: existingRecords, error: checkError } = await duplicateQuery;

  if (checkError) {
    console.error('Error checking duplicate budget:', checkError.message);
    throw checkError;
  }

  if (existingRecords && existingRecords.length > 0) {
    const targetLabel = category ? `category "${category}"` : 'total monthly spending';
    throw new Error(
      `A budget for ${targetLabel} already exists for this month. Please edit the existing budget instead of creating a duplicate.`
    );
  }

  const record = {
    amount,
    month,
    year,
    category
  };

  const { data, error } = await supabase
    .from('budgets')
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error('Error creating budget in Supabase:', error.message);
    throw error;
  }

  notifyBudgetChange();
  return data;
}

/**
 * Updates an existing budget record.
 */
export async function updateBudget(id, updates) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!id) throw new Error('Budget ID is required for updates.');

  const validation = validateBudgetInput(updates);
  if (!validation.isValid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    throw new Error(firstErrorMessage || 'Invalid budget update payload.');
  }

  const { amount, month, year, category } = validation.sanitized;

  // Duplicate check when changing month/year/category
  let duplicateQuery = supabase
    .from('budgets')
    .select('id')
    .eq('year', year)
    .eq('month', month)
    .neq('id', id);

  if (category) {
    duplicateQuery = duplicateQuery.eq('category', category);
  } else {
    duplicateQuery = duplicateQuery.is('category', null);
  }

  const { data: existingRecords, error: checkError } = await duplicateQuery;
  if (!checkError && existingRecords && existingRecords.length > 0) {
    const targetLabel = category ? `category "${category}"` : 'total monthly spending';
    throw new Error(
      `Another budget for ${targetLabel} already exists for ${month}/${year}.`
    );
  }

  const record = {
    amount,
    month,
    year,
    category
  };

  const { data, error } = await supabase
    .from('budgets')
    .update(record)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating budget ${id}:`, error.message);
    throw error;
  }

  notifyBudgetChange();
  return data;
}

/**
 * Deletes a budget record by ID.
 */
export async function deleteBudget(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!id) throw new Error('Budget ID is required.');

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting budget ${id}:`, error.message);
    throw error;
  }

  notifyBudgetChange();
  return true;
}

/**
 * Reconciles the authenticated user's actual expenses with budgets for a given year & month.
 * Guarantees zero hardcoded production figures, real user-isolated transactions,
 * and exact category-wise financial consistency.
 */
export async function getMonthlyBudgetOverview(year, month) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const dateRange = getMonthDateRange(year, month);

  // 1. Fetch budgets for this year and month
  const { data: budgetsData, error: budgetsError } = await supabase
    .from('budgets')
    .select('*')
    .eq('year', Number(year))
    .eq('month', Number(month));

  if (budgetsError) {
    console.error('Error fetching monthly budgets:', budgetsError.message);
    throw budgetsError;
  }

  // 2. Fetch authenticated user's real expenses for this month range
  const { data: expensesData, error: expensesError } = await supabase
    .from('expenses')
    .select('id, amount, category, expense_date, description')
    .gte('expense_date', dateRange.startDate)
    .lte('expense_date', dateRange.endDate);

  if (expensesError) {
    console.error('Error fetching monthly expenses for budget reconciliation:', expensesError.message);
    throw expensesError;
  }

  // 3. Compute accurate financial reconciliation model
  return reconcileMonthlyBudget(budgetsData || [], expensesData || [], year, month);
}
