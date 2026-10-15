/**
 * HisabSetu — Financial Report & Export Engine
 * Generates genuine downloadable PDF reports and CSV exports across all 10 financial report types.
 * Enforces financial integrity: transfers are never counted as expenses or income,
 * and savings goals are not double-counted.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { buildFinancialPDF, formatPdfCurrency } from '../utils/pdfGenerator.js';
import { sanitizeCSVField } from '../utils/reportUtils.js';
import { downloadFile } from '../utils/fileDownloader.js';
import { getTodayLocalDateString } from '../utils/dateUtils.js';
import { calculateGoalProgress } from '../utils/goalUtils.js';

export const REPORT_TYPES = [
  { id: 'monthly_expense', label: '1. Monthly Expense Report', category: 'Expenses' },
  { id: 'income', label: '2. Income Report', category: 'Income' },
  { id: 'category_spending', label: '3. Category-wise Spending Report', category: 'Expenses' },
  { id: 'account_statement', label: '4. Account and Wallet Statement', category: 'Accounts' },
  { id: 'transfers', label: '5. Inter-account Transfer History', category: 'Transfers' },
  { id: 'budget_vs_actual', label: '6. Budget vs Actual Report', category: 'Budgets' },
  { id: 'recurring_bills', label: '7. Recurring Bills & Payment History', category: 'Recurring' },
  { id: 'savings_goals', label: '8. Savings Goals & Contributions Report', category: 'Goals' },
  { id: 'split_expenses', label: '9. Split Expenses & Settlements Report', category: 'Splits' },
  { id: 'financial_summary', label: '10. Custom Date-range Financial Summary', category: 'Executive' }
];

/**
 * Formats a clean, cross-platform filename.
 */
export function buildReportFilename(reportType, startDate, endDate, extension = 'pdf') {
  const sanitize = (s) => (s || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const start = sanitize(startDate) || 'all';
  const end = sanitize(endDate) || 'time';
  return `HisabSetu_${sanitize(reportType)}_${start}_to_${end}.${extension}`;
}

/**
 * Retrieves raw data and compiles structured tables & KPIs for any report type.
 */
export async function compileReportData({
  reportType,
  startDate = null,
  endDate = null,
  accountId = null,
  category = null
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const todayStr = getTodayLocalDateString();
  const start = startDate || '2000-01-01';
  const end = endDate || todayStr;

  switch (reportType) {
    case 'monthly_expense': {
      let q = supabase
        .from('expenses')
        .select(`
          id, expense_date, category, description, amount, payment_method, account_id,
          account:accounts(id, name, type)
        `)
        .gte('expense_date', start)
        .lte('expense_date', end)
        .order('expense_date', { ascending: false });

      if (category) q = q.eq('category', category);
      if (accountId) q = q.eq('account_id', accountId);

      const { data, error } = await q;
      if (error) throw error;
      const expenses = data || [];

      let total = 0;
      const catCount = {};
      expenses.forEach((e) => {
        const amt = Number(e.amount) || 0;
        total += amt;
        catCount[e.category] = (catCount[e.category] || 0) + amt;
      });

      let topCategory = 'None';
      let maxCatAmt = 0;
      Object.entries(catCount).forEach(([cat, amt]) => {
        if (amt > maxCatAmt) {
          maxCatAmt = amt;
          topCategory = cat;
        }
      });

      return {
        title: 'Monthly Expense Report',
        subtitle: category ? `Filtered by Category: ${category}` : 'Detailed Personal Expenses',
        kpis: [
          { label: 'Total Spending', value: formatPdfCurrency(total) },
          { label: 'Transactions', value: expenses.length },
          { label: 'Top Category', value: topCategory },
          { label: 'Avg / Transaction', value: expenses.length > 0 ? formatPdfCurrency(total / expenses.length) : 'Rs. 0.00' }
        ],
        tables: [{
          headers: ['Date', 'Category', 'Description', 'Account / Method', 'Amount (INR)'],
          rows: expenses.map((e) => [
            e.expense_date,
            e.category,
            e.description || '—',
            e.account?.name ? `${e.account.name} (${e.payment_method})` : e.payment_method,
            formatPdfCurrency(e.amount)
          ]),
          columnStyles: { 4: { halign: 'right' } }
        }],
        csvHeaders: ['Date', 'Category', 'Description', 'Payment Method', 'Account Name', 'Amount (INR)'],
        csvRows: expenses.map((e) => [
          e.expense_date,
          e.category,
          e.description || '',
          e.payment_method,
          e.account?.name || '',
          Number(e.amount).toFixed(2)
        ]),
        rawTotal: total
      };
    }

    case 'income': {
      let q = supabase
        .from('incomes')
        .select(`
          id, income_date, source, description, amount, account_id,
          account:accounts(id, name, type)
        `)
        .gte('income_date', start)
        .lte('income_date', end)
        .order('income_date', { ascending: false });

      if (accountId) q = q.eq('account_id', accountId);

      const { data, error } = await q;
      if (error) throw error;
      const incomes = data || [];

      let total = 0;
      const sourceCount = {};
      incomes.forEach((i) => {
        const amt = Number(i.amount) || 0;
        total += amt;
        sourceCount[i.source] = (sourceCount[i.source] || 0) + amt;
      });

      let topSource = 'None';
      let maxSrcAmt = 0;
      Object.entries(sourceCount).forEach(([src, amt]) => {
        if (amt > maxSrcAmt) {
          maxSrcAmt = amt;
          topSource = src;
        }
      });

      return {
        title: 'Income & Inflow Report',
        subtitle: accountId ? 'Filtered by Target Account' : 'All Confirmed Income Streams',
        kpis: [
          { label: 'Total Inflow', value: formatPdfCurrency(total) },
          { label: 'Income Entries', value: incomes.length },
          { label: 'Top Source', value: topSource },
          { label: 'Avg / Entry', value: incomes.length > 0 ? formatPdfCurrency(total / incomes.length) : 'Rs. 0.00' }
        ],
        tables: [{
          headers: ['Date', 'Source', 'Description', 'Deposited Account', 'Amount (INR)'],
          rows: incomes.map((i) => [
            i.income_date,
            i.source,
            i.description || '—',
            i.account?.name || 'Unassigned',
            formatPdfCurrency(i.amount)
          ]),
          columnStyles: { 4: { halign: 'right' } }
        }],
        csvHeaders: ['Date', 'Source', 'Description', 'Deposited Account', 'Amount (INR)'],
        csvRows: incomes.map((i) => [
          i.income_date,
          i.source,
          i.description || '',
          i.account?.name || '',
          Number(i.amount).toFixed(2)
        ]),
        rawTotal: total
      };
    }

    case 'category_spending': {
      let q = supabase
        .from('expenses')
        .select('category, amount')
        .gte('expense_date', start)
        .lte('expense_date', end);

      const { data, error } = await q;
      if (error) throw error;
      const expenses = data || [];

      let grandTotal = 0;
      const grouped = {};
      expenses.forEach((e) => {
        const amt = Number(e.amount) || 0;
        grandTotal += amt;
        if (!grouped[e.category]) {
          grouped[e.category] = { amount: 0, count: 0 };
        }
        grouped[e.category].amount += amt;
        grouped[e.category].count += 1;
      });

      const rows = Object.entries(grouped)
        .map(([cat, info]) => {
          const pct = grandTotal > 0 ? ((info.amount / grandTotal) * 100).toFixed(1) : '0.0';
          const avg = info.count > 0 ? info.amount / info.count : 0;
          return {
            category: cat,
            amount: info.amount,
            percentage: `${pct}%`,
            count: info.count,
            avg: avg
          };
        })
        .sort((a, b) => b.amount - a.amount);

      return {
        title: 'Category-wise Spending Analysis',
        subtitle: `Distribution across ${rows.length} spending categories`,
        kpis: [
          { label: 'Grand Total', value: formatPdfCurrency(grandTotal) },
          { label: 'Categories Active', value: rows.length },
          { label: 'Top Category', value: rows[0]?.category || 'None' },
          { label: 'Top Category Spend', value: rows[0] ? formatPdfCurrency(rows[0].amount) : 'Rs. 0.00' }
        ],
        tables: [{
          headers: ['Category', 'Total Spend (INR)', 'Share (%)', 'Transactions', 'Avg / Tx (INR)'],
          rows: rows.map((r) => [
            r.category,
            formatPdfCurrency(r.amount),
            r.percentage,
            r.count,
            formatPdfCurrency(r.avg)
          ]),
          columnStyles: { 1: { halign: 'right' }, 4: { halign: 'right' } }
        }],
        csvHeaders: ['Category', 'Total Spend (INR)', 'Share (%)', 'Transactions Count', 'Avg Per Transaction (INR)'],
        csvRows: rows.map((r) => [
          r.category,
          r.amount.toFixed(2),
          r.percentage,
          r.count,
          r.avg.toFixed(2)
        ]),
        rawTotal: grandTotal
      };
    }

    case 'account_statement': {
      // Fetch selected account or all accounts
      let accQuery = supabase.from('accounts').select('*');
      if (accountId) accQuery = accQuery.eq('id', accountId);
      const { data: accounts, error: accErr } = await accQuery;
      if (accErr) throw accErr;

      const targetAccount = accounts?.[0] || null;
      const accountName = targetAccount?.name || 'All Accounts';

      // Fetch expenses, incomes, and transfers for this account
      const [expRes, incRes, txOutRes, txInRes] = await Promise.all([
        supabase.from('expenses').select('*').gte('expense_date', start).lte('expense_date', end)
          .eq(accountId ? 'account_id' : 'user_id', accountId || (await supabase.auth.getUser()).data.user.id),
        supabase.from('incomes').select('*').gte('income_date', start).lte('income_date', end)
          .eq(accountId ? 'account_id' : 'user_id', accountId || (await supabase.auth.getUser()).data.user.id),
        supabase.from('transfers').select('*, destination:accounts!transfers_destination_account_id_fkey(name)')
          .gte('transfer_date', start).lte('transfer_date', end)
          .eq(accountId ? 'source_account_id' : 'user_id', accountId || (await supabase.auth.getUser()).data.user.id),
        supabase.from('transfers').select('*, source:accounts!transfers_source_account_id_fkey(name)')
          .gte('transfer_date', start).lte('transfer_date', end)
          .eq(accountId ? 'destination_account_id' : 'user_id', accountId || (await supabase.auth.getUser()).data.user.id)
      ]);

      const events = [];
      (expRes.data || []).forEach((e) => events.push({
        date: e.expense_date,
        type: 'Expense',
        desc: `${e.category}: ${e.description || 'Spend'}`,
        inflow: 0,
        outflow: Number(e.amount) || 0
      }));
      (incRes.data || []).forEach((i) => events.push({
        date: i.income_date,
        type: 'Income',
        desc: `${i.source}: ${i.description || 'Inflow'}`,
        inflow: Number(i.amount) || 0,
        outflow: 0
      }));
      (txOutRes.data || []).forEach((t) => events.push({
        date: t.transfer_date,
        type: 'Transfer Out',
        desc: `To: ${t.destination?.name || 'Account'} (${t.note || 'Transfer'})`,
        inflow: 0,
        outflow: Number(t.amount) || 0
      }));
      (txInRes.data || []).forEach((t) => events.push({
        date: t.transfer_date,
        type: 'Transfer In',
        desc: `From: ${t.source?.name || 'Account'} (${t.note || 'Transfer'})`,
        inflow: Number(t.amount) || 0,
        outflow: 0
      }));

      events.sort((a, b) => b.date.localeCompare(a.date));

      const totalInflows = events.reduce((sum, e) => sum + e.inflow, 0);
      const totalOutflows = events.reduce((sum, e) => sum + e.outflow, 0);
      const netDelta = totalInflows - totalOutflows;

      return {
        title: `Account Statement: ${accountName}`,
        subtitle: `Type: ${targetAccount?.type?.toUpperCase() || 'Portfolio'} | Opening Balance: ${formatPdfCurrency(targetAccount?.opening_balance || 0)}`,
        kpis: [
          { label: 'Total Inflows', value: formatPdfCurrency(totalInflows) },
          { label: 'Total Outflows', value: formatPdfCurrency(totalOutflows) },
          { label: 'Net Period Delta', value: formatPdfCurrency(netDelta) },
          { label: 'Statement Entries', value: events.length }
        ],
        tables: [{
          headers: ['Date', 'Transaction Type', 'Description / Details', 'Inflow (INR)', 'Outflow (INR)'],
          rows: events.map((ev) => [
            ev.date,
            ev.type,
            ev.desc,
            ev.inflow > 0 ? formatPdfCurrency(ev.inflow) : '—',
            ev.outflow > 0 ? formatPdfCurrency(ev.outflow) : '—'
          ]),
          columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } }
        }],
        csvHeaders: ['Date', 'Transaction Type', 'Description', 'Inflow (INR)', 'Outflow (INR)'],
        csvRows: events.map((ev) => [
          ev.date,
          ev.type,
          ev.desc,
          ev.inflow.toFixed(2),
          ev.outflow.toFixed(2)
        ]),
        rawTotal: netDelta
      };
    }

    case 'transfers': {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          id, transfer_date, amount, note,
          source:accounts!transfers_source_account_id_fkey(name, type),
          destination:accounts!transfers_destination_account_id_fkey(name, type)
        `)
        .gte('transfer_date', start)
        .lte('transfer_date', end)
        .order('transfer_date', { ascending: false });

      if (error) throw error;
      const transfers = data || [];
      const totalTransferred = transfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      return {
        title: 'Inter-Account Transfer History',
        subtitle: 'Internal portfolio fund movements (Excluded from spending and income)',
        kpis: [
          { label: 'Total Transferred', value: formatPdfCurrency(totalTransferred) },
          { label: 'Transfer Count', value: transfers.length },
          { label: 'Avg Transfer', value: transfers.length > 0 ? formatPdfCurrency(totalTransferred / transfers.length) : 'Rs. 0.00' }
        ],
        tables: [{
          headers: ['Date', 'Source Account', 'Destination Account', 'Note', 'Amount (INR)'],
          rows: transfers.map((t) => [
            t.transfer_date,
            t.source?.name || 'Unassigned',
            t.destination?.name || 'Unassigned',
            t.note || '—',
            formatPdfCurrency(t.amount)
          ]),
          columnStyles: { 4: { halign: 'right' } }
        }],
        csvHeaders: ['Date', 'Source Account', 'Destination Account', 'Note', 'Amount (INR)'],
        csvRows: transfers.map((t) => [
          t.transfer_date,
          t.source?.name || '',
          t.destination?.name || '',
          t.note || '',
          Number(t.amount).toFixed(2)
        ]),
        rawTotal: totalTransferred
      };
    }

    case 'budget_vs_actual': {
      const curYear = new Date(start).getFullYear();
      const curMonth = new Date(start).getMonth() + 1;

      const [budgetRes, expRes] = await Promise.all([
        supabase.from('budgets').select('*').eq('year', curYear).eq('month', curMonth),
        supabase.from('expenses').select('category, amount').gte('expense_date', start).lte('expense_date', end)
      ]);

      const budgets = budgetRes.data || [];
      const expenses = expRes.data || [];

      const actualSpent = {};
      let totalActual = 0;
      expenses.forEach((e) => {
        const amt = Number(e.amount) || 0;
        totalActual += amt;
        actualSpent[e.category] = (actualSpent[e.category] || 0) + amt;
      });

      let totalBudget = 0;
      const rows = budgets.map((b) => {
        const bAmt = Number(b.amount) || 0;
        totalBudget += bAmt;
        const spent = actualSpent[b.category] || 0;
        const remaining = bAmt - spent;
        const util = bAmt > 0 ? Math.round((spent / bAmt) * 100) : 0;
        const status = spent > bAmt ? 'Over Budget' : util >= (b.alert_threshold || 80) ? 'Warning' : 'On Track';
        return {
          category: b.category,
          budget: bAmt,
          actual: spent,
          remaining: remaining,
          utilization: `${util}%`,
          status
        };
      });

      const totalRemaining = totalBudget - totalActual;
      const overallUsage = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

      return {
        title: 'Budget vs Actual Performance Report',
        subtitle: `Monthly Target Performance for ${new Date(start).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
        kpis: [
          { label: 'Total Budgeted', value: formatPdfCurrency(totalBudget) },
          { label: 'Actual Spent', value: formatPdfCurrency(totalActual) },
          { label: 'Variance / Left', value: formatPdfCurrency(totalRemaining) },
          { label: 'Utilization', value: `${overallUsage}%` }
        ],
        tables: [{
          headers: ['Category', 'Budget (INR)', 'Actual (INR)', 'Remaining (INR)', 'Used', 'Status'],
          rows: rows.map((r) => [
            r.category,
            formatPdfCurrency(r.budget),
            formatPdfCurrency(r.actual),
            formatPdfCurrency(r.remaining),
            r.utilization,
            r.status
          ]),
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
        }],
        csvHeaders: ['Category', 'Budget (INR)', 'Actual Spent (INR)', 'Remaining (INR)', 'Utilization (%)', 'Status'],
        csvRows: rows.map((r) => [
          r.category,
          r.budget.toFixed(2),
          r.actual.toFixed(2),
          r.remaining.toFixed(2),
          r.utilization,
          r.status
        ]),
        rawTotal: totalActual
      };
    }

    case 'recurring_bills': {
      const { data: bills, error: bErr } = await supabase
        .from('recurring_expenses')
        .select('*, account:accounts(name)')
        .order('next_due_date', { ascending: true });

      if (bErr) throw bErr;
      const recurringList = bills || [];

      const totalCommitment = recurringList
        .filter((r) => r.is_active)
        .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

      const overdueCount = recurringList.filter((r) => r.is_active && r.next_due_date < todayStr).length;

      return {
        title: 'Recurring Bills & Subscriptions Schedule',
        subtitle: 'Standing commitments, schedules, and automated bill alerts',
        kpis: [
          { label: 'Active Schedules', value: recurringList.filter((r) => r.is_active).length },
          { label: 'Monthly Volume', value: formatPdfCurrency(totalCommitment) },
          { label: 'Overdue Bills', value: overdueCount },
          { label: 'Total Tracked', value: recurringList.length }
        ],
        tables: [{
          headers: ['Title', 'Category', 'Frequency', 'Next Due Date', 'Account', 'Amount (INR)'],
          rows: recurringList.map((r) => [
            r.title,
            r.category,
            r.frequency?.toUpperCase(),
            r.next_due_date,
            r.account?.name || 'Default Method',
            formatPdfCurrency(r.amount)
          ]),
          columnStyles: { 5: { halign: 'right' } }
        }],
        csvHeaders: ['Title', 'Category', 'Frequency', 'Next Due Date', 'Payment Method', 'Account', 'Amount (INR)', 'Is Active'],
        csvRows: recurringList.map((r) => [
          r.title,
          r.category,
          r.frequency,
          r.next_due_date,
          r.payment_method,
          r.account?.name || '',
          Number(r.amount).toFixed(2),
          r.is_active ? 'YES' : 'NO'
        ]),
        rawTotal: totalCommitment
      };
    }

    case 'savings_goals': {
      const { data: goals, error: gErr } = await supabase
        .from('savings_goals')
        .select('*, linked_account:accounts(name)')
        .order('created_at', { ascending: false });

      if (gErr) throw gErr;
      const goalsList = goals || [];

      let totalTarget = 0;
      let totalSaved = 0;
      goalsList.forEach((g) => {
        totalTarget += Number(g.target_amount) || 0;
        totalSaved += Number(g.current_amount) || 0;
      });

      const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
      const completedGoals = goalsList.filter((g) => g.status === 'completed' || Number(g.current_amount) >= Number(g.target_amount)).length;

      return {
        title: 'Savings Goals & Contributions Progress Report',
        subtitle: 'Dedicated savings objectives, target deadlines, and funding velocity',
        kpis: [
          { label: 'Total Contributed', value: formatPdfCurrency(totalSaved) },
          { label: 'Total Target', value: formatPdfCurrency(totalTarget) },
          { label: 'Overall Progress', value: `${overallProgress}%` },
          { label: 'Goals Met', value: `${completedGoals} / ${goalsList.length}` }
        ],
        tables: [{
          headers: ['Goal Name', 'Category', 'Target (INR)', 'Saved (INR)', 'Progress', 'Target Date', 'Status'],
          rows: goalsList.map((g) => {
            const prog = calculateGoalProgress(g.current_amount, g.target_amount);
            return [
              g.name,
              g.category,
              formatPdfCurrency(g.target_amount),
              formatPdfCurrency(g.current_amount),
              `${prog.displayPercentage}%`,
              g.target_date || 'No Date',
              g.status?.toUpperCase()
            ];
          }),
          columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } }
        }],
        csvHeaders: ['Goal Name', 'Category', 'Target Amount (INR)', 'Current Amount (INR)', 'Progress (%)', 'Target Date', 'Status', 'Linked Account'],
        csvRows: goalsList.map((g) => [
          g.name,
          g.category,
          Number(g.target_amount).toFixed(2),
          Number(g.current_amount).toFixed(2),
          calculateGoalProgress(g.current_amount, g.target_amount).displayPercentage,
          g.target_date || '',
          g.status,
          g.linked_account?.name || ''
        ]),
        rawTotal: totalSaved
      };
    }

    case 'split_expenses': {
      const [splitRes, friendsRes] = await Promise.all([
        supabase.from('shared_expenses').select('*, paid_by:split_friends(name)').gte('expense_date', start).lte('expense_date', end).order('expense_date', { ascending: false }),
        supabase.from('split_friends').select('*')
      ]);

      const shared = splitRes.data || [];
      const totalShared = shared.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

      return {
        title: 'Split Expenses & Settlements Ledger',
        subtitle: `Group expenses and peer settlements across ${friendsRes.data?.length || 0} friends`,
        kpis: [
          { label: 'Total Shared Bills', value: formatPdfCurrency(totalShared) },
          { label: 'Shared Expenses', value: shared.length },
          { label: 'Friends Network', value: friendsRes.data?.length || 0 }
        ],
        tables: [{
          headers: ['Date', 'Bill Title', 'Category', 'Paid By', 'Split Method', 'Total Amount (INR)'],
          rows: shared.map((s) => [
            s.expense_date,
            s.title,
            s.category,
            s.paid_by?.name || 'You',
            s.split_method?.toUpperCase(),
            formatPdfCurrency(s.total_amount)
          ]),
          columnStyles: { 5: { halign: 'right' } }
        }],
        csvHeaders: ['Date', 'Title', 'Category', 'Paid By', 'Split Method', 'Total Amount (INR)', 'Notes'],
        csvRows: shared.map((s) => [
          s.expense_date,
          s.title,
          s.category,
          s.paid_by?.name || 'You',
          s.split_method,
          Number(s.total_amount).toFixed(2),
          s.notes || ''
        ]),
        rawTotal: totalShared
      };
    }

    case 'financial_summary':
    default: {
      // Executive Comprehensive Report across Incomes, Expenses, and Accounts
      const [expRes, incRes, accRes] = await Promise.all([
        supabase.from('expenses').select('*').gte('expense_date', start).lte('expense_date', end),
        supabase.from('incomes').select('*').gte('income_date', start).lte('income_date', end),
        supabase.from('accounts').select('*').eq('is_archived', false)
      ]);

      const expenses = expRes.data || [];
      const incomes = incRes.data || [];
      const accounts = accRes.data || [];

      const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalIncome = incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

      // Group expenses by category
      const catGroup = {};
      expenses.forEach((e) => {
        catGroup[e.category] = (catGroup[e.category] || 0) + (Number(e.amount) || 0);
      });

      const catRows = Object.entries(catGroup)
        .map(([c, amt]) => [c, formatPdfCurrency(amt), totalExpense > 0 ? `${((amt / totalExpense) * 100).toFixed(1)}%` : '0%'])
        .sort((a, b) => b[1] - a[1]);

      return {
        title: 'Executive Financial Summary',
        subtitle: `Complete Portfolio Overview for ${startDate || 'All Time'} to ${endDate || todayStr}`,
        kpis: [
          { label: 'Total Inflow', value: formatPdfCurrency(totalIncome) },
          { label: 'Total Outflow', value: formatPdfCurrency(totalExpense) },
          { label: 'Net Savings', value: formatPdfCurrency(netSavings) },
          { label: 'Savings Rate', value: `${savingsRate}%` }
        ],
        tables: [
          {
            title: 'Category Breakdown',
            headers: ['Expense Category', 'Total Amount (INR)', 'Share (%)'],
            rows: catRows.length > 0 ? catRows : [['No expenses recorded in this period.']],
            columnStyles: { 1: { halign: 'right' } }
          },
          {
            title: 'Active Accounts Portfolio',
            headers: ['Account Name', 'Type', 'Opening Balance (INR)'],
            rows: accounts.map((a) => [a.name, a.type.toUpperCase(), formatPdfCurrency(a.opening_balance)]),
            columnStyles: { 2: { halign: 'right' } }
          }
        ],
        csvHeaders: ['Category / Item', 'Type', 'Amount (INR)'],
        csvRows: [
          ['Total Confirmed Income', 'Inflow', totalIncome.toFixed(2)],
          ['Total Confirmed Expenses', 'Outflow', totalExpense.toFixed(2)],
          ['Net Savings', 'Balance', netSavings.toFixed(2)],
          ...Object.entries(catGroup).map(([c, amt]) => [c, 'Category Expense', amt.toFixed(2)])
        ],
        rawTotal: netSavings
      };
    }
  }
}

/**
 * Generates an RFC-4180 CSV string with UTF-8 BOM from compiled report data.
 */
export function generateReportCSV(compiledData) {
  const headers = compiledData.csvHeaders.map(sanitizeCSVField).join(',');
  const rows = compiledData.csvRows.map((row) => row.map(sanitizeCSVField).join(','));

  const fullContent = [headers, ...rows].join('\r\n');
  return `\uFEFF${fullContent}`; // UTF-8 BOM for Microsoft Excel
}

/**
 * Standard RFC-4180 CSV builder utility.
 */
export function generateRFC4180CSV({ columns, rows }) {
  const headers = columns.map((col) => sanitizeCSVField(col.header || col.key)).join(',');
  const rowLines = rows.map((r) => {
    return columns.map((col) => sanitizeCSVField(r[col.key] ?? '')).join(',');
  });
  return `\uFEFF${[headers, ...rowLines].join('\r\n')}`;
}


/**
 * Downloads a report as PDF or CSV.
 */
export async function exportReport({
  reportType,
  startDate,
  endDate,
  accountId,
  category,
  format = 'pdf',
  userName = 'HisabSetu User'
}) {
  const compiled = await compileReportData({
    reportType,
    startDate,
    endDate,
    accountId,
    category
  });

  const dateRangeLabel = `${startDate || 'Start'} to ${endDate || 'Present'}`;
  const filename = buildReportFilename(reportType, startDate, endDate, format);

  if (format === 'pdf') {
    const doc = buildFinancialPDF({
      title: compiled.title,
      subtitle: compiled.subtitle,
      dateRangeLabel,
      generatedBy: userName,
      kpis: compiled.kpis,
      tables: compiled.tables,
      notes: 'Generated by HisabSetu Personal Finance Management App.'
    });

    const pdfBlob = doc.output('blob');
    return await downloadFile(pdfBlob, filename, 'application/pdf');
  }

  // Format === 'csv'
  const csvContent = generateReportCSV(compiled);
  return await downloadFile(csvContent, filename, 'text/csv');
}
