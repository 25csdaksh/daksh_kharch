/**
 * HisabSetu — Advanced Search & Smart Filter Service
 * Executes unified multi-entity transaction search across Expenses, Incomes, and Transfers.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getDateRangeFromPreset } from '../utils/filterUtils';

/**
 * Searches and filters financial transactions with unified schema normalization.
 */
export async function searchTransactions({
  query = '',
  datePreset = 'all',
  startDate = null,
  endDate = null,
  type = 'all', // 'all' | 'expense' | 'income' | 'transfer'
  category = 'all',
  accountId = null,
  paymentMethod = 'all',
  minAmount = null,
  maxAmount = null,
  isRecurring = false,
  isSplit = false,
  limit = 50,
  offset = 0
} = {}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  // 1. Calculate active date range
  const range = getDateRangeFromPreset(datePreset, startDate, endDate);
  const activeStart = range.startDate;
  const activeEnd = range.endDate;

  const promises = [];

  // Query 1: Expenses
  if (type === 'all' || type === 'expense') {
    let q = supabase
      .from('expenses')
      .select(`
        id, amount, category, description, expense_date, payment_method, account_id, created_at,
        account:accounts(id, name, type, color)
      `, { count: 'exact' });

    if (activeStart) q = q.gte('expense_date', activeStart);
    if (activeEnd) q = q.lte('expense_date', activeEnd);
    if (category && category !== 'all') q = q.eq('category', category);
    if (paymentMethod && paymentMethod !== 'all') q = q.eq('payment_method', paymentMethod);
    if (accountId) q = q.eq('account_id', accountId);
    if (minAmount !== null && minAmount !== undefined && minAmount !== '') {
      q = q.gte('amount', Number(minAmount));
    }
    if (maxAmount !== null && maxAmount !== undefined && maxAmount !== '') {
      q = q.lte('amount', Number(maxAmount));
    }
    if (isRecurring) {
      q = q.ilike('description', '%[Recurring Bill]%');
    }
    if (isSplit) {
      q = q.ilike('description', '%[Split%');
    }
    if (query && query.trim()) {
      q = q.ilike('description', `%${query.trim()}%`);
    }

    q = q.order('expense_date', { ascending: false }).order('created_at', { ascending: false });
    promises.push(
      q.then(({ data, count, error }) => {
        if (error) throw error;
        return {
          type: 'expense',
          items: data || [],
          count: count || 0
        };
      })
    );
  } else {
    promises.push(Promise.resolve({ type: 'expense', items: [], count: 0 }));
  }

  // Query 2: Incomes
  if ((type === 'all' || type === 'income') && !isRecurring && !isSplit && (paymentMethod === 'all')) {
    let q = supabase
      .from('incomes')
      .select(`
        id, amount, source, description, income_date, account_id, created_at,
        account:accounts(id, name, type, color)
      `, { count: 'exact' });

    if (activeStart) q = q.gte('income_date', activeStart);
    if (activeEnd) q = q.lte('income_date', activeEnd);
    if (category && category !== 'all') q = q.eq('source', category);
    if (accountId) q = q.eq('account_id', accountId);
    if (minAmount !== null && minAmount !== undefined && minAmount !== '') {
      q = q.gte('amount', Number(minAmount));
    }
    if (maxAmount !== null && maxAmount !== undefined && maxAmount !== '') {
      q = q.lte('amount', Number(maxAmount));
    }
    if (query && query.trim()) {
      q = q.ilike('description', `%${query.trim()}%`);
    }

    q = q.order('income_date', { ascending: false }).order('created_at', { ascending: false });
    promises.push(
      q.then(({ data, count, error }) => {
        if (error) throw error;
        return {
          type: 'income',
          items: data || [],
          count: count || 0
        };
      })
    );
  } else {
    promises.push(Promise.resolve({ type: 'income', items: [], count: 0 }));
  }

  // Query 3: Transfers
  if ((type === 'all' || type === 'transfer') && !isRecurring && !isSplit && (category === 'all') && (paymentMethod === 'all')) {
    let q = supabase
      .from('transfers')
      .select(`
        id, amount, transfer_date, note, source_account_id, destination_account_id, created_at,
        source_account:accounts!transfers_source_account_id_fkey(id, name, type, color),
        destination_account:accounts!transfers_destination_account_id_fkey(id, name, type, color)
      `, { count: 'exact' });

    if (activeStart) q = q.gte('transfer_date', activeStart);
    if (activeEnd) q = q.lte('transfer_date', activeEnd);
    if (accountId) {
      q = q.or(`source_account_id.eq.${accountId},destination_account_id.eq.${accountId}`);
    }
    if (minAmount !== null && minAmount !== undefined && minAmount !== '') {
      q = q.gte('amount', Number(minAmount));
    }
    if (maxAmount !== null && maxAmount !== undefined && maxAmount !== '') {
      q = q.lte('amount', Number(maxAmount));
    }
    if (query && query.trim()) {
      q = q.ilike('note', `%${query.trim()}%`);
    }

    q = q.order('transfer_date', { ascending: false }).order('created_at', { ascending: false });
    promises.push(
      q.then(({ data, count, error }) => {
        if (error) throw error;
        return {
          type: 'transfer',
          items: data || [],
          count: count || 0
        };
      })
    );
  } else {
    promises.push(Promise.resolve({ type: 'transfer', items: [], count: 0 }));
  }

  const [expensesRes, incomesRes, transfersRes] = await Promise.all(promises);

  // Normalize into standard unified transactions
  const unified = [];
  let totalExpenses = 0;
  let totalIncomes = 0;
  let totalTransfers = 0;

  expensesRes.items.forEach((e) => {
    const amt = Number(e.amount) || 0;
    totalExpenses += amt;
    unified.push({
      id: e.id,
      type: 'expense',
      date: e.expense_date,
      amount: amt,
      title: e.description || e.category,
      description: e.description || '',
      category: e.category,
      paymentMethod: e.payment_method,
      account: e.account || null,
      isRecurring: Boolean(e.description && e.description.includes('[Recurring Bill]')),
      isSplit: Boolean(e.description && e.description.includes('[Split')),
      isDebit: true,
      rawCreatedAt: e.created_at
    });
  });

  incomesRes.items.forEach((i) => {
    const amt = Number(i.amount) || 0;
    totalIncomes += amt;
    unified.push({
      id: i.id,
      type: 'income',
      date: i.income_date,
      amount: amt,
      title: i.description || i.source,
      description: i.description || '',
      category: i.source,
      paymentMethod: 'Bank / Inflow',
      account: i.account || null,
      isRecurring: false,
      isSplit: false,
      isDebit: false,
      rawCreatedAt: i.created_at
    });
  });

  transfersRes.items.forEach((t) => {
    const amt = Number(t.amount) || 0;
    totalTransfers += amt;
    unified.push({
      id: t.id,
      type: 'transfer',
      date: t.transfer_date,
      amount: amt,
      title: `Transfer: ${t.source_account?.name || 'Account'} → ${t.destination_account?.name || 'Account'}`,
      description: t.note || 'Inter-account transfer',
      category: 'Transfer',
      paymentMethod: 'Internal Transfer',
      sourceAccount: t.source_account || null,
      destinationAccount: t.destination_account || null,
      account: t.source_account || null,
      isRecurring: false,
      isSplit: false,
      isDebit: false, // Neither expense nor income
      rawCreatedAt: t.created_at
    });
  });

  // Sort descending by date, then created_at
  unified.sort((a, b) => {
    if (b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    return new Date(b.rawCreatedAt).getTime() - new Date(a.rawCreatedAt).getTime();
  });

  const totalCount = unified.length;
  const paginated = unified.slice(offset, offset + limit);

  return {
    transactions: paginated,
    totalCount,
    hasMore: offset + limit < totalCount,
    summary: {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalIncomes: Math.round(totalIncomes * 100) / 100,
      totalTransfers: Math.round(totalTransfers * 100) / 100,
      netCashFlow: Math.round((totalIncomes - totalExpenses) * 100) / 100
    }
  };
}
