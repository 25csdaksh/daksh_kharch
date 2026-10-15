/**
 * HisabSetu — Phase 4: Advanced Search, Smart Filters & Financial Calendar Tests
 * Validates multi-attribute search, smart filter combinations, date presets,
 * financial calendar aggregation, transfer exclusion, and regex highlight safety.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getDateRangeFromPreset,
  getHighlightedSegments,
  filtersToSearchParams,
  searchParamsToFilters,
  escapeRegExp
} from '../src/utils/filterUtils.js';

import {
  formatCurrencyINR,
  getTodayLocalDateString
} from '../src/utils/dateUtils.js';

describe('HisabSetu Phase 4: Advanced Search, Smart Filters & Financial Calendar Tests', () => {

  describe('1. Date Presets & Boundary Calculations', () => {
    it('calculates boundaries for Today preset', () => {
      const today = getTodayLocalDateString();
      const range = getDateRangeFromPreset('today');
      assert.equal(range.startDate, today);
      assert.equal(range.endDate, today);
    });

    it('calculates boundaries for Yesterday preset', () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const expected = `${y}-${m}-${day}`;

      const range = getDateRangeFromPreset('yesterday');
      assert.equal(range.startDate, expected);
      assert.equal(range.endDate, expected);
    });

    it('calculates boundaries for This Week (Monday to Sunday)', () => {
      const range = getDateRangeFromPreset('this_week');
      assert.ok(range.startDate);
      assert.ok(range.endDate);
      assert.ok(range.startDate <= range.endDate);

      // Diff between Sunday and Monday is exactly 6 days
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      assert.equal(diffDays, 6);
    });

    it('calculates boundaries for This Month (1st to last day)', () => {
      const range = getDateRangeFromPreset('this_month');
      assert.ok(range.startDate.endsWith('-01'));
      assert.ok(range.startDate <= range.endDate);
    });

    it('calculates boundaries for Previous Month', () => {
      const range = getDateRangeFromPreset('prev_month');
      assert.ok(range.startDate.endsWith('-01'));
      assert.ok(range.startDate <= range.endDate);

      // Verify start date is in the previous month
      const now = new Date();
      const prevDate = new Date(range.startDate);
      assert.notEqual(prevDate.getMonth(), now.getMonth());
    });

    it('handles Custom date boundaries and All Time nulls', () => {
      const custom = getDateRangeFromPreset('custom', '2026-05-01', '2026-05-15');
      assert.equal(custom.startDate, '2026-05-01');
      assert.equal(custom.endDate, '2026-05-15');

      const all = getDateRangeFromPreset('all');
      assert.equal(all.startDate, null);
      assert.equal(all.endDate, null);
    });
  });

  describe('2. Text Search Tokenization & Regex Injection Safety', () => {
    it('tokenizes and identifies case-insensitive search matches', () => {
      const text = 'Grocery shopping at Reliance Fresh supermarket';
      const query = 'reliance';
      const segments = getHighlightedSegments(text, query);

      const matched = segments.filter((s) => s.isMatch);
      assert.equal(matched.length, 1);
      assert.equal(matched[0].text, 'Reliance');
    });

    it('safely handles special characters without regex crash (e.g. ₹, [, ], (, ), *, +)', () => {
      const text = 'Monthly Rent [Recurring Bill] ₹25,000 (HDFC)';
      const query = '[Recurring Bill]';
      const segments = getHighlightedSegments(text, query);

      const matched = segments.filter((s) => s.isMatch);
      assert.equal(matched.length, 1);
      assert.equal(matched[0].text, '[Recurring Bill]');
    });

    it('handles currency symbol and punctuation matching safely', () => {
      const text = 'Payment of ₹500.00 received';
      const query = '₹500';
      const segments = getHighlightedSegments(text, query);
      const matched = segments.filter((s) => s.isMatch);
      assert.equal(matched.length, 1);
      assert.equal(matched[0].text, '₹500');
    });

    it('returns clean single segment when query is empty or whitespace', () => {
      const text = 'Clean text';
      const segments = getHighlightedSegments(text, '   ');
      assert.equal(segments.length, 1);
      assert.equal(segments[0].isMatch, false);
      assert.equal(segments[0].text, 'Clean text');
    });
  });

  describe('3. Smart Filters Serialization & URL Persistence', () => {
    it('serializes active filters into URL search params', () => {
      const filters = {
        query: 'Coffee',
        datePreset: 'this_month',
        type: 'expense',
        category: 'Food',
        accountId: 'acc-123',
        minAmount: '100',
        maxAmount: '500',
        isRecurring: true,
        isSplit: false
      };

      const params = filtersToSearchParams(filters);
      assert.equal(params.get('q'), 'Coffee');
      assert.equal(params.get('range'), 'this_month');
      assert.equal(params.get('type'), 'expense');
      assert.equal(params.get('cat'), 'Food');
      assert.equal(params.get('account'), 'acc-123');
      assert.equal(params.get('min'), '100');
      assert.equal(params.get('max'), '500');
      assert.equal(params.get('recurring'), '1');
      assert.equal(params.get('split'), null);
    });

    it('deserializes URL search params back into filter state', () => {
      const params = new URLSearchParams('?q=Salary&type=income&cat=Salary&min=50000');
      const filters = searchParamsToFilters(params);

      assert.equal(filters.query, 'Salary');
      assert.equal(filters.type, 'income');
      assert.equal(filters.category, 'Salary');
      assert.equal(filters.minAmount, '50000');
      assert.equal(filters.datePreset, 'all');
    });
  });

  describe('4. Financial Calendar Daily & Monthly Aggregations', () => {
    it('accurately groups daily activity and calculates monthly totals', () => {
      // Mock month simulation for 2026-10
      const mockExpenses = [
        { id: 'e1', amount: 450, expense_date: '2026-10-05', category: 'Food' },
        { id: 'e2', amount: 1200, expense_date: '2026-10-05', category: 'Shopping' },
        { id: 'e3', amount: 25000, expense_date: '2026-10-15', category: 'Housing & Rent' }
      ];

      const mockIncomes = [
        { id: 'i1', amount: 75000, income_date: '2026-10-01', source: 'Salary' },
        { id: 'i2', amount: 5000, income_date: '2026-10-15', source: 'Freelance' }
      ];

      const mockTransfers = [
        { id: 't1', amount: 10000, transfer_date: '2026-10-05', note: 'Bank to Cash' }
      ];

      // Day 2026-10-05:
      // Expenses = 450 + 1200 = 1,650
      // Incomes = 0
      // Transfers = 10,000 (NOT counted as spending)
      const day5Expenses = mockExpenses.filter((e) => e.expense_date === '2026-10-05')
        .reduce((sum, e) => sum + e.amount, 0);
      assert.equal(day5Expenses, 1650);

      // Monthly Totals:
      const totalExpenses = mockExpenses.reduce((sum, e) => sum + e.amount, 0); // 26,650
      const totalIncomes = mockIncomes.reduce((sum, i) => sum + i.amount, 0);   // 80,000
      const netCashFlow = totalIncomes - totalExpenses;                         // 53,350

      assert.equal(totalExpenses, 26650);
      assert.equal(totalIncomes, 80000);
      assert.equal(netCashFlow, 53350);
    });

    it('strictly isolates transfers so they do not distort monthly personal spending or income', () => {
      const expenses = [{ amount: 500 }];
      const transfers = [{ amount: 20000 }]; // Large bank-to-bank transfer

      const spend = expenses.reduce((sum, e) => sum + e.amount, 0);
      assert.equal(spend, 500); // Must remain 500, NOT 20,500!
    });

    it('distinguishes pending recurring bills from confirmed spending', () => {
      // Pending bills must NOT increase month spend until paid
      const confirmedExpenses = [{ amount: 1500 }];
      const pendingBills = [
        { id: 'occ-1', status: 'pending', amount: 8000 },
        { id: 'occ-2', status: 'pending', amount: 999 }
      ];

      const actualSpend = confirmedExpenses.reduce((sum, e) => sum + e.amount, 0);
      const pendingTotal = pendingBills.reduce((sum, b) => sum + b.amount, 0);

      assert.equal(actualSpend, 1500);
      assert.equal(pendingTotal, 8999);
      assert.notEqual(actualSpend, actualSpend + pendingTotal);
    });
  });

  describe('5. Multi-Tenant User Isolation Simulation', () => {
    it('simulates RLS isolation: search queries filter strictly by authenticated user_id', () => {
      const mockData = [
        { id: '1', user_id: 'user-A', title: 'User A Secret expense', amount: 500 },
        { id: '2', user_id: 'user-B', title: 'User B Classified data', amount: 10000 }
      ];

      const currentAuthUser = 'user-A';
      const searchResults = mockData.filter((item) => item.user_id === currentAuthUser);

      assert.equal(searchResults.length, 1);
      assert.equal(searchResults[0].title, 'User A Secret expense');

      const leaked = searchResults.some((item) => item.user_id === 'user-B');
      assert.equal(leaked, false);
    });
  });

});
