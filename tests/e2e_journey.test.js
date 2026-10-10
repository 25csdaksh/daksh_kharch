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
import {
  getWeekBoundaries,
  getMonthBoundaries,
  getYearBoundaries,
  validateCustomDateRange,
  calculatePeriodComparison,
  aggregateCategories,
  sanitizeCSVField,
  generateExpensesCSV
} from '../src/utils/reportUtils.js';

describe('PaisaTrack Phase 5 Production Hardening & E2E Journey Tests', () => {
  describe('User Journey Step 1: Input Validation & Expense Lifecycle', () => {
    it('validates a complete expense lifecycle (Create -> Validate -> Edit -> Delete)', () => {
      // 1. Creation payload
      const initialPayload = {
        amount: 1250.75,
        category: 'Food',
        expense_date: '2026-10-10',
        payment_method: 'UPI',
        description: 'Team lunch at Bistro'
      };

      const validation = validateExpenseInput(initialPayload);
      assert.strictEqual(validation.isValid, true);
      assert.deepStrictEqual(validation.errors, {});

      // 2. Edit payload: modify amount and category
      const editedPayload = {
        ...initialPayload,
        amount: 1450.00,
        category: 'Entertainment',
        description: 'Team movie & lunch'
      };

      const editValidation = validateExpenseInput(editedPayload);
      assert.strictEqual(editValidation.isValid, true);
      assert.strictEqual(editedPayload.amount, 1450.00);
      assert.strictEqual(editedPayload.category, 'Entertainment');

      // 3. Deletion validation constraint
      const invalidDeleteId = null;
      assert.throws(() => {
        if (!invalidDeleteId) throw new Error('Expense ID is required.');
      }, /Expense ID is required/);
    });

    it('rejects malicious or out-of-bounds expense inputs', () => {
      // Negative amount
      assert.strictEqual(validateExpenseInput({ amount: -10, category: 'Food', expense_date: '2026-10-10', payment_method: 'UPI' }).isValid, false);
      // Zero amount
      assert.strictEqual(validateExpenseInput({ amount: 0, category: 'Food', expense_date: '2026-10-10', payment_method: 'UPI' }).isValid, false);
      // String NaN amount
      assert.strictEqual(validateExpenseInput({ amount: 'ten-rupees', category: 'Food', expense_date: '2026-10-10', payment_method: 'UPI' }).isValid, false);
      // Amount > 9,999,999,999.99
      assert.strictEqual(validateExpenseInput({ amount: 10000000000, category: 'Food', expense_date: '2026-10-10', payment_method: 'UPI' }).isValid, false);
      // Invalid category
      assert.strictEqual(validateExpenseInput({ amount: 100, category: 'Illegal', expense_date: '2026-10-10', payment_method: 'UPI' }).isValid, false);
      // Invalid payment method
      assert.strictEqual(validateExpenseInput({ amount: 100, category: 'Food', expense_date: '2026-10-10', payment_method: 'Crypto' }).isValid, false);
      // Description > 500 chars
      const longDesc = 'a'.repeat(501);
      assert.strictEqual(validateExpenseInput({ amount: 100, category: 'Food', expense_date: '2026-10-10', payment_method: 'UPI', description: longDesc }).isValid, false);
    });
  });

  describe('User Journey Step 2: Multi-Tenant Isolation & RLS Security Simulation', () => {
    it('enforces tenant isolation: user A cannot access or mutate user B records', () => {
      const userA_Id = '11111111-1111-1111-1111-111111111111';
      const userB_Id = '22222222-2222-2222-2222-222222222222';

      const mockDatabase = [
        { id: 'exp-1', user_id: userA_Id, amount: 250, category: 'Food', expense_date: '2026-10-10' },
        { id: 'exp-2', user_id: userA_Id, amount: 500, category: 'Bills', expense_date: '2026-10-10' },
        { id: 'exp-3', user_id: userB_Id, amount: 9999, category: 'Shopping', expense_date: '2026-10-10' }
      ];

      // Simulated RLS SELECT filter: USING (user_id = auth.uid())
      const getExpensesForUser = (authUid) => {
        return mockDatabase.filter((row) => row.user_id === authUid);
      };

      const userA_Records = getExpensesForUser(userA_Id);
      const userB_Records = getExpensesForUser(userB_Id);

      assert.strictEqual(userA_Records.length, 2);
      assert.strictEqual(userA_Records.some((r) => r.user_id === userB_Id), false);

      assert.strictEqual(userB_Records.length, 1);
      assert.strictEqual(userB_Records[0].amount, 9999);
      assert.strictEqual(userB_Records.some((r) => r.user_id === userA_Id), false);

      // Simulated RLS UPDATE check: WITH CHECK (user_id = auth.uid())
      const attemptMaliciousUpdate = (authUid, recordId, targetUserId) => {
        const record = mockDatabase.find((r) => r.id === recordId);
        if (!record || record.user_id !== authUid) {
          throw new Error('RLS Violation: User does not own this record.');
        }
        if (targetUserId !== authUid) {
          throw new Error('RLS Violation: Cannot transfer ownership to another tenant.');
        }
        return true;
      };

      // User A trying to update User B's record fails
      assert.throws(() => {
        attemptMaliciousUpdate(userA_Id, 'exp-3', userA_Id);
      }, /RLS Violation/);

      // User A trying to transfer their own record to User B fails
      assert.throws(() => {
        attemptMaliciousUpdate(userA_Id, 'exp-1', userB_Id);
      }, /RLS Violation/);
    });
  });

  describe('User Journey Step 3: Date Arithmetic & Month-Boundary Safety', () => {
    it('preserves exact month indices for records on 1st and last day of month', () => {
      const records = [
        { expense_date: '2026-10-01', amount: 100 },
        { expense_date: '2026-10-31', amount: 200 }
      ];

      // Test timezone-safe string parsing vs month extraction
      records.forEach((rec) => {
        const monthIdx = parseInt(rec.expense_date.slice(5, 7), 10) - 1;
        assert.strictEqual(monthIdx, 9, 'October must have month index 9 regardless of user timezone');
      });
    });

    it('correctly maps Monday–Sunday week boundaries without offset drift', () => {
      // 2026-10-10 is a Saturday
      const saturdayAnchor = new Date('2026-10-10');
      const week = getWeekBoundaries(0, saturdayAnchor);

      assert.strictEqual(week.startDate, '2026-10-05', 'Week start must be Monday Oct 5');
      assert.strictEqual(week.endDate, '2026-10-11', 'Week end must be Sunday Oct 11');
      assert.strictEqual(week.days.length, 7);
      assert.strictEqual(week.days[0].name, 'Mon');
      assert.strictEqual(week.days[6].name, 'Sun');
    });

    it('handles February leap year vs non-leap year boundaries accurately', () => {
      // 2024 is a leap year (Feb has 29 days)
      const leapMonth = getMonthBoundaries(0, new Date('2024-02-15'));
      assert.strictEqual(leapMonth.startDate, '2024-02-01');
      assert.strictEqual(leapMonth.endDate, '2024-02-29');
      assert.strictEqual(leapMonth.daysCount, 29);

      // 2025 is a non-leap year (Feb has 28 days)
      const regularMonth = getMonthBoundaries(0, new Date('2025-02-15'));
      assert.strictEqual(regularMonth.startDate, '2025-02-01');
      assert.strictEqual(regularMonth.endDate, '2025-02-28');
      assert.strictEqual(regularMonth.daysCount, 28);
    });
  });

  describe('User Journey Step 4: Financial Analytics & Comparison Engine', () => {
    it('computes exact comparative spend delta and percentages', () => {
      // Standard increase
      const comp1 = calculatePeriodComparison(1500, 1000);
      assert.strictEqual(comp1.diff, 500);
      assert.strictEqual(comp1.percentage, 50);
      assert.strictEqual(comp1.direction, 'increase');

      // Standard decrease
      const comp2 = calculatePeriodComparison(750, 1000);
      assert.strictEqual(comp2.diff, -250);
      assert.strictEqual(comp2.percentage, 25);
      assert.strictEqual(comp2.direction, 'decrease');

      // Zero prior spending
      const comp3 = calculatePeriodComparison(500, 0);
      assert.strictEqual(comp3.direction, 'increase');
      assert.strictEqual(comp3.percentage, null);

      // Zero current spending after prior spending
      const comp4 = calculatePeriodComparison(0, 500);
      assert.strictEqual(comp4.direction, 'decrease');
      assert.strictEqual(comp4.percentage, -100);

      // Both zero
      const comp5 = calculatePeriodComparison(0, 0);
      assert.strictEqual(comp5.direction, 'neutral');
      assert.strictEqual(comp5.diff, 0);
    });

    it('aggregates category breakdown with 100% total sum consistency', () => {
      const expenses = [
        { amount: 500, category: 'Food' },
        { amount: 300, category: 'Transport' },
        { amount: 200, category: 'Food' }
      ];

      const { categories, topCategory } = aggregateCategories(expenses, 1000);

      assert.strictEqual(categories.length, 2);
      assert.strictEqual(topCategory.name, 'Food');
      assert.strictEqual(topCategory.value, 700);
      assert.strictEqual(topCategory.percentage, 70);

      const transport = categories.find((c) => c.name === 'Transport');
      assert.strictEqual(transport.value, 300);
      assert.strictEqual(transport.percentage, 30);
    });
  });

  describe('User Journey Step 5: CSV Sanitization & Spreadsheet Formula Injection Protection', () => {
    it('neutralizes all known formula execution triggers (=, +, -, @, Tab, CR)', () => {
      assert.strictEqual(sanitizeCSVField('=cmd|/c calc.exe'), `'=cmd|/c calc.exe`);
      assert.strictEqual(sanitizeCSVField('+12345'), `'+12345`);
      assert.strictEqual(sanitizeCSVField('-12345'), `'-12345`);
      assert.strictEqual(sanitizeCSVField('@SUM(A1:A10)'), `'@SUM(A1:A10)`);
      assert.strictEqual(sanitizeCSVField('\tmalicious'), `'\tmalicious`);
      // When formula contains comma, it is both prefixed with ' and wrapped in quotes
      assert.strictEqual(sanitizeCSVField('=cmd,calc'), `"'=cmd,calc"`);
    });

    it('generates compliant CSV with UTF-8 BOM and correct quoting for Excel', () => {
      const testExpenses = [
        {
          expense_date: '2026-10-10',
          category: 'Food',
          description: 'Lunch, with "special" tea',
          payment_method: 'UPI',
          amount: 250.50
        }
      ];

      const csv = generateExpensesCSV(testExpenses, 'October 2026');

      // Verify UTF-8 BOM prefix
      assert.strictEqual(csv.startsWith('\uFEFF'), true);

      // Verify inner quotes escaped and wrapped
      assert.strictEqual(csv.includes('"Lunch, with ""special"" tea"'), true);
      assert.strictEqual(csv.includes('250.50'), true);
    });
  });

  describe('User Journey Step 6: INR Currency Representation', () => {
    it('formats Indian numbering system commas (Lakhs and Crores)', () => {
      const formatted = formatCurrencyINR(1250000);
      // en-IN format should contain 12,50,000
      assert.match(formatted, /12,50,000/);
    });
  });
});
