/**
 * HisabSetu — Financial Calendar Service
 * Aggregates daily financial activity, monthly cash flow, and scheduled recurring bills.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Returns complete month financial calendar data for a specified year and month (1-12).
 */
export async function getCalendarMonthData({ year, month }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  // month is 1-indexed (1 = Jan, 12 = Dec)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDayDate = new Date(year, month, 0); // day 0 of next month = last day of this month
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;

  // Execute queries in parallel
  const [expensesRes, incomesRes, transfersRes, occurrencesRes] = await Promise.all([
    supabase
      .from('expenses')
      .select(`
        id, amount, category, description, expense_date, payment_method, account_id, created_at,
        account:accounts(id, name, type, color)
      `)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate),

    supabase
      .from('incomes')
      .select(`
        id, amount, source, description, income_date, account_id, created_at,
        account:accounts(id, name, type, color)
      `)
      .gte('income_date', startDate)
      .lte('income_date', endDate),

    supabase
      .from('transfers')
      .select(`
        id, amount, transfer_date, note, source_account_id, destination_account_id, created_at,
        source_account:accounts!transfers_source_account_id_fkey(id, name, type, color),
        destination_account:accounts!transfers_destination_account_id_fkey(id, name, type, color)
      `)
      .gte('transfer_date', startDate)
      .lte('transfer_date', endDate),

    supabase
      .from('recurring_expense_occurrences')
      .select(`
        id, scheduled_due_date, actual_payment_date, actual_paid_amount, status, linked_expense_id,
        schedule:recurring_expenses(id, title, amount, category, payment_method)
      `)
      .gte('scheduled_due_date', startDate)
      .lte('scheduled_due_date', endDate)
  ]);

  if (expensesRes.error) throw expensesRes.error;
  if (incomesRes.error) throw incomesRes.error;
  if (transfersRes.error) throw transfersRes.error;
  // Ignore error if recurring table is not yet created in remote DB
  const rawOccurrences = occurrencesRes.error ? [] : (occurrencesRes.data || []);

  const expenses = expensesRes.data || [];
  const incomes = incomesRes.data || [];
  const transfers = transfersRes.data || [];

  // Group by day map: 'YYYY-MM-DD' => { expenses, incomes, transfers, pendingBills, ... }
  const daysMap = {};

  // Initialize all days of the month
  for (let d = 1; d <= lastDayDate.getDate(); d++) {
    const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysMap[dayStr] = {
      dateString: dayStr,
      dayOfMonth: d,
      expenses: [],
      incomes: [],
      transfers: [],
      pendingBills: [],
      expensesTotal: 0,
      incomesTotal: 0,
      transfersTotal: 0,
      pendingBillsTotal: 0
    };
  }

  let monthlyExpenses = 0;
  let monthlyIncome = 0;
  let monthlyTransfers = 0;
  let monthlyPendingBillsCount = 0;
  let monthlyPendingBillsTotal = 0;

  // Process Expenses
  expenses.forEach((e) => {
    const dStr = e.expense_date;
    const amt = Number(e.amount) || 0;
    monthlyExpenses += amt;
    if (daysMap[dStr]) {
      daysMap[dStr].expenses.push(e);
      daysMap[dStr].expensesTotal += amt;
    }
  });

  // Process Incomes
  incomes.forEach((i) => {
    const dStr = i.income_date;
    const amt = Number(i.amount) || 0;
    monthlyIncome += amt;
    if (daysMap[dStr]) {
      daysMap[dStr].incomes.push(i);
      daysMap[dStr].incomesTotal += amt;
    }
  });

  // Process Transfers (Excluded from spending and income)
  transfers.forEach((t) => {
    const dStr = t.transfer_date;
    const amt = Number(t.amount) || 0;
    monthlyTransfers += amt;
    if (daysMap[dStr]) {
      daysMap[dStr].transfers.push(t);
      daysMap[dStr].transfersTotal += amt;
    }
  });

  // Process Pending Recurring Bills (Avoid duplicate if already confirmed & linked to expense)
  rawOccurrences.forEach((occ) => {
    if (occ.status === 'pending' && !occ.linked_expense_id) {
      const dStr = occ.scheduled_due_date;
      const amt = Number(occ.schedule?.amount || occ.actual_paid_amount || 0);
      monthlyPendingBillsCount++;
      monthlyPendingBillsTotal += amt;
      if (daysMap[dStr]) {
        daysMap[dStr].pendingBills.push(occ);
        daysMap[dStr].pendingBillsTotal += amt;
      }
    }
  });

  // Round all totals safely
  Object.values(daysMap).forEach((day) => {
    day.expensesTotal = Math.round(day.expensesTotal * 100) / 100;
    day.incomesTotal = Math.round(day.incomesTotal * 100) / 100;
    day.transfersTotal = Math.round(day.transfersTotal * 100) / 100;
    day.pendingBillsTotal = Math.round(day.pendingBillsTotal * 100) / 100;
    day.hasActivity =
      day.expenses.length > 0 ||
      day.incomes.length > 0 ||
      day.transfers.length > 0 ||
      day.pendingBills.length > 0;
  });

  return {
    year,
    month,
    daysMap,
    summary: {
      monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      netCashFlow: Math.round((monthlyIncome - monthlyExpenses) * 100) / 100,
      totalTransfers: Math.round(monthlyTransfers * 100) / 100,
      pendingBillsCount: monthlyPendingBillsCount,
      pendingBillsTotal: Math.round(monthlyPendingBillsTotal * 100) / 100,
      transactionCount: expenses.length + incomes.length + transfers.length
    }
  };
}
