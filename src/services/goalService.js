/**
 * HisabSetu — Savings Goals & Progress Tracking Service
 * Handles CRUD operations, contributions, withdrawals, linked transfers, and goal analytics.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  calculateGoalProgress,
  computeGoalStatus,
  calculateGoalsSummary,
  validateGoalInput,
  validateGoalTransactionInput,
  round2
} from '../utils/goalUtils';
import { createTransfer, deleteTransfer } from './accountService';
import { getTodayLocalDateString } from '../utils/dateUtils';

// In-flight guard to prevent duplicate submissions from rapid multi-clicks or retries
const inFlightRequests = new Set();

export function notifyGoalChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('goal:changed'));
  }
}

/**
 * Retrieves all savings goals for the authenticated user.
 */
export async function getGoals({ includeArchived = false } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  let query = supabase
    .from('savings_goals')
    .select(`
      *,
      linked_account:accounts!savings_goals_linked_account_id_fkey(id, name, type, color, icon)
    `)
    .order('created_at', { ascending: false });

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching savings goals:', error.message);
    throw error;
  }

  return (data || []).map((goal) => {
    const progress = calculateGoalProgress(goal.current_amount, goal.target_amount);
    const dynamicStatus = computeGoalStatus(goal);
    return {
      ...goal,
      progress,
      computedStatus: dynamicStatus
    };
  });
}

/**
 * Retrieves a single savings goal by ID with populated linked account.
 */
export async function getGoalById(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .select(`
      *,
      linked_account:accounts!savings_goals_linked_account_id_fkey(id, name, type, color, icon)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching goal ${id}:`, error.message);
    throw error;
  }

  const progress = calculateGoalProgress(data.current_amount, data.target_amount);
  const dynamicStatus = computeGoalStatus(data);

  return {
    ...data,
    progress,
    computedStatus: dynamicStatus
  };
}

/**
 * Creates a new savings goal.
 * Supports optional initial amount and optional funding account linkage.
 */
export async function createGoal(payload) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const validation = validateGoalInput(payload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || 'Invalid goal data.');
  }

  const targetAmount = round2(payload.target_amount);
  const initialAmount = round2(payload.initial_amount || 0);

  let initialStatus = 'in_progress';
  if (initialAmount <= 0) {
    initialStatus = 'not_started';
  } else if (initialAmount >= targetAmount) {
    initialStatus = 'completed';
  }

  const record = {
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    category: payload.category || 'Custom',
    target_amount: targetAmount,
    current_amount: initialAmount,
    start_date: payload.start_date || getTodayLocalDateString(),
    target_date: payload.target_date || null,
    linked_account_id: payload.linked_account_id || null,
    color: payload.color || '#064E3B',
    icon: payload.icon || 'Target',
    monthly_target: payload.monthly_target ? round2(payload.monthly_target) : null,
    status: initialStatus,
    is_archived: false
  };

  const { data: newGoal, error: insertError } = await supabase
    .from('savings_goals')
    .insert([record])
    .select(`
      *,
      linked_account:accounts!savings_goals_linked_account_id_fkey(id, name, type, color, icon)
    `)
    .single();

  if (insertError) {
    console.error('Error creating savings goal:', insertError.message);
    throw insertError;
  }

  // If an initial deposit was specified, record it in goal_transactions
  if (initialAmount > 0) {
    let transferId = null;

    // If a funding account was selected and linked account is present and different:
    if (
      payload.funding_account_id &&
      payload.linked_account_id &&
      payload.funding_account_id !== payload.linked_account_id
    ) {
      try {
        const transfer = await createTransfer({
          sourceAccountId: payload.funding_account_id,
          destinationAccountId: payload.linked_account_id,
          amount: initialAmount,
          transferDate: record.start_date,
          note: `Initial contribution to goal: ${record.name}`
        });
        transferId = transfer?.id || null;
      } catch (tErr) {
        console.warn('Initial transfer creation failed, proceeding with virtual goal transaction:', tErr);
      }
    }

    const { error: txError } = await supabase
      .from('goal_transactions')
      .insert([{
        goal_id: newGoal.id,
        type: 'contribution',
        amount: initialAmount,
        transaction_date: record.start_date,
        note: payload.initial_note || 'Initial Goal Deposit',
        source_account_id: payload.funding_account_id || null,
        transfer_id: transferId
      }]);

    if (txError) {
      console.warn('Could not record initial transaction history:', txError.message);
    }
  }

  notifyGoalChange();
  return newGoal;
}

/**
 * Updates an existing savings goal.
 */
export async function updateGoal(id, payload) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const validation = validateGoalInput(payload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || 'Invalid goal data.');
  }

  // Fetch current goal to preserve/recalculate status
  const currentGoal = await getGoalById(id);
  const targetAmount = round2(payload.target_amount);
  const currentAmount = round2(currentGoal.current_amount);

  let newStatus = payload.status || currentGoal.status;
  if (newStatus !== 'paused') {
    if (currentAmount >= targetAmount) {
      newStatus = 'completed';
    } else if (currentAmount <= 0) {
      newStatus = 'not_started';
    } else if (payload.target_date && payload.target_date < getTodayLocalDateString()) {
      newStatus = 'overdue';
    } else {
      newStatus = 'in_progress';
    }
  }

  const updates = {
    name: payload.name.trim(),
    description: payload.description !== undefined ? (payload.description?.trim() || null) : currentGoal.description,
    category: payload.category || currentGoal.category,
    target_amount: targetAmount,
    start_date: payload.start_date || currentGoal.start_date,
    target_date: payload.target_date !== undefined ? payload.target_date : currentGoal.target_date,
    linked_account_id: payload.linked_account_id !== undefined ? payload.linked_account_id : currentGoal.linked_account_id,
    color: payload.color || currentGoal.color,
    icon: payload.icon || currentGoal.icon,
    monthly_target: payload.monthly_target !== undefined ? (payload.monthly_target ? round2(payload.monthly_target) : null) : currentGoal.monthly_target,
    status: newStatus
  };

  const { data, error } = await supabase
    .from('savings_goals')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      linked_account:accounts!savings_goals_linked_account_id_fkey(id, name, type, color, icon)
    `)
    .single();

  if (error) {
    console.error(`Error updating savings goal ${id}:`, error.message);
    throw error;
  }

  notifyGoalChange();
  return data;
}

/**
 * Toggles pause/resume state of a goal.
 */
export async function toggleGoalPause(id, shouldPause) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const goal = await getGoalById(id);
  let newStatus = 'in_progress';
  if (shouldPause) {
    newStatus = 'paused';
  } else {
    // Recalculate status upon unpausing
    newStatus = computeGoalStatus({ ...goal, status: 'in_progress' });
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .update({ status: newStatus })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error toggling pause for goal ${id}:`, error.message);
    throw error;
  }

  notifyGoalChange();
  return data;
}

/**
 * Archives or unarchives a goal.
 */
export async function archiveGoal(id, isArchived = true) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .update({ is_archived: isArchived })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error archiving goal ${id}:`, error.message);
    throw error;
  }

  notifyGoalChange();
  return data;
}

/**
 * Permanently deletes a goal and its transaction history.
 */
export async function deleteGoal(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('savings_goals')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting goal ${id}:`, error.message);
    throw error;
  }

  notifyGoalChange();
  return true;
}

/**
 * Adds a contribution to a goal.
 * Idempotent: guards against duplicate simultaneous submissions.
 * When funding account and linked account are selected, initiates an accounting transfer.
 */
export async function addGoalContribution(goalId, {
  amount,
  transaction_date = getTodayLocalDateString(),
  note = null,
  source_account_id = null
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const inFlightKey = `contrib:${goalId}:${amount}:${transaction_date}:${source_account_id}`;
  if (inFlightRequests.has(inFlightKey)) {
    throw new Error('Contribution request already in progress. Please wait.');
  }
  inFlightRequests.add(inFlightKey);

  try {
    const goal = await getGoalById(goalId);
    const numAmount = round2(amount);

    const validation = validateGoalTransactionInput({
      type: 'contribution',
      amount: numAmount,
      transaction_date,
      note
    });

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Invalid contribution.');
    }

    // Check recent duplicate within 5 seconds in database
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: recentDupes } = await supabase
      .from('goal_transactions')
      .select('id')
      .eq('goal_id', goalId)
      .eq('type', 'contribution')
      .eq('amount', numAmount)
      .eq('transaction_date', transaction_date)
      .gte('created_at', fiveSecondsAgo);

    if (recentDupes && recentDupes.length > 0) {
      console.warn('Duplicate contribution detected within 5 seconds, ignoring.');
      return recentDupes[0];
    }

    let transferId = null;

    // If source account is selected and goal has a linked account and they are distinct accounts:
    if (
      source_account_id &&
      goal.linked_account_id &&
      source_account_id !== goal.linked_account_id
    ) {
      const transfer = await createTransfer({
        sourceAccountId: source_account_id,
        destinationAccountId: goal.linked_account_id,
        amount: numAmount,
        transferDate: transaction_date,
        note: note ? `Goal: ${goal.name} — ${note}` : `Contribution to goal: ${goal.name}`
      });
      transferId = transfer?.id || null;
    }

    // Insert transaction
    const { data: tx, error: txError } = await supabase
      .from('goal_transactions')
      .insert([{
        goal_id: goalId,
        type: 'contribution',
        amount: numAmount,
        transaction_date,
        note: note?.trim() || null,
        source_account_id: source_account_id || null,
        transfer_id: transferId
      }])
      .select()
      .single();

    if (txError) {
      console.error('Error inserting goal transaction:', txError.message);
      // Rollback transfer if created
      if (transferId) {
        try { await deleteTransfer(transferId); } catch (_) {}
      }
      throw txError;
    }

    // Update goal current_amount and status
    const newCurrentAmount = round2(Number(goal.current_amount || 0) + numAmount);
    let newStatus = goal.status;
    if (newStatus !== 'paused') {
      if (newCurrentAmount >= Number(goal.target_amount)) {
        newStatus = 'completed';
      } else {
        newStatus = 'in_progress';
      }
    }

    const { error: updateGoalError } = await supabase
      .from('savings_goals')
      .update({
        current_amount: newCurrentAmount,
        status: newStatus
      })
      .eq('id', goalId);

    if (updateGoalError) {
      console.error('Error updating goal amount:', updateGoalError.message);
      throw updateGoalError;
    }

    notifyGoalChange();
    return tx;
  } finally {
    inFlightRequests.delete(inFlightKey);
  }
}

/**
 * Records a withdrawal from a goal.
 * Validates that withdrawal amount cannot exceed current saved balance.
 */
export async function recordGoalWithdrawal(goalId, {
  amount,
  transaction_date = getTodayLocalDateString(),
  note = null,
  destination_account_id = null
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const inFlightKey = `withdraw:${goalId}:${amount}:${transaction_date}:${destination_account_id}`;
  if (inFlightRequests.has(inFlightKey)) {
    throw new Error('Withdrawal request already in progress. Please wait.');
  }
  inFlightRequests.add(inFlightKey);

  try {
    const goal = await getGoalById(goalId);
    const numAmount = round2(amount);

    const validation = validateGoalTransactionInput(
      {
        type: 'withdrawal',
        amount: numAmount,
        transaction_date,
        note
      },
      goal.current_amount
    );

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Invalid withdrawal.');
    }

    let transferId = null;

    // If destination account is selected and goal has a linked account and they are distinct:
    if (
      destination_account_id &&
      goal.linked_account_id &&
      destination_account_id !== goal.linked_account_id
    ) {
      const transfer = await createTransfer({
        sourceAccountId: goal.linked_account_id,
        destinationAccountId: destination_account_id,
        amount: numAmount,
        transferDate: transaction_date,
        note: note ? `Goal withdrawal: ${goal.name} — ${note}` : `Withdrawal from goal: ${goal.name}`
      });
      transferId = transfer?.id || null;
    }

    // Insert transaction
    const { data: tx, error: txError } = await supabase
      .from('goal_transactions')
      .insert([{
        goal_id: goalId,
        type: 'withdrawal',
        amount: numAmount,
        transaction_date,
        note: note?.trim() || null,
        source_account_id: destination_account_id || null,
        transfer_id: transferId
      }])
      .select()
      .single();

    if (txError) {
      console.error('Error recording goal withdrawal:', txError.message);
      if (transferId) {
        try { await deleteTransfer(transferId); } catch (_) {}
      }
      throw txError;
    }

    // Update goal current_amount
    const newCurrentAmount = round2(Math.max(0, Number(goal.current_amount || 0) - numAmount));
    let newStatus = goal.status;
    if (newStatus !== 'paused') {
      if (newCurrentAmount >= Number(goal.target_amount)) {
        newStatus = 'completed';
      } else if (newCurrentAmount <= 0) {
        newStatus = 'not_started';
      } else if (goal.target_date && goal.target_date < getTodayLocalDateString()) {
        newStatus = 'overdue';
      } else {
        newStatus = 'in_progress';
      }
    }

    const { error: updateGoalError } = await supabase
      .from('savings_goals')
      .update({
        current_amount: newCurrentAmount,
        status: newStatus
      })
      .eq('id', goalId);

    if (updateGoalError) {
      console.error('Error updating goal amount after withdrawal:', updateGoalError.message);
      throw updateGoalError;
    }

    notifyGoalChange();
    return tx;
  } finally {
    inFlightRequests.delete(inFlightKey);
  }
}

/**
 * Reverts or deletes a goal transaction safely.
 * If transaction was linked to an inter-account transfer, deletes the transfer.
 */
export async function deleteGoalTransaction(transactionId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  // 1. Fetch transaction
  const { data: tx, error: fetchErr } = await supabase
    .from('goal_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (fetchErr || !tx) {
    throw new Error('Transaction record not found.');
  }

  // 2. Fetch goal
  const goal = await getGoalById(tx.goal_id);
  const txAmount = Number(tx.amount || 0);

  let newCurrentAmount = Number(goal.current_amount || 0);
  if (tx.type === 'contribution') {
    newCurrentAmount = Math.max(0, newCurrentAmount - txAmount);
  } else if (tx.type === 'withdrawal') {
    newCurrentAmount += txAmount;
  }
  newCurrentAmount = round2(newCurrentAmount);

  // 3. Delete linked transfer if existing
  if (tx.transfer_id) {
    try {
      await deleteTransfer(tx.transfer_id);
    } catch (tErr) {
      console.warn('Could not delete linked transfer:', tErr.message);
    }
  }

  // 4. Delete goal transaction
  const { error: delErr } = await supabase
    .from('goal_transactions')
    .delete()
    .eq('id', transactionId);

  if (delErr) {
    console.error(`Error deleting transaction ${transactionId}:`, delErr.message);
    throw delErr;
  }

  // 5. Update goal
  let newStatus = goal.status;
  if (newStatus !== 'paused') {
    if (newCurrentAmount >= Number(goal.target_amount)) {
      newStatus = 'completed';
    } else if (newCurrentAmount <= 0) {
      newStatus = 'not_started';
    } else if (goal.target_date && goal.target_date < getTodayLocalDateString()) {
      newStatus = 'overdue';
    } else {
      newStatus = 'in_progress';
    }
  }

  await supabase
    .from('savings_goals')
    .update({
      current_amount: newCurrentAmount,
      status: newStatus
    })
    .eq('id', goal.id);

  notifyGoalChange();
  return true;
}

/**
 * Retrieves full details of a goal, including transaction history and monthly progress data.
 */
export async function getGoalDetailsWithTransactions(goalId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const [goal, { data: transactions, error: txError }] = await Promise.all([
    getGoalById(goalId),
    supabase
      .from('goal_transactions')
      .select(`
        *,
        source_account:accounts!goal_transactions_source_account_id_fkey(id, name, type, color, icon)
      `)
      .eq('goal_id', goalId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
  ]);

  if (txError) {
    console.error(`Error fetching transactions for goal ${goalId}:`, txError.message);
    throw txError;
  }

  const txList = transactions || [];

  // Calculate monthly contributions aggregation for chart
  const monthlyMap = {};
  let totalContributions = 0;
  let contributionCount = 0;

  for (const t of txList) {
    if (t.type === 'contribution') {
      const monthKey = t.transaction_date.slice(0, 7); // YYYY-MM
      const amt = Number(t.amount || 0);
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amt;
      totalContributions += amt;
      contributionCount += 1;
    }
  }

  const monthsWithContributions = Object.keys(monthlyMap).length;
  const averageMonthlyContribution = monthsWithContributions > 0
    ? round2(totalContributions / monthsWithContributions)
    : 0;

  // Monthly progress chart data (sorted chronological)
  const monthlyChartData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, amount]) => {
      const [y, m] = monthKey.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      const label = dateObj.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      return {
        monthKey,
        label,
        amount: round2(amount)
      };
    });

  // Calculate realistic completion estimate if sufficient data (at least 2 months or 2 contributions)
  let completionEstimate = null;
  const remaining = goal.progress.remainingAmount;

  if (goal.progress.isCompleted) {
    completionEstimate = {
      isAvailable: true,
      text: 'Goal already completed!',
      estimatedDate: null
    };
  } else if (monthsWithContributions >= 2 && averageMonthlyContribution > 0 && remaining > 0) {
    const estimatedMonthsNeeded = Math.ceil(remaining / averageMonthlyContribution);
    const estDate = new Date();
    estDate.setMonth(estDate.getMonth() + estimatedMonthsNeeded);
    completionEstimate = {
      isAvailable: true,
      estimatedMonthsNeeded,
      averageMonthlyContribution,
      estimatedDate: estDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      text: `Based on your avg savings of ${round2(averageMonthlyContribution)}/month, estimated completion by ${estDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} (${estimatedMonthsNeeded} month${estimatedMonthsNeeded > 1 ? 's' : ''}).`
    };
  } else {
    completionEstimate = {
      isAvailable: false,
      text: 'Estimate unavailable. Needs at least 2 months of contribution history to project completion date reliably.'
    };
  }

  return {
    goal,
    transactions: txList,
    monthlyChartData,
    averageMonthlyContribution,
    completionEstimate
  };
}

/**
 * Retrieves dashboard summary of active and completed goals.
 */
export async function getGoalsDashboardSummary() {
  if (!isSupabaseConfigured || !supabase) {
    return {
      totalActiveGoals: 0,
      totalTargetAmount: 0,
      totalContributedAmount: 0,
      totalRemainingAmount: 0,
      overallProgress: 0,
      completedGoalsCount: 0,
      approachingGoalsCount: 0
    };
  }

  try {
    const goals = await getGoals({ includeArchived: false });
    return calculateGoalsSummary(goals);
  } catch (err) {
    console.error('Error getting goals summary:', err);
    return {
      totalActiveGoals: 0,
      totalTargetAmount: 0,
      totalContributedAmount: 0,
      totalRemainingAmount: 0,
      overallProgress: 0,
      completedGoalsCount: 0,
      approachingGoalsCount: 0
    };
  }
}
