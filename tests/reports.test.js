import { describe, it } from 'node:test';
import assert from 'node:assert';
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
import { formatCurrencyINR } from '../src/utils/dateUtils.js';

describe('PaisaTrack Phase 4 Financial Reports & Analytics Tests', () => {
  describe('Week Boundary Calculations', () => {
    it('calculates Monday–Sunday boundaries for current week', () => {
      // Oct 09, 2026 is a Friday
      const anchor = new Date('2026-10-09');
      const week = getWeekBoundaries(0, anchor);
      assert.strictEqual(week.startDate, '2026-10-05'); // Monday
      assert.strictEqual(week.endDate, '2026-10-11'); // Sunday
      assert.strictEqual(week.days.length, 7);
      assert.strictEqual(week.days[0].name, 'Mon');
      assert.strictEqual(week.days[6].name, 'Sun');
      assert.strictEqual(week.prevStartDate, '2026-09-28');
      assert.strictEqual(week.prevEndDate, '2026-10-04');
    });

    it('calculates previous and next week offsets accurately', () => {
      const anchor = new Date('2026-10-09');
      const prevWeek = getWeekBoundaries(-1, anchor);
      assert.strictEqual(prevWeek.startDate, '2026-09-28');
      assert.strictEqual(prevWeek.endDate, '2026-10-04');

      const nextWeek = getWeekBoundaries(1, anchor);
      assert.strictEqual(nextWeek.startDate, '2026-10-12');
      assert.strictEqual(nextWeek.endDate, '2026-10-18');
    });
  });

  describe('Month Boundary & Leap Year Handling', () => {
    it('handles standard 31-day months (e.g. October 2026)', () => {
      const anchor = new Date('2026-10-09');
      const month = getMonthBoundaries(0, anchor);
      assert.strictEqual(month.startDate, '2026-10-01');
      assert.strictEqual(month.endDate, '2026-10-31');
      assert.strictEqual(month.daysCount, 31);
      assert.strictEqual(month.days.length, 31);
      assert.strictEqual(month.prevStartDate, '2026-09-01');
      assert.strictEqual(month.prevEndDate, '2026-09-30');
    });

    it('handles standard 30-day months (e.g. April 2026)', () => {
      const anchor = new Date('2026-04-15');
      const month = getMonthBoundaries(0, anchor);
      assert.strictEqual(month.startDate, '2026-04-01');
      assert.strictEqual(month.endDate, '2026-04-30');
      assert.strictEqual(month.daysCount, 30);
    });

    it('handles February in non-leap year (28 days in 2025)', () => {
      const anchor = new Date('2025-02-10');
      const month = getMonthBoundaries(0, anchor);
      assert.strictEqual(month.startDate, '2025-02-01');
      assert.strictEqual(month.endDate, '2025-02-28');
      assert.strictEqual(month.daysCount, 28);
    });

    it('handles February in leap year (29 days in 2024)', () => {
      const anchor = new Date('2024-02-10');
      const month = getMonthBoundaries(0, anchor);
      assert.strictEqual(month.startDate, '2024-02-01');
      assert.strictEqual(month.endDate, '2024-02-29');
      assert.strictEqual(month.daysCount, 29);
    });
  });

  describe('Year Boundary Calculations', () => {
    it('calculates full 12-month calendar boundaries', () => {
      const anchor = new Date('2026-10-09');
      const year = getYearBoundaries(0, anchor);
      assert.strictEqual(year.startDate, '2026-01-01');
      assert.strictEqual(year.endDate, '2026-12-31');
      assert.strictEqual(year.months.length, 12);
      assert.strictEqual(year.months[0].name, 'Jan');
      assert.strictEqual(year.months[11].name, 'Dec');
      assert.strictEqual(year.prevStartDate, '2025-01-01');
      assert.strictEqual(year.prevEndDate, '2025-12-31');
    });
  });

  describe('Custom Date Range Validation', () => {
    it('accepts valid date ranges', () => {
      const res = validateCustomDateRange('2026-10-01', '2026-10-15');
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.daysCount, 15);
    });

    it('rejects inverted date ranges (start after end)', () => {
      const res = validateCustomDateRange('2026-10-15', '2026-10-01');
      assert.strictEqual(res.isValid, false);
      assert.match(res.error, /cannot be earlier than start date/);
    });

    it('rejects invalid date formats', () => {
      const res = validateCustomDateRange('invalid', '2026-10-15');
      assert.strictEqual(res.isValid, false);
    });
  });

  describe('Comparative Period Analytics', () => {
    it('handles zero spend in both periods', () => {
      const comp = calculatePeriodComparison(0, 0);
      assert.strictEqual(comp.diff, 0);
      assert.strictEqual(comp.percentage, 0);
      assert.strictEqual(comp.direction, 'neutral');
    });

    it('handles zero spend in previous period and positive current spend', () => {
      const comp = calculatePeriodComparison(500, 0);
      assert.strictEqual(comp.diff, 500);
      assert.strictEqual(comp.percentage, null);
      assert.strictEqual(comp.direction, 'increase');
      assert.match(comp.label, /No prior spending/);
    });

    it('handles positive spend in previous period and zero current spend', () => {
      const comp = calculatePeriodComparison(0, 500);
      assert.strictEqual(comp.diff, -500);
      assert.strictEqual(comp.percentage, -100);
      assert.strictEqual(comp.direction, 'decrease');
    });

    it('calculates percentage increase correctly', () => {
      const comp = calculatePeriodComparison(1500, 1000);
      assert.strictEqual(comp.diff, 500);
      assert.strictEqual(comp.percentage, 50);
      assert.strictEqual(comp.direction, 'increase');
    });

    it('calculates percentage decrease correctly', () => {
      const comp = calculatePeriodComparison(800, 1000);
      assert.strictEqual(comp.diff, -200);
      assert.strictEqual(comp.percentage, 20);
      assert.strictEqual(comp.direction, 'decrease');
    });
  });

  describe('Category Aggregation', () => {
    it('aggregates category percentages and top category correctly', () => {
      const expenses = [
        { amount: 600, category: 'Food' },
        { amount: 400, category: 'Transport' },
        { amount: 200, category: 'Food' }
      ];
      const res = aggregateCategories(expenses, 1200);
      assert.strictEqual(res.categories.length, 2);
      assert.strictEqual(res.topCategory.name, 'Food');
      assert.strictEqual(res.topCategory.value, 800);
      assert.strictEqual(res.topCategory.percentage, 66.7);
    });

    it('handles empty expense arrays cleanly', () => {
      const res = aggregateCategories([], 0);
      assert.strictEqual(res.categories.length, 0);
      assert.strictEqual(res.topCategory, null);
    });
  });

  describe('CSV Sanitization & Security Protection', () => {
    it('mitigates spreadsheet formula injection by prefixing single quotes', () => {
      assert.strictEqual(sanitizeCSVField('=SUM(A1:A10)'), "'=SUM(A1:A10)");
      assert.strictEqual(sanitizeCSVField('+cmd|/C calc'), "'+cmd|/C calc");
      assert.strictEqual(sanitizeCSVField('-10% discount'), "'-10% discount");
      assert.strictEqual(sanitizeCSVField('@SUM(1+1)'), "'@SUM(1+1)");
    });

    it('escapes quotes and wraps fields containing commas', () => {
      assert.strictEqual(sanitizeCSVField('Grocery, Market'), '"Grocery, Market"');
      assert.strictEqual(sanitizeCSVField('Dinner "Special"'), '"Dinner ""Special"""');
    });

    it('generates compliant CSV with UTF-8 BOM', () => {
      const expenses = [
        {
          expense_date: '2026-10-09',
          category: 'Food',
          description: 'Team Lunch, Pizza',
          payment_method: 'UPI',
          amount: 850
        }
      ];
      const csv = generateExpensesCSV(expenses, 'Weekly Report');
      assert.ok(csv.startsWith('\uFEFFDate,Category,Description,Payment Method,Amount (INR)'));
      assert.ok(csv.includes('2026-10-09,Food,"Team Lunch, Pizza",UPI,850.00'));
    });
  });

  describe('Currency Representation', () => {
    it('formats Indian Rupee representation correctly', () => {
      const res = formatCurrencyINR(25400);
      assert.ok(res.includes('25,400'));
    });
  });
});
