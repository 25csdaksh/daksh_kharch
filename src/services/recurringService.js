/**
 * HisabSetu Recurring Expense & Bill Reminders Service
 * Manages recurring schedules, individual occurrences, due-date dashboard metrics,
 * safe personal expense creation with strict idempotency, and cancellation.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { getTodayLocalDateString } from '../utils/dateUtils.js';
import {
  validateRecurringInput,
  calculateNextDueDate,
  getDueStatus
} from '../utils/recurringUtils.js';
import {
  scheduleBillNotification,
  cancelBillNotification
} from './notificationService.js';

function notifyRecurringChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('recurring:changed'));
  }
}

function notifyExpenseChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('expense:changed'));
  }
}

/**
 * Retrieves all recurring expense schedules for the authenticated user.
 */
export async function getRecurringExpenses() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Please check your .env settings.');
  }

  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .order('next_due_date', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recurring expenses:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Retrieves a single recurring expense schedule by ID.
 */
export async function getRecurringExpenseById(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching recurring expense ${id}:`, error.message);
    throw error;
  }

  return data;
}

/**
 * Creates a new recurring expense schedule and generates the initial due occurrence.
 */
export async function createRecurringExpense(payload) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const validation = validateRecurringInput(payload);
  if (!validation.isValid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    throw new Error(firstErrorMessage || 'Invalid recurring expense payload.');
  }

  const scheduleRecord = validation.sanitized;

  // 1. Insert master schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from('recurring_expenses')
    .insert([scheduleRecord])
    .select()
    .single();

  if (scheduleError) {
    console.error('Error creating recurring expense:', scheduleError.message);
    throw scheduleError;
  }

  // 2. Automatically generate the initial occurrence for the first due date
  const occurrenceRecord = {
    recurring_expense_id: schedule.id,
    scheduled_due_date: schedule.next_due_date,
    status: 'pending'
  };

  const { data: occurrence, error: occurrenceError } = await supabase
    .from('recurring_expense_occurrences')
    .insert([occurrenceRecord])
    .select()
    .single();

  if (occurrenceError) {
    console.warn('Failed to insert initial occurrence:', occurrenceError.message);
  } else {
    // Schedule notification in background if supported
    scheduleBillNotification({ schedule, occurrence }).catch((err) => {
      console.warn('Could not schedule local notification:', err);
    });
  }

  notifyRecurringChange();
  return { schedule, occurrence };
}

/**
 * Updates an existing recurring expense schedule.
 */
export async function updateRecurringExpense(id, updates) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!id) throw new Error('Recurring schedule ID is required for updates.');

  const validation = validateRecurringInput(updates);
  if (!validation.isValid) {
    const firstErrorMessage = Object.values(validation.errors)[0];
    throw new Error(firstErrorMessage || 'Invalid recurring expense updates.');
  }

  const record = validation.sanitized;

  const { data, error } = await supabase
    .from('recurring_expenses')
    .update(record)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating recurring expense ${id}:`, error.message);
    throw error;
  }

  notifyRecurringChange();
  return data;
}

/**
 * Pauses a recurring expense schedule.
 */
export async function pauseRecurringExpense(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('recurring_expenses')
    .update({ status: 'paused' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error pausing recurring expense ${id}:`, error.message);
    throw error;
  }

  cancelBillNotification(id).catch(console.warn);
  notifyRecurringChange();
  return data;
}

/**
 * Resumes an active recurring expense schedule.
 */
export async function resumeRecurringExpense(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('recurring_expenses')
    .update({ status: 'active' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error resuming recurring expense ${id}:`, error.message);
    throw error;
  }

  notifyRecurringChange();
  return data;
}

/**
 * Deletes a recurring expense schedule and all its occurrences.
 */
export async function deleteRecurringExpense(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!id) throw new Error('Recurring schedule ID is required.');

  const { error } = await supabase
    .from('recurring_expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting recurring expense ${id}:`, error.message);
    throw error;
  }

  cancelBillNotification(id).catch(console.warn);
  notifyRecurringChange();
  return true;
}

/**
 * Retrieves occurrences with optional status, schedule, or date filters.
 */
export async function getOccurrences({
  status,
  recurringExpenseId,
  limit = 100
} = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  let query = supabase
    .from('recurring_expense_occurrences')
    .select(`
      *,
      schedule:recurring_expenses (
        id,
        title,
        amount,
        category,
        payment_method,
        frequency,
        status,
        reminder_days_before
      )
    `)
    .order('scheduled_due_date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }
  if (recurringExpenseId) {
    query = query.eq('recurring_expense_id', recurringExpenseId);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching bill occurrences:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Computes Due-Date Dashboard Analytics & Classifications.
 * Gathers overdue bills, bills due today, bills due within 7 days,
 * bills due later, and recently paid occurrences.
 */
export async function getDueDashboardData() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const todayStr = getTodayLocalDateString();

  // 1. Fetch all recurring schedules
  const { data: schedules, error: schedError } = await supabase
    .from('recurring_expenses')
    .select('*')
    .order('next_due_date', { ascending: true });

  if (schedError) throw schedError;

  // 2. Fetch all occurrences (both pending and recently paid)
  const { data: occurrences, error: occError } = await supabase
    .from('recurring_expense_occurrences')
    .select(`
      *,
      schedule:recurring_expenses (
        id,
        title,
        amount,
        category,
        payment_method,
        frequency,
        status,
        reminder_days_before
      )
    `)
    .order('scheduled_due_date', { ascending: true });

  if (occError) throw occError;

  const allOccurrences = occurrences || [];
  const allSchedules = schedules || [];

  // Group pending occurrences by due status
  const overdueBills = [];
  const dueTodayBills = [];
  const upcoming7DaysBills = [];
  const dueLaterBills = [];
  const paidBills = [];

  let totalPendingAmount = 0;
  let overdueAmount = 0;
  let dueTodayAmount = 0;
  let upcoming7DaysAmount = 0;

  allOccurrences.forEach((occ) => {
    const amount = Number(occ.actual_paid_amount || occ.schedule?.amount) || 0;

    if (occ.status === 'paid') {
      paidBills.push(occ);
      return;
    }

    if (occ.status === 'pending') {
      totalPendingAmount += amount;
      const status = getDueStatus(occ.scheduled_due_date, todayStr);

      if (status === 'overdue') {
        overdueBills.push(occ);
        overdueAmount += amount;
      } else if (status === 'due-today') {
        dueTodayBills.push(occ);
        dueTodayAmount += amount;
      } else if (status === 'upcoming-7-days') {
        upcoming7DaysBills.push(occ);
        upcoming7DaysAmount += amount;
      } else {
        dueLaterBills.push(occ);
      }
    }
  });

  return {
    schedules: allSchedules,
    allOccurrences,
    overdueBills,
    dueTodayBills,
    upcoming7DaysBills,
    dueLaterBills,
    paidBills: paidBills.sort((a, b) => (b.actual_payment_date || '').localeCompare(a.actual_payment_date || '')),
    summary: {
      totalPendingCount: overdueBills.length + dueTodayBills.length + upcoming7DaysBills.length + dueLaterBills.length,
      totalPendingAmount: parseFloat(totalPendingAmount.toFixed(2)),
      overdueCount: overdueBills.length,
      overdueAmount: parseFloat(overdueAmount.toFixed(2)),
      dueTodayCount: dueTodayBills.length,
      dueTodayAmount: parseFloat(dueTodayAmount.toFixed(2)),
      upcoming7DaysCount: upcoming7DaysBills.length,
      upcoming7DaysAmount: parseFloat(upcoming7DaysAmount.toFixed(2)),
      paidCount: paidBills.length
    }
  };
}

/**
 * Idempotent Payment & Safe Personal Expense Linking Workflow.
 * 1. Checks if occurrence is already paid with a linked expense (idempotent retry).
 * 2. Creates the real personal expense in public.expenses.
 * 3. Updates occurrence with status = 'paid', linked_expense_id, actual_payment_date, actual_paid_amount.
 * 4. Advances the master schedule's next_due_date.
 * 5. Generates the NEXT scheduled occurrence (if not past end_date).
 * 6. Dispatches real-time update events.
 */
export async function markOccurrencePaid({
  occurrenceId,
  actualPaidAmount,
  actualPaymentDate,
  paymentMethod
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!occurrenceId) throw new Error('Occurrence ID is required.');

  // Step 1: Fetch occurrence and its parent schedule
  const { data: occurrence, error: occFetchError } = await supabase
    .from('recurring_expense_occurrences')
    .select(`
      *,
      schedule:recurring_expenses (*)
    `)
    .eq('id', occurrenceId)
    .single();

  if (occFetchError) {
    console.error('Error fetching occurrence:', occFetchError.message);
    throw occFetchError;
  }

  // Idempotency check: If already paid with an existing linked expense, return safely without creating duplicate
  if (occurrence.status === 'paid' && occurrence.linked_expense_id) {
    return {
      success: true,
      alreadyPaid: true,
      occurrenceId: occurrence.id,
      linkedExpenseId: occurrence.linked_expense_id
    };
  }

  const schedule = occurrence.schedule;
  if (!schedule) {
    throw new Error('Parent recurring schedule not found.');
  }

  const finalAmount = parseFloat(
    Number(actualPaidAmount || occurrence.actual_paid_amount || schedule.amount).toFixed(2)
  );
  const finalPaymentDate = actualPaymentDate || getTodayLocalDateString();
  const finalPaymentMethod = paymentMethod || schedule.payment_method || 'UPI';

  // Step 2: Create personal expense record in public.expenses
  const expensePayload = {
    amount: finalAmount,
    category: schedule.category,
    payment_method: finalPaymentMethod,
    expense_date: finalPaymentDate,
    description: `[Recurring Bill] ${schedule.title}`
  };

  const { data: createdExpense, error: expenseError } = await supabase
    .from('expenses')
    .insert([expensePayload])
    .select()
    .single();

  if (expenseError) {
    console.error('Failed to create personal expense record for recurring bill:', expenseError.message);
    throw new Error(`Failed to record personal expense: ${expenseError.message}`);
  }

  // Step 3: Update occurrence to 'paid' with link to created expense
  const { data: updatedOccurrence, error: updateOccError } = await supabase
    .from('recurring_expense_occurrences')
    .update({
      status: 'paid',
      actual_payment_date: finalPaymentDate,
      actual_paid_amount: finalAmount,
      linked_expense_id: createdExpense.id
    })
    .eq('id', occurrenceId)
    .select()
    .single();

  if (updateOccError) {
    console.error('Error updating occurrence after creating expense:', updateOccError.message);
    throw updateOccError;
  }

  // Step 4: Advance schedule's next_due_date & generate next occurrence
  try {
    const { nextDueDate } = calculateNextDueDate(
      schedule.next_due_date,
      schedule.frequency
    );

    // Check if nextDueDate is past end_date
    const isCompleted = schedule.end_date && nextDueDate > schedule.end_date;
    const newStatus = isCompleted ? 'completed' : schedule.status;

    await supabase
      .from('recurring_expenses')
      .update({
        next_due_date: nextDueDate,
        status: newStatus
      })
      .eq('id', schedule.id);

    // If not completed, generate next pending occurrence
    if (!isCompleted) {
      await supabase
        .from('recurring_expense_occurrences')
        .insert([
          {
            recurring_expense_id: schedule.id,
            scheduled_due_date: nextDueDate,
            status: 'pending'
          }
        ]);
    }
  } catch (advanceErr) {
    console.warn('Note: Could not advance next occurrence date:', advanceErr);
  }

  notifyRecurringChange();
  notifyExpenseChange();

  return {
    success: true,
    occurrence: updatedOccurrence,
    expense: createdExpense
  };
}

/**
 * Reverts a mistakenly paid occurrence back to pending.
 * Deletes or unlinks the created personal expense to maintain strict accounting integrity.
 */
export async function revertOccurrenceToPending(occurrenceId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!occurrenceId) throw new Error('Occurrence ID is required.');

  // Fetch occurrence
  const { data: occurrence, error: fetchError } = await supabase
    .from('recurring_expense_occurrences')
    .select('*')
    .eq('id', occurrenceId)
    .single();

  if (fetchError) throw fetchError;

  const linkedExpenseId = occurrence.linked_expense_id;

  // 1. Revert occurrence record
  const { data: updatedOccurrence, error: updateError } = await supabase
    .from('recurring_expense_occurrences')
    .update({
      status: 'pending',
      actual_payment_date: null,
      actual_paid_amount: null,
      linked_expense_id: null
    })
    .eq('id', occurrenceId)
    .select()
    .single();

  if (updateError) throw updateError;

  // 2. Safely delete the generated personal expense
  if (linkedExpenseId) {
    await supabase
      .from('expenses')
      .delete()
      .eq('id', linkedExpenseId);
  }

  notifyRecurringChange();
  notifyExpenseChange();

  return updatedOccurrence;
}
