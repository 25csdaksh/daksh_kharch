import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateBudgetInput,
  calculateBudgetMetrics,
  reconcileMonthlyBudget,
  getMonthDateRange,
  getNextMonthYear,
  getPrevMonthYear,
  MONTH_NAMES
} from '../src/utils/budgetUtils.js';
import { ALLOWED_CATEGORIES, formatCurrencyINR } from '../src/utils/dateUtils.js';

describe('HisabSetu Phase 1: Smart Budget Manager Tests', () => {
  describe('1. Budget Amount & Input Validation', () => {
    it('validates a correct total monthly budget payload', () => {
      const payload = {
        amount: 35000,
        month: 10,
        year: 2026,
        category: null
      };
      const result = validateBudgetInput(payload);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.sanitized.amount, 35000);
      assert.strictEqual(result.sanitized.month, 10);
      assert.strictEqual(result.sanitized.year, 2026);
      assert.strictEqual(result.sanitized.category, null);
    });

    it('validates a correct category-specific monthly budget payload', () => {
      const payload = {
        amount: 8500.50,
        month: 10,
        year: 2026,
        category: 'Food'
      };
      const result = validateBudgetInput(payload);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.sanitized.amount, 8500.50);
      assert.strictEqual(result.sanitized.category, 'Food');
    });

    it('rejects zero, negative, NaN, and out-of-bounds budget amounts', () => {
      assert.strictEqual(validateBudgetInput({ amount: 0, month: 10, year: 2026 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: -500, month: 10, year: 2026 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: 'invalid-amount', month: 10, year: 2026 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: '', month: 10, year: 2026 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: null, month: 10, year: 2026 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: 10000000000, month: 10, year: 2026 }).isValid, false);
    });

    it('validates month boundaries (must be integer 1 to 12)', () => {
      for (let m = 1; m <= 12; m++) {
        assert.strictEqual(validateBudgetInput({ amount: 1000, month: m, year: 2026 }).isValid, true);
      }

      assert.strictEqual(validateBudgetInput({ amount: 1000, month: 0, year: 2026 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: 1000, month: 13, year: 2026 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: 1000, month: 5.5, year: 2026 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: 1000, month: 'invalid', year: 2026 }).isValid, false);
    });

    it('validates year boundaries (must be 4-digit year between 2000 and 2100)', () => {
      assert.strictEqual(validateBudgetInput({ amount: 1000, month: 10, year: 2026 }).isValid, true);
      assert.strictEqual(validateBudgetInput({ amount: 1000, month: 10, year: 1999 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: 1000, month: 10, year: 2101 }).isValid, false);
      assert.strictEqual(validateBudgetInput({ amount: 1000, month: 10, year: 'twenty-twenty-six' }).isValid, false);
    });

    it('validates category against allowed category enum list', () => {
      ALLOWED_CATEGORIES.forEach((cat) => {
        const res = validateBudgetInput({ amount: 5000, month: 10, year: 2026, category: cat });
        assert.strictEqual(res.isValid, true, `Category ${cat} should be valid`);
      });

      const invalidCat = validateBudgetInput({ amount: 5000, month: 10, year: 2026, category: 'Cryptocurrency' });
      assert.strictEqual(invalidCat.isValid, false);
      assert.match(invalidCat.errors.category, /Invalid category/);
    });
  });

  describe('2. Month and Year Calendar Boundaries', () => {
    it('computes 31-day month boundaries accurately (October 2026)', () => {
      const range = getMonthDateRange(2026, 10);
      assert.strictEqual(range.startDate, '2026-10-01');
      assert.strictEqual(range.endDate, '2026-10-31');
      assert.strictEqual(range.daysInMonth, 31);
      assert.strictEqual(range.monthName, 'October');
    });

    it('computes 30-day month boundaries accurately (April 2026)', () => {
      const range = getMonthDateRange(2026, 4);
      assert.strictEqual(range.startDate, '2026-04-01');
      assert.strictEqual(range.endDate, '2026-04-30');
      assert.strictEqual(range.daysInMonth, 30);
      assert.strictEqual(range.monthName, 'April');
    });

    it('computes February leap year vs non-leap year boundaries accurately', () => {
      // 2024 is a leap year (29 days)
      const leapRange = getMonthDateRange(2024, 2);
      assert.strictEqual(leapRange.startDate, '2024-02-01');
      assert.strictEqual(leapRange.endDate, '2024-02-29');
      assert.strictEqual(leapRange.daysInMonth, 29);

      // 2025 is a non-leap year (28 days)
      const nonLeapRange = getMonthDateRange(2025, 2);
      assert.strictEqual(nonLeapRange.startDate, '2025-02-01');
      assert.strictEqual(nonLeapRange.endDate, '2025-02-28');
      assert.strictEqual(nonLeapRange.daysInMonth, 28);
    });

    it('navigates month rollovers across year boundaries correctly', () => {
      // Dec 2026 -> Jan 2027
      const nextFromDec = getNextMonthYear(2026, 12);
      assert.strictEqual(nextFromDec.year, 2027);
      assert.strictEqual(nextFromDec.month, 1);

      // Jan 2026 -> Dec 2025
      const prevFromJan = getPrevMonthYear(2026, 1);
      assert.strictEqual(prevFromJan.year, 2025);
      assert.strictEqual(prevFromJan.month, 12);
    });
  });

  describe('3. Threshold Detection & Spending Indicators (80% and 100%)', () => {
    it('detects healthy budget under 80% consumption', () => {
      const metrics = calculateBudgetMetrics(10000, 5000); // 50%
      assert.strictEqual(metrics.status, 'healthy');
      assert.strictEqual(metrics.badgeText, 'On Track');
      assert.strictEqual(metrics.remaining, 5000);
      assert.strictEqual(metrics.isOverBudget, false);
      assert.strictEqual(metrics.isNearLimit, false);
      assert.strictEqual(metrics.roundedPercentage, 50);
    });

    it('triggers warning alert at exactly 80% budget consumption', () => {
      const metrics = calculateBudgetMetrics(10000, 8000); // 80%
      assert.strictEqual(metrics.status, 'warning');
      assert.strictEqual(metrics.badgeText, '80% Warning');
      assert.strictEqual(metrics.remaining, 2000);
      assert.strictEqual(metrics.isOverBudget, false);
      assert.strictEqual(metrics.isNearLimit, true);
      assert.strictEqual(metrics.roundedPercentage, 80);
    });

    it('triggers warning alert between 80% and 99.9% consumption', () => {
      const metrics = calculateBudgetMetrics(10000, 9500); // 95%
      assert.strictEqual(metrics.status, 'warning');
      assert.strictEqual(metrics.isOverBudget, false);
      assert.strictEqual(metrics.isNearLimit, true);
      assert.strictEqual(metrics.roundedPercentage, 95);
    });

    it('triggers danger indicator at 100% budget consumption', () => {
      const metrics = calculateBudgetMetrics(10000, 10000); // 100%
      assert.strictEqual(metrics.status, 'danger');
      assert.strictEqual(metrics.badgeText, 'Over Budget');
      assert.strictEqual(metrics.remaining, 0);
      assert.strictEqual(metrics.isOverBudget, false); // exactly at limit
      assert.strictEqual(metrics.roundedPercentage, 100);
    });

    it('handles over-budget spending exceeding 100%', () => {
      const metrics = calculateBudgetMetrics(10000, 12500); // 125%
      assert.strictEqual(metrics.status, 'danger');
      assert.strictEqual(metrics.badgeText, 'Over Budget');
      assert.strictEqual(metrics.remaining, -2500);
      assert.strictEqual(metrics.isOverBudget, true);
      assert.strictEqual(metrics.roundedPercentage, 125);
    });

    it('handles zero budget safely without NaN or divide-by-zero crashes', () => {
      const metrics = calculateBudgetMetrics(0, 500);
      assert.strictEqual(metrics.percentage, 0);
      assert.strictEqual(metrics.isOverBudget, false);
      assert.strictEqual(metrics.status, 'unbudgeted');
    });
  });

  describe('4. Financial Reconciliation & Category Breakdown', () => {
    it('aggregates category spending and reconciles with 100% sum consistency', () => {
      const budgets = [
        { id: 'b-tot', month: 10, year: 2026, category: null, amount: 25000 },
        { id: 'b-food', month: 10, year: 2026, category: 'Food', amount: 8000 },
        { id: 'b-trans', month: 10, year: 2026, category: 'Transport', amount: 3000 }
      ];

      const expenses = [
        { id: 'e-1', amount: 2500, category: 'Food', expense_date: '2026-10-05' },
        { id: 'e-2', amount: 1500, category: 'Food', expense_date: '2026-10-12' },
        { id: 'e-3', amount: 1200, category: 'Transport', expense_date: '2026-10-14' },
        { id: 'e-4', amount: 450, category: 'Bills', expense_date: '2026-10-20' }
      ];

      const reconciliation = reconcileMonthlyBudget(budgets, expenses, 2026, 10);

      // Total expense check: 2500 + 1500 + 1200 + 450 = 5650
      assert.strictEqual(reconciliation.totalActualSpent, 5650);
      assert.strictEqual(reconciliation.totalBudget, 25000);
      assert.strictEqual(reconciliation.overallMetrics.remaining, 19350);
      assert.strictEqual(reconciliation.expenseCount, 4);

      // Verify category-wise reconciliation sums up to total spend
      const sumCategories = reconciliation.categoryBreakdown.reduce(
        (sum, item) => sum + item.spentAmount,
        0
      );
      assert.strictEqual(parseFloat(sumCategories.toFixed(2)), reconciliation.totalActualSpent);

      // Category breakdown checks
      const foodItem = reconciliation.categoryBreakdown.find((c) => c.category === 'Food');
      assert.strictEqual(foodItem.isBudgeted, true);
      assert.strictEqual(foodItem.budgetAmount, 8000);
      assert.strictEqual(foodItem.spentAmount, 4000); // 2500 + 1500
      assert.strictEqual(foodItem.remainingAmount, 4000);
      assert.strictEqual(foodItem.roundedPercentage, 50);
      assert.strictEqual(foodItem.status, 'healthy');

      const transportItem = reconciliation.categoryBreakdown.find((c) => c.category === 'Transport');
      assert.strictEqual(transportItem.isBudgeted, true);
      assert.strictEqual(transportItem.spentAmount, 1200);

      const billsItem = reconciliation.categoryBreakdown.find((c) => c.category === 'Bills');
      assert.strictEqual(billsItem.isBudgeted, false);
      assert.strictEqual(billsItem.spentAmount, 450);
    });

    it('identifies categories with no spending yet', () => {
      const budgets = [
        { id: 'b-1', month: 10, year: 2026, category: 'Healthcare', amount: 5000 },
        { id: 'b-2', month: 10, year: 2026, category: 'Food', amount: 6000 }
      ];

      const expenses = [
        { id: 'e-1', amount: 1500, category: 'Food', expense_date: '2026-10-10' }
      ];

      const reconciliation = reconcileMonthlyBudget(budgets, expenses, 2026, 10);
      const noSpend = reconciliation.categoriesWithNoSpending;
      assert.strictEqual(noSpend.length, 1);
      assert.strictEqual(noSpend[0].category, 'Healthcare');
      assert.strictEqual(noSpend[0].spentAmount, 0);
    });

    it('identifies over-budget categories and generates category-specific alerts', () => {
      const budgets = [
        { id: 'b-food', month: 10, year: 2026, category: 'Food', amount: 5000 },
        { id: 'b-shop', month: 10, year: 2026, category: 'Shopping', amount: 10000 }
      ];

      const expenses = [
        { id: 'e-1', amount: 6200, category: 'Food', expense_date: '2026-10-15' }, // Over by 1200
        { id: 'e-2', amount: 8500, category: 'Shopping', expense_date: '2026-10-18' } // 85% Warning
      ];

      const reconciliation = reconcileMonthlyBudget(budgets, expenses, 2026, 10);

      assert.strictEqual(reconciliation.overBudgetCategories.length, 1);
      assert.strictEqual(reconciliation.overBudgetCategories[0].category, 'Food');
      assert.strictEqual(reconciliation.overBudgetCategories[0].remainingAmount, -1200);

      // Verify deterministic alerts
      const foodAlert = reconciliation.alerts.find((a) => a.category === 'Food');
      assert.ok(foodAlert);
      assert.strictEqual(foodAlert.type, 'danger');
      assert.match(foodAlert.title, /Food Budget Exceeded/);

      const shopAlert = reconciliation.alerts.find((a) => a.category === 'Shopping');
      assert.ok(shopAlert);
      assert.strictEqual(shopAlert.type, 'warning');
      assert.match(shopAlert.title, /Shopping Approaching Limit/);
    });

    it('handles empty budget and empty expense sets cleanly', () => {
      const reconciliation = reconcileMonthlyBudget([], [], 2026, 10);
      assert.strictEqual(reconciliation.hasTotalBudget, false);
      assert.strictEqual(reconciliation.totalActualSpent, 0);
      assert.strictEqual(reconciliation.totalBudget, 0);
      assert.strictEqual(reconciliation.alerts.length, 0);
      assert.strictEqual(reconciliation.categoryBreakdown.length, ALLOWED_CATEGORIES.length);
    });
  });

  describe('5. Duplicate Prevention Logic', () => {
    it('detects duplicate budget payload in mock store', () => {
      const existingStore = [
        { id: 'b-1', user_id: 'usr-1', year: 2026, month: 10, category: null, amount: 40000 },
        { id: 'b-2', user_id: 'usr-1', year: 2026, month: 10, category: 'Food', amount: 8000 }
      ];

      const isDuplicate = (store, authUid, year, month, category) => {
        return store.some(
          (b) => b.user_id === authUid &&
                 b.year === year &&
                 b.month === month &&
                 (b.category === category || (!b.category && !category))
        );
      };

      // 1. Same user, same month, same year, null category -> duplicate!
      assert.strictEqual(isDuplicate(existingStore, 'usr-1', 2026, 10, null), true);

      // 2. Same user, same month, same year, 'Food' -> duplicate!
      assert.strictEqual(isDuplicate(existingStore, 'usr-1', 2026, 10, 'Food'), true);

      // 3. Same user, same month, same year, 'Transport' -> NOT duplicate
      assert.strictEqual(isDuplicate(existingStore, 'usr-1', 2026, 10, 'Transport'), false);

      // 4. Same user, different month (November), null category -> NOT duplicate
      assert.strictEqual(isDuplicate(existingStore, 'usr-1', 2026, 11, null), false);

      // 5. Different user, same month and year -> NOT duplicate
      assert.strictEqual(isDuplicate(existingStore, 'usr-2', 2026, 10, null), false);
    });
  });

  describe('6. Multi-Tenant User Isolation & RLS Security Simulation', () => {
    it('enforces tenant isolation: user A cannot read or modify user B budgets', () => {
      const userA = '11111111-1111-1111-1111-111111111111';
      const userB = '22222222-2222-2222-2222-222222222222';

      const mockBudgetsTable = [
        { id: 'b-1', user_id: userA, year: 2026, month: 10, category: null, amount: 50000 },
        { id: 'b-2', user_id: userA, year: 2026, month: 10, category: 'Food', amount: 12000 },
        { id: 'b-3', user_id: userB, year: 2026, month: 10, category: null, amount: 80000 }
      ];

      // Simulated RLS SELECT filter: USING (user_id = auth.uid())
      const getBudgetsForUser = (authUid) => {
        return mockBudgetsTable.filter((row) => row.user_id === authUid);
      };

      const userA_Budgets = getBudgetsForUser(userA);
      const userB_Budgets = getBudgetsForUser(userB);

      assert.strictEqual(userA_Budgets.length, 2);
      assert.strictEqual(userA_Budgets.some((r) => r.user_id === userB), false);

      assert.strictEqual(userB_Budgets.length, 1);
      assert.strictEqual(userB_Budgets[0].amount, 80000);
      assert.strictEqual(userB_Budgets.some((r) => r.user_id === userA), false);

      // Simulated RLS UPDATE check: WITH CHECK (user_id = auth.uid())
      const attemptMaliciousBudgetUpdate = (authUid, budgetId, targetUserId) => {
        const record = mockBudgetsTable.find((b) => b.id === budgetId);
        if (!record || record.user_id !== authUid) {
          throw new Error('RLS Violation: User does not own this budget record.');
        }
        if (targetUserId !== authUid) {
          throw new Error('RLS Violation: Cannot transfer budget ownership to another user.');
        }
        return true;
      };

      // User A cannot update User B's budget
      assert.throws(() => {
        attemptMaliciousBudgetUpdate(userA, 'b-3', userA);
      }, /RLS Violation/);

      // User A cannot transfer budget to User B
      assert.throws(() => {
        attemptMaliciousBudgetUpdate(userA, 'b-1', userB);
      }, /RLS Violation/);
    });
  });

  describe('7. INR Currency Formatting & Presentation', () => {
    it('formats Indian Rupee representation accurately with lakh and crore commas', () => {
      assert.strictEqual(formatCurrencyINR(0, false), '₹0');
      assert.strictEqual(formatCurrencyINR(5000, false), '₹5,000');
      assert.strictEqual(formatCurrencyINR(150000, false), '₹1,50,000');
      assert.strictEqual(formatCurrencyINR(10000000, false), '₹1,00,00,000');
    });
  });
});
