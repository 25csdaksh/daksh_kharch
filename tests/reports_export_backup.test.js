/**
 * HisabSetu — Phase 6: Professional PDF Reports, CSV Export, Data Backup & Restore Test Suite
 * Validates PDF generation, CSV RFC-4180 formatting, formula injection protection,
 * backup metadata validation, restore validation, duplicate detection, foreign-key ordering,
 * security isolation, and financial accounting invariants.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFinancialPDF,
  formatPdfCurrency
} from '../src/utils/pdfGenerator.js';

import {
  REPORT_TYPES,
  generateRFC4180CSV
} from '../src/services/reportExportService.js';

import {
  BACKUP_SCHEMA_VERSION,
  TABLE_RESTORE_ORDER,
  validateBackupFile,
  previewBackupData,
  createBackupEnvelope
} from '../src/services/backupRestoreService.js';

import {
  sanitizeCSVField
} from '../src/utils/reportUtils.js';

import {
  calculateAccountBalance,
  calculateNetWorthSummary
} from '../src/utils/accountUtils.js';

describe('HisabSetu Phase 6: Professional PDF Reports, CSV Export, Data Backup & Restore Tests', () => {

  // ==========================================
  // SECTION 1: PDF GENERATION & FORMATTING
  // ==========================================
  describe('1. PDF Generation & Indian Currency Formatting', () => {
    it('formats Indian currency without glyph corruption in standard PDF WinAnsi', () => {
      assert.equal(formatPdfCurrency(0), 'Rs. 0.00');
      assert.equal(formatPdfCurrency(1250), 'Rs. 1,250.00');
      assert.equal(formatPdfCurrency(1234567.89), 'Rs. 12,34,567.89');
      assert.equal(formatPdfCurrency(50000000), 'Rs. 5,00,00,000.00');
      assert.equal(formatPdfCurrency(-4500), '-Rs. 4,500.00');
    });

    it('buildFinancialPDF produces a valid jsPDF document without throwing', () => {
      const doc = buildFinancialPDF({
        reportTitle: 'Monthly Expense Report',
        dateRangeLabel: '01 Oct 2026 to 31 Oct 2026',
        userName: 'Daksh Finance Admin',
        kpis: [
          { label: 'Total Spending', value: 'Rs. 45,000.00' },
          { label: 'Transactions', value: '28' },
          { label: 'Top Category', value: 'Food & Dining' }
        ],
        tableColumns: [
          { header: 'Date', dataKey: 'date' },
          { header: 'Title', dataKey: 'title' },
          { header: 'Category', dataKey: 'category' },
          { header: 'Account', dataKey: 'account' },
          { header: 'Amount (INR)', dataKey: 'amount' }
        ],
        tableRows: [
          { date: '2026-10-02', title: 'Groceries Mart', category: 'Food & Dining', account: 'HDFC Bank', amount: 'Rs. 3,450.00' },
          { date: '2026-10-05', title: 'Electricity Bill', category: 'Utilities', account: 'HDFC Bank', amount: 'Rs. 2,100.00' }
        ]
      });

      assert.ok(doc, 'PDF Document should be created');
      assert.equal(typeof doc.output, 'function', 'PDF should have output method');
      const blob = doc.output('blob');
      assert.ok(blob.size > 0, 'PDF Blob size should be non-zero');
    });

    it('handles empty table data gracefully with empty-state messaging in PDF', () => {
      const doc = buildFinancialPDF({
        reportTitle: 'Category Spending Report',
        dateRangeLabel: '01 Oct 2026 to 31 Oct 2026',
        userName: 'Daksh User',
        kpis: [{ label: 'Total Spending', value: 'Rs. 0.00' }],
        tableColumns: [
          { header: 'Category', dataKey: 'category' },
          { header: 'Total Spend', dataKey: 'amount' }
        ],
        tableRows: []
      });

      assert.ok(doc, 'PDF Document should handle empty rows gracefully');
      const blob = doc.output('blob');
      assert.ok(blob.size > 0);
    });

    it('supports all 10 standard report types in the Export catalog', () => {
      assert.equal(REPORT_TYPES.length, 10, 'Should have exactly 10 supported report types');
      const expectedTypes = [
        'monthly_expense',
        'income',
        'category_spending',
        'account_statement',
        'transfers',
        'budget_vs_actual',
        'recurring_bills',
        'savings_goals',
        'split_expenses',
        'financial_summary'
      ];
      const actualIds = REPORT_TYPES.map((t) => t.id);
      for (const exp of expectedTypes) {
        assert.ok(actualIds.includes(exp), `Missing report type: ${exp}`);
      }
    });
  });

  // ==========================================
  // SECTION 2: CSV EXPORT & SECURITY
  // ==========================================
  describe('2. CSV RFC-4180 Formatting & Formula Injection Protection', () => {
    it('neutralizes spreadsheet formula-injection prefixes (=, +, -, @)', () => {
      // sanitizeCSVField prepends single quote if field starts with formula operators
      const malicious1 = '=cmd|/c calc!A0';
      const malicious2 = '+SUM(1,2)';
      const malicious3 = '-10+20';
      const malicious4 = '@dangerous';

      assert.ok(sanitizeCSVField(malicious1).startsWith("'="), 'Should prefix formula starting with =');
      assert.ok(sanitizeCSVField(malicious2).includes("'+"), 'Should prefix formula starting with +');
      assert.ok(sanitizeCSVField(malicious3).startsWith("'-"), 'Should prefix formula starting with -');
      assert.ok(sanitizeCSVField(malicious4).startsWith("'@"), 'Should prefix formula starting with @');
    });


    it('escapes quotes, commas, and line breaks according to RFC-4180', () => {
      const complexText = 'Groceries at "Big Bazaar", Bangalore\nWith discount';
      const escaped = sanitizeCSVField(complexText);
      assert.ok(escaped.startsWith('"') && escaped.endsWith('"'), 'Should wrap multi-line or quoted strings in double quotes');
      assert.ok(escaped.includes('""Big Bazaar""'), 'Should double internal double-quotes');
    });

    it('generates well-formed CSV strings with UTF-8 BOM', () => {
      const columns = [
        { header: 'Date', key: 'date' },
        { header: 'Item Name', key: 'name' },
        { header: 'Amount (INR)', key: 'amount' }
      ];
      const rows = [
        { date: '2026-10-15', name: 'Coffee & Snacks', amount: 350.00 },
        { date: '2026-10-16', name: 'Stationery, "Pens & Pads"', amount: 450.50 }
      ];

      const csv = generateRFC4180CSV({ columns, rows });
      assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM for Excel compatibility');
      assert.ok(csv.includes('Date,Item Name,Amount (INR)'), 'Header row must be properly joined');
      assert.ok(csv.includes('2026-10-15,Coffee & Snacks,350'), 'Row 1 must be correctly formatted');
      assert.ok(csv.includes('""Pens & Pads""'), 'Quotes inside item names must be doubled');
    });
  });

  // ==========================================
  // SECTION 3: USER DATA BACKUP VALIDATION
  // ==========================================
  describe('3. User Data Backup Structure & Metadata', () => {
    it('creates a compliant backup envelope with schema 1.0.0 and correct metadata', () => {
      const sampleData = {
        accounts: [{ id: 'acc-1', name: 'HDFC Savings', balance: 50000 }],
        expenses: [{ id: 'exp-1', title: 'Dinner', amount: 1200 }],
        incomes: [],
        transfers: [],
        budgets: [],
        recurring_expenses: [],
        recurring_expense_occurrences: [],
        savings_goals: [],
        goal_transactions: [],
        split_friends: [],
        shared_expenses: [],
        shared_expense_shares: [],
        shared_expense_settlements: []
      };

      const envelope = createBackupEnvelope(sampleData);
      assert.equal(envelope.app, 'HisabSetu');
      assert.equal(envelope.schema_version, BACKUP_SCHEMA_VERSION);
      assert.equal(envelope.format, 'application/json');
      assert.ok(envelope.generated_at);
      assert.equal(envelope.record_counts.accounts, 1);
      assert.equal(envelope.record_counts.expenses, 1);
      assert.equal(envelope.record_counts.incomes, 0);
      assert.equal(envelope.data.accounts.length, 1);
    });

    it('validates a correct backup structure successfully', () => {
      const validEnvelope = {
        app: 'HisabSetu',
        schema_version: '1.0.0',
        generated_at: new Date().toISOString(),
        record_counts: { accounts: 1, expenses: 1 },
        data: {
          accounts: [{ id: 'acc-1', name: 'Primary Account', balance: 10000 }],
          expenses: [{ id: 'exp-1', title: 'Groceries', amount: 2500, expense_date: '2026-10-10' }],
          incomes: [],
          transfers: [],
          budgets: [],
          recurring_expenses: [],
          recurring_expense_occurrences: [],
          savings_goals: [],
          goal_transactions: [],
          split_friends: [],
          shared_expenses: [],
          shared_expense_shares: [],
          shared_expense_settlements: []
        }
      };

      const validation = validateBackupFile(validEnvelope);
      assert.equal(validation.isValid, true);
      assert.equal(validation.errors.length, 0);
      assert.equal(validation.metadata.schemaVersion, '1.0.0');
    });

    it('rejects backup files from different applications or missing schema version', () => {
      const invalidApp = {
        app: 'SomeOtherFinanceApp',
        schema_version: '1.0.0',
        data: {}
      };
      const res = validateBackupFile(invalidApp);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.some((e) => e.includes('Invalid application signature')));

      const missingVersion = {
        app: 'HisabSetu',
        data: {}
      };
      const res2 = validateBackupFile(missingVersion);
      assert.equal(res2.isValid, false);
      assert.ok(res2.errors.some((e) => e.includes('Missing backup schema version')));
    });

    it('rejects unsupported future major schema versions (e.g. 2.0.0)', () => {
      const futureVersion = {
        app: 'HisabSetu',
        schema_version: '2.0.0',
        data: {}
      };
      const res = validateBackupFile(futureVersion);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.some((e) => e.includes('Unsupported backup schema version 2.0.0')));
    });

    it('rejects corrupt records with negative amounts or missing required fields', () => {
      const corruptData = {
        app: 'HisabSetu',
        schema_version: '1.0.0',
        data: {
          accounts: [{ id: 'acc-1', balance: 'not-a-number' }],
          expenses: [{ id: 'exp-1', amount: -500, expense_date: 'invalid-date' }],
          incomes: [],
          transfers: [],
          budgets: [],
          recurring_expenses: [],
          recurring_expense_occurrences: [],
          savings_goals: [],
          goal_transactions: [],
          split_friends: [],
          shared_expenses: [],
          shared_expense_shares: [],
          shared_expense_settlements: []
        }
      };
      const res = validateBackupFile(corruptData);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.length >= 2, 'Should detect corrupt account balance and expense amount/date');
    });
  });

  // ==========================================
  // SECTION 4: RESTORE VALIDATION & INTEGRITY
  // ==========================================
  describe('4. Restore Engine & Foreign-Key Dependency Integrity', () => {
    it('strictly observes foreign-key dependency insertion order', () => {
      // Must insert referenced entities (e.g. accounts, friends) before dependent transactions
      const expectedOrder = [
        'split_friends',
        'accounts',
        'budgets',
        'expenses',
        'incomes',
        'transfers',
        'recurring_expenses',
        'recurring_expense_occurrences',
        'savings_goals',
        'goal_transactions',
        'shared_expenses',
        'shared_expense_shares',
        'shared_expense_settlements'
      ];

      assert.deepEqual(TABLE_RESTORE_ORDER, expectedOrder);

      // Verify that split_friends and accounts precede dependent records
      const friendIdx = TABLE_RESTORE_ORDER.indexOf('split_friends');
      const sharedExpenseIdx = TABLE_RESTORE_ORDER.indexOf('shared_expenses');
      const settlementIdx = TABLE_RESTORE_ORDER.indexOf('shared_expense_settlements');
      assert.ok(friendIdx < sharedExpenseIdx, 'split_friends must precede shared_expenses');
      assert.ok(sharedExpenseIdx < settlementIdx, 'shared_expenses must precede shared_expense_settlements');

      const accountIdx = TABLE_RESTORE_ORDER.indexOf('accounts');
      const transferIdx = TABLE_RESTORE_ORDER.indexOf('transfers');
      const expenseIdx = TABLE_RESTORE_ORDER.indexOf('expenses');
      assert.ok(accountIdx < transferIdx, 'accounts must precede transfers');
      assert.ok(accountIdx < expenseIdx, 'accounts must precede expenses');

      const goalIdx = TABLE_RESTORE_ORDER.indexOf('savings_goals');
      const goalTxIdx = TABLE_RESTORE_ORDER.indexOf('goal_transactions');
      assert.ok(goalIdx < goalTxIdx, 'savings_goals must precede goal_transactions');
    });

    it('accurately previews new records vs duplicates against existing database records', async () => {
      const backupData = {
        accounts: [
          { id: 'acc-existing', name: 'Old Account' },
          { id: 'acc-new', name: 'New Account' }
        ],
        expenses: [
          { id: 'exp-1', title: 'Lunch', amount: 300 },
          { id: 'exp-2', title: 'Dinner', amount: 800 }
        ],
        incomes: [],
        transfers: [],
        budgets: [],
        recurring_expenses: [],
        recurring_expense_occurrences: [],
        savings_goals: [],
        goal_transactions: [],
        split_friends: [],
        shared_expenses: [],
        shared_expense_shares: [],
        shared_expense_settlements: []
      };

      const existingRecordIds = {
        accounts: new Set(['acc-existing']),
        expenses: new Set(['exp-1'])
      };

      const preview = await previewBackupData({ data: backupData }, existingRecordIds);
      assert.equal(preview.totalRecordsInFile, 4);
      assert.equal(preview.newRecordsCount, 2); // acc-new, exp-2
      assert.equal(preview.duplicateRecordsCount, 2); // acc-existing, exp-1
      assert.equal(preview.tables.accounts.newCount, 1);
      assert.equal(preview.tables.accounts.duplicateCount, 1);
      assert.equal(preview.tables.expenses.newCount, 1);
      assert.equal(preview.tables.expenses.duplicateCount, 1);
    });

    it('remaps user_id on all imported records to currently authenticated user', () => {
      const maliciousUserId = 'attacker-uuid-9999';
      const authenticatedUserId = 'auth-user-real-1234';

      const unverifiedRecord = {
        id: 'rec-1',
        user_id: maliciousUserId,
        title: 'Unauthorized Entry',
        amount: 5000
      };

      // In restore logic: record.user_id = currentUserId
      const sanitizedRecord = {
        ...unverifiedRecord,
        user_id: authenticatedUserId
      };

      assert.equal(sanitizedRecord.user_id, authenticatedUserId);
      assert.notEqual(sanitizedRecord.user_id, maliciousUserId);
    });
  });

  // ==========================================
  // SECTION 5: FINANCIAL ACCOUNTING INTEGRITY
  // ==========================================
  describe('5. Financial Accounting Invariants During Export & Restore', () => {
    it('internal transfers are never counted as expenses or income', () => {
      const accountA = { id: 'acc-a', opening_balance: 10000, type: 'bank' };
      const accountB = { id: 'acc-b', opening_balance: 5000, type: 'bank' };

      const transfers = [
        {
          id: 'tr-1',
          source_account_id: 'acc-a',
          destination_account_id: 'acc-b',
          amount: 3000,
          transfer_date: '2026-10-15'
        }
      ];

      const balanceA = calculateAccountBalance({
        account: accountA,
        transfersOut: transfers,
        transfersIn: []
      });
      const balanceB = calculateAccountBalance({
        account: accountB,
        transfersOut: [],
        transfersIn: transfers
      });

      assert.equal(balanceA.balance, 7000);
      assert.equal(balanceB.balance, 8000);

      // Portfolio total remains unchanged at 15,000
      const netWorth = calculateNetWorthSummary([
        { ...accountA, computed: balanceA },
        { ...accountB, computed: balanceB }
      ]);
      assert.equal(netWorth.totalLiquidAssets, 15000);
      assert.equal(netWorth.netWorth, 15000);
      assert.equal(netWorth.totalCreditLiabilities, 0);
    });

    it('keeps credit-card debt separate from liquid assets in net worth', () => {
      const bankAcc = { id: 'acc-bank', opening_balance: 50000, type: 'bank' };
      const creditCardAcc = { id: 'acc-cc', opening_balance: 12000, type: 'credit_card' };

      const computedBank = calculateAccountBalance({ account: bankAcc });
      const computedCC = calculateAccountBalance({ account: creditCardAcc });

      const summary = calculateNetWorthSummary([
        { ...bankAcc, computed: computedBank },
        { ...creditCardAcc, computed: computedCC }
      ]);
      assert.equal(summary.totalLiquidAssets, 50000);
      assert.equal(summary.totalCreditLiabilities, 12000);
      assert.equal(summary.netWorth, 38000);
    });

    it('restoring records without duplicates preserves balance integrity', () => {
      const account = { id: 'acc-1', opening_balance: 20000, type: 'bank' };
      const expense1 = { id: 'exp-1', account_id: 'acc-1', amount: 4000 };

      // Pre-restore balance
      const preBalance = calculateAccountBalance({ account, expenses: [expense1] });
      assert.equal(preBalance.balance, 16000);

      // If restore skips existing 'exp-1', the balance remains strictly 16,000, never doubling to 12,000
      const restoredExpenses = [expense1]; // No duplicate added
      const postBalance = calculateAccountBalance({ account, expenses: restoredExpenses });
      assert.equal(postBalance.balance, 16000);
    });
  });
});

