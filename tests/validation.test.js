import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateExpenseInput,
  getTodayLocalDateString,
  getCurrentWeekRange,
  getCurrentMonthRange,
  formatCurrencyINR,
  ALLOWED_CATEGORIES,
  ALLOWED_PAYMENT_METHODS
} from '../src/utils/dateUtils.js';

describe('PaisaTrack Phase 3 Financial Validation Tests', () => {
  describe('Expense Input Validation', () => {
    it('validates a correct expense payload', () => {
      const payload = {
        amount: 450.50,
        category: 'Food',
        expense_date: '2026-10-09',
        payment_method: 'UPI',
        description: 'Dinner with team'
      };
      const result = validateExpenseInput(payload);
      assert.strictEqual(result.isValid, true);
      assert.deepStrictEqual(result.errors, {});
    });

    it('rejects zero, negative, and non-numeric amounts', () => {
      assert.strictEqual(validateExpenseInput({ amount: 0, category: 'Food', expense_date: '2026-10-09', payment_method: 'UPI' }).isValid, false);
      assert.strictEqual(validateExpenseInput({ amount: -50, category: 'Food', expense_date: '2026-10-09', payment_method: 'UPI' }).isValid, false);
      assert.strictEqual(validateExpenseInput({ amount: 'invalid-num', category: 'Food', expense_date: '2026-10-09', payment_method: 'UPI' }).isValid, false);
      assert.strictEqual(validateExpenseInput({ amount: '', category: 'Food', expense_date: '2026-10-09', payment_method: 'UPI' }).isValid, false);
    });

    it('validates category against allowed category enum list', () => {
      ALLOWED_CATEGORIES.forEach((cat) => {
        const result = validateExpenseInput({
          amount: 100,
          category: cat,
          expense_date: '2026-10-09',
          payment_method: 'Cash'
        });
        assert.strictEqual(result.isValid, true, `Category ${cat} should be valid`);
      });

      const invalidResult = validateExpenseInput({
        amount: 100,
        category: 'Cryptocurrency Gambling',
        expense_date: '2026-10-09',
        payment_method: 'Cash'
      });
      assert.strictEqual(invalidResult.isValid, false);
      assert.match(invalidResult.errors.category, /Invalid category/);
    });

    it('validates payment method against allowed methods enum list', () => {
      ALLOWED_PAYMENT_METHODS.forEach((method) => {
        const result = validateExpenseInput({
          amount: 100,
          category: 'Shopping',
          expense_date: '2026-10-09',
          payment_method: method
        });
        assert.strictEqual(result.isValid, true, `Payment method ${method} should be valid`);
      });

      const invalidResult = validateExpenseInput({
        amount: 100,
        category: 'Shopping',
        expense_date: '2026-10-09',
        payment_method: 'Barter System'
      });
      assert.strictEqual(invalidResult.isValid, false);
      assert.match(invalidResult.errors.payment_method, /Invalid payment method/);
    });

    it('validates expense date calendar validity', () => {
      assert.strictEqual(validateExpenseInput({
        amount: 100,
        category: 'Bills',
        expense_date: '2026-10-09',
        payment_method: 'UPI'
      }).isValid, true);

      // Invalid calendar date (Feb 30)
      const feb30Result = validateExpenseInput({
        amount: 100,
        category: 'Bills',
        expense_date: '2026-02-30',
        payment_method: 'UPI'
      });
      assert.strictEqual(feb30Result.isValid, false);
      assert.match(feb30Result.errors.expense_date, /Invalid calendar date/);
    });

    it('rejects descriptions exceeding 500 characters', () => {
      const longDescription = 'A'.repeat(501);
      const result = validateExpenseInput({
        amount: 100,
        category: 'Bills',
        expense_date: '2026-10-09',
        payment_method: 'UPI',
        description: longDescription
      });
      assert.strictEqual(result.isValid, false);
      assert.match(result.errors.description, /cannot exceed 500 characters/);
    });
  });

  describe('Date Range & Boundary Calculations', () => {
    it('returns local date in YYYY-MM-DD format', () => {
      const today = getTodayLocalDateString();
      assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    });

    it('computes current week starting on Monday and ending on Sunday with 7 days', () => {
      const week = getCurrentWeekRange(new Date('2026-10-09')); // Friday
      assert.strictEqual(week.startDate, '2026-10-05'); // Monday
      assert.strictEqual(week.endDate, '2026-10-11'); // Sunday
      assert.strictEqual(week.days.length, 7);
      assert.strictEqual(week.days[0].name, 'Mon');
      assert.strictEqual(week.days[6].name, 'Sun');
    });

    it('computes current month starting on the 1st and ending on the last day', () => {
      const octMonth = getCurrentMonthRange(new Date('2026-10-09'));
      assert.strictEqual(octMonth.startDate, '2026-10-01');
      assert.strictEqual(octMonth.endDate, '2026-10-31');
      assert.strictEqual(octMonth.monthName, 'October');
      assert.strictEqual(octMonth.year, 2026);
    });
  });

  describe('Currency Formatting', () => {
    it('formats Indian Rupee amounts accurately', () => {
      const formatted = formatCurrencyINR(1250.5);
      assert.ok(formatted.includes('1,250.50') || formatted.includes('1,250.5'));
    });
  });
});
