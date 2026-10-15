/**
 * HisabSetu — Account, Wallet, Transfer & Income Service
 * Manages user accounts, multi-wallet balance computations, and inter-account transfers.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  calculateAccountBalance,
  calculateNetWorthSummary,
  validateAccountInput,
  validateTransferInput,
  validateIncomeInput,
  round2
} from '../utils/accountUtils';
import { getTodayLocalDateString } from '../utils/dateUtils';

export function notifyAccountChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('account:changed'));
    window.dispatchEvent(new CustomEvent('expense:changed'));
  }
}

/**
 * Retrieves all accounts for the authenticated user.
 */
export async function getAccounts({ includeArchived = false } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  let query = supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching accounts:', error.message);
    throw error;
  }

  return data || [];
}

/**
 * Retrieves a single account by ID.
 */
export async function getAccountById(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching account ${id}:`, error.message);
    throw error;
  }

  return data;
}

/**
 * Creates a new account.
 */
export async function createAccount(payload) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const validation = validateAccountInput(payload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || 'Invalid account data.');
  }

  const record = {
    name: payload.name.trim(),
    type: payload.type,
    opening_balance: parseFloat(Number(payload.opening_balance || 0).toFixed(2)),
    currency: payload.currency || 'INR',
    color: payload.color || '#10B981',
    icon: payload.icon || 'Wallet',
    notes: payload.notes?.trim() || null,
    is_archived: false
  };

  const { data, error } = await supabase
    .from('accounts')
    .insert([record])
    .select()
    .single();

  if (error) {
    console.error('Error creating account:', error.message);
    throw error;
  }

  notifyAccountChange();
  return data;
}

/**
 * Updates an existing account's details.
 */
export async function updateAccount(id, updates) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  if (!id) throw new Error('Account ID is required.');

  const validation = validateAccountInput(updates);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || 'Invalid account data.');
  }

  const record = {
    name: updates.name.trim(),
    type: updates.type,
    color: updates.color || '#10B981',
    icon: updates.icon || 'Wallet',
    notes: updates.notes?.trim() || null
  };

  // If opening_balance is explicitly updated:
  if (updates.opening_balance !== undefined && updates.opening_balance !== null) {
    record.opening_balance = parseFloat(Number(updates.opening_balance).toFixed(2));
  }

  const { data, error } = await supabase
    .from('accounts')
    .update(record)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating account ${id}:`, error.message);
    throw error;
  }

  notifyAccountChange();
  return data;
}

/**
 * Archives an account (hides from active pickers while preserving transactions and historical balances).
 */
export async function archiveAccount(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('accounts')
    .update({ is_archived: true })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error archiving account ${id}:`, error.message);
    throw error;
  }

  notifyAccountChange();
  return data;
}

/**
 * Restores an archived account.
 */
export async function unarchiveAccount(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('accounts')
    .update({ is_archived: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error unarchiving account ${id}:`, error.message);
    throw error;
  }

  notifyAccountChange();
  return data;
}

/**
 * Checks if an account is safe to permanently delete.
 * Returns { canDelete: boolean, reasons: string[] }
 */
export async function canDeleteAccount(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const reasons = [];

  // Check 1: Linked expenses
  const { count: expenseCount, error: expErr } = await supabase
    .from('expenses')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id);

  if (expErr) throw expErr;
  if (expenseCount && expenseCount > 0) {
    reasons.push(`${expenseCount} expense record(s) are linked to this account.`);
  }

  // Check 2: Linked incomes
  const { count: incomeCount, error: incErr } = await supabase
    .from('incomes')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id);

  if (incErr) throw incErr;
  if (incomeCount && incomeCount > 0) {
    reasons.push(`${incomeCount} income record(s) are linked to this account.`);
  }

  // Check 3: Transfers as source
  const { count: sourceCount, error: srcErr } = await supabase
    .from('transfers')
    .select('id', { count: 'exact', head: true })
    .eq('source_account_id', id);

  if (srcErr) throw srcErr;
  if (sourceCount && sourceCount > 0) {
    reasons.push(`${sourceCount} transfer(s) originated from this account.`);
  }

  // Check 4: Transfers as destination
  const { count: destCount, error: dstErr } = await supabase
    .from('transfers')
    .select('id', { count: 'exact', head: true })
    .eq('destination_account_id', id);

  if (dstErr) throw dstErr;
  if (destCount && destCount > 0) {
    reasons.push(`${destCount} transfer(s) deposited into this account.`);
  }

  return {
    canDelete: reasons.length === 0,
    reasons
  };
}

/**
 * Safely deletes an account only when no transactions exist.
 * Never silently destroys financial history.
 */
export async function deleteAccount(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const check = await canDeleteAccount(id);
  if (!check.canDelete) {
    throw new Error(
      `Cannot delete account: ${check.reasons.join(' ')} Please archive this account instead to preserve your transaction ledger.`
    );
  }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting account ${id}:`, error.message);
    throw error;
  }

  notifyAccountChange();
  return true;
}

/**
 * Computes live balances, asset breakdown, and net worth for all user accounts.
 */
export async function getAccountsSummary({ includeArchived = true } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  // 1. Fetch user accounts
  const accounts = await getAccounts({ includeArchived });

  if (accounts.length === 0) {
    return {
      accounts: [],
      summary: { totalLiquidAssets: 0, totalCreditLiabilities: 0, netWorth: 0 },
      unassignedExpensesTotal: 0
    };
  }

  // 2. Fetch all user transactions in parallel
  const [expensesRes, incomesRes, transfersRes] = await Promise.all([
    supabase.from('expenses').select('id, account_id, amount, expense_date, category, description'),
    supabase.from('incomes').select('id, account_id, amount, income_date, source, description'),
    supabase.from('transfers').select('id, source_account_id, destination_account_id, amount, transfer_date, note')
  ]);

  if (expensesRes.error) throw expensesRes.error;
  if (incomesRes.error) throw incomesRes.error;
  if (transfersRes.error) throw transfersRes.error;

  const allExpenses = expensesRes.data || [];
  const allIncomes = incomesRes.data || [];
  const allTransfers = transfersRes.data || [];

  // 3. Compute balances for each account
  const accountsWithBalances = accounts.map((account) => {
    const accExpenses = allExpenses.filter((e) => e.account_id === account.id);
    const accIncomes = allIncomes.filter((i) => i.account_id === account.id);
    const accTransfersOut = allTransfers.filter((t) => t.source_account_id === account.id);
    const accTransfersIn = allTransfers.filter((t) => t.destination_account_id === account.id);

    const computed = calculateAccountBalance({
      account,
      expenses: accExpenses,
      incomes: accIncomes,
      transfersOut: accTransfersOut,
      transfersIn: accTransfersIn
    });

    return {
      ...account,
      computed,
      transactionCount: accExpenses.length + accIncomes.length + accTransfersOut.length + accTransfersIn.length
    };
  });

  // Calculate unassigned expenses (historical records without account link)
  const unassignedExpenses = allExpenses.filter((e) => !e.account_id);
  const unassignedExpensesTotal = round2(
    unassignedExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
  );

  // 4. Calculate Net Worth summary across accounts
  const summary = calculateNetWorthSummary(accountsWithBalances);

  return {
    accounts: accountsWithBalances,
    summary,
    unassignedExpensesTotal,
    unassignedExpensesCount: unassignedExpenses.length
  };
}

/**
 * Creates an inter-account money transfer.
 */
export async function createTransfer({
  sourceAccountId,
  destinationAccountId,
  amount,
  transferDate,
  note
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const payload = {
    source_account_id: sourceAccountId,
    destination_account_id: destinationAccountId,
    amount: parseFloat(Number(amount).toFixed(2)),
    transfer_date: transferDate || getTodayLocalDateString(),
    note: note?.trim() || null
  };

  const validation = validateTransferInput(payload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || 'Invalid transfer data.');
  }

  // Idempotency check: prevent duplicate submissions within 5 seconds for same source/dest/amount/date
  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
  const { data: recentDuplicates } = await supabase
    .from('transfers')
    .select('id')
    .eq('source_account_id', payload.source_account_id)
    .eq('destination_account_id', payload.destination_account_id)
    .eq('amount', payload.amount)
    .eq('transfer_date', payload.transfer_date)
    .gte('created_at', fiveSecondsAgo);

  if (recentDuplicates && recentDuplicates.length > 0) {
    console.warn('Duplicate transfer request detected within 5 seconds, ignoring duplicate.');
    return recentDuplicates[0];
  }

  const { data, error } = await supabase
    .from('transfers')
    .insert([payload])
    .select(`
      *,
      source_account:accounts!transfers_source_account_id_fkey(id, name, type, color),
      destination_account:accounts!transfers_destination_account_id_fkey(id, name, type, color)
    `)
    .single();

  if (error) {
    console.error('Error creating transfer:', error.message);
    throw error;
  }

  notifyAccountChange();
  return data;
}

/**
 * Retrieves transfer history with populated account names.
 */
export async function getTransfers({ accountId = null, limit = 50, offset = 0 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  let query = supabase
    .from('transfers')
    .select(`
      *,
      source_account:accounts!transfers_source_account_id_fkey(id, name, type, color),
      destination_account:accounts!transfers_destination_account_id_fkey(id, name, type, color)
    `, { count: 'exact' })
    .order('transfer_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (accountId) {
    query = query.or(`source_account_id.eq.${accountId},destination_account_id.eq.${accountId}`);
  }

  if (limit) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('Error fetching transfers:', error.message);
    throw error;
  }

  return {
    transfers: data || [],
    totalCount: count || 0
  };
}

/**
 * Deletes a transfer record.
 */
export async function deleteTransfer(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('transfers')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting transfer ${id}:`, error.message);
    throw error;
  }

  notifyAccountChange();
  return true;
}

/**
 * Creates an income record (account inflow).
 */
export async function createIncome({
  accountId,
  amount,
  source,
  incomeDate,
  description
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const payload = {
    account_id: accountId || null,
    amount: parseFloat(Number(amount).toFixed(2)),
    source: source || 'Salary',
    income_date: incomeDate || getTodayLocalDateString(),
    description: description?.trim() || null
  };

  const validation = validateIncomeInput(payload);
  if (!validation.isValid) {
    const firstError = Object.values(validation.errors)[0];
    throw new Error(firstError || 'Invalid income data.');
  }

  const { data, error } = await supabase
    .from('incomes')
    .insert([payload])
    .select(`
      *,
      account:accounts(id, name, type, color)
    `)
    .single();

  if (error) {
    console.error('Error creating income:', error.message);
    throw error;
  }

  notifyAccountChange();
  return data;
}

/**
 * Retrieves incomes with optional account filter.
 */
export async function getIncomes({ accountId = null, limit = 50, offset = 0 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  let query = supabase
    .from('incomes')
    .select(`
      *,
      account:accounts(id, name, type, color)
    `, { count: 'exact' })
    .order('income_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (accountId) {
    query = query.eq('account_id', accountId);
  }

  if (limit) {
    query = query.range(offset, offset + limit - 1);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('Error fetching incomes:', error.message);
    throw error;
  }

  return {
    incomes: data || [],
    totalCount: count || 0
  };
}

/**
 * Deletes an income record.
 */
export async function deleteIncome(id) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting income ${id}:`, error.message);
    throw error;
  }

  notifyAccountChange();
  return true;
}

/**
 * Retrieves unified transaction history for a specific account.
 * Aggregates expenses, incomes, outgoing transfers, and incoming transfers.
 */
export async function getAccountTransactions(accountId, { limit = 100 } = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  if (!accountId) throw new Error('Account ID is required.');

  const [expensesRes, incomesRes, transfersOutRes, transfersInRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, amount, expense_date, category, description, created_at')
      .eq('account_id', accountId)
      .limit(limit),
    supabase
      .from('incomes')
      .select('id, amount, income_date, source, description, created_at')
      .eq('account_id', accountId)
      .limit(limit),
    supabase
      .from('transfers')
      .select(`
        id, amount, transfer_date, note, created_at,
        destination_account:accounts!transfers_destination_account_id_fkey(id, name, type, color)
      `)
      .eq('source_account_id', accountId)
      .limit(limit),
    supabase
      .from('transfers')
      .select(`
        id, amount, transfer_date, note, created_at,
        source_account:accounts!transfers_source_account_id_fkey(id, name, type, color)
      `)
      .eq('destination_account_id', accountId)
      .limit(limit)
  ]);

  if (expensesRes.error) throw expensesRes.error;
  if (incomesRes.error) throw incomesRes.error;
  if (transfersOutRes.error) throw transfersOutRes.error;
  if (transfersInRes.error) throw transfersInRes.error;

  const normalized = [];

  (expensesRes.data || []).forEach((e) => {
    normalized.push({
      id: e.id,
      type: 'expense',
      date: e.expense_date,
      amount: Number(e.amount),
      title: e.description || e.category,
      subtitle: `Expense • ${e.category}`,
      category: e.category,
      isDebit: true,
      rawCreatedAt: e.created_at
    });
  });

  (incomesRes.data || []).forEach((i) => {
    normalized.push({
      id: i.id,
      type: 'income',
      date: i.income_date,
      amount: Number(i.amount),
      title: i.description || i.source,
      subtitle: `Income Inflow • ${i.source}`,
      category: i.source,
      isDebit: false,
      rawCreatedAt: i.created_at
    });
  });

  (transfersOutRes.data || []).forEach((t) => {
    normalized.push({
      id: t.id,
      type: 'transfer_out',
      date: t.transfer_date,
      amount: Number(t.amount),
      title: `Transfer to ${t.destination_account?.name || 'Account'}`,
      subtitle: t.note ? `Note: ${t.note}` : 'Inter-account transfer',
      category: 'Transfer',
      isDebit: true,
      rawCreatedAt: t.created_at
    });
  });

  (transfersInRes.data || []).forEach((t) => {
    normalized.push({
      id: t.id,
      type: 'transfer_in',
      date: t.transfer_date,
      amount: Number(t.amount),
      title: `Transfer from ${t.source_account?.name || 'Account'}`,
      subtitle: t.note ? `Note: ${t.note}` : 'Inter-account transfer',
      category: 'Transfer',
      isDebit: false,
      rawCreatedAt: t.created_at
    });
  });

  // Sort descending by date, then created_at
  normalized.sort((a, b) => {
    if (b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    return new Date(b.rawCreatedAt).getTime() - new Date(a.rawCreatedAt).getTime();
  });

  return normalized.slice(0, limit);
}
