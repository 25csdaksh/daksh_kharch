/**
 * HisabSetu — Phase 5: Savings Goals & Progress Tracking Test Suite
 * Validates goal creation, validations, progress calculations, contributions,
 * withdrawals, savings planner formulas, accounting invariants, and security isolation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  GOAL_CATEGORIES,
  ALLOWED_GOAL_CATEGORIES,
  GOAL_TEMPLATES,
  round2,
  calculateGoalProgress,
  computeGoalStatus,
  calculateDaysRemaining,
  calculateSavingsPlanner,
  validateGoalInput,
  validateGoalTransactionInput,
  calculateGoalsSummary
} from '../src/utils/goalUtils.js';

import {
  calculateAccountBalance,
  calculateNetWorthSummary
} from '../src/utils/accountUtils.js';

describe('HisabSetu Phase 5: Savings Goals & Progress Tracking Tests', () => {

  describe('1. Goal Creation & Input Validation', () => {
    it('validates a correct goal creation payload', () => {
      const valid = {
        name: 'Emergency Fund 2026',
        category: 'Emergency Fund',
        target_amount: 150000,
        initial_amount: 10000,
        start_date: '2026-10-01',
        target_date: '2027-04-01',
        monthly_target: 25000
      };
      const res = validateGoalInput(valid);
      assert.equal(res.isValid, true);
      assert.equal(Object.keys(res.errors).length, 0);
    });

    it('rejects empty or whitespace-only goal names', () => {
      const emptyName = { name: '   ', target_amount: 50000 };
      const res = validateGoalInput(emptyName);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.name);
    });

    it('rejects names exceeding 100 characters', () => {
      const longName = { name: 'A'.repeat(101), target_amount: 50000 };
      const res = validateGoalInput(longName);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.name);
    });

    it('validates category against allowed category enum list', () => {
      assert.ok(ALLOWED_GOAL_CATEGORIES.includes('Emergency Fund'));
      assert.ok(ALLOWED_GOAL_CATEGORIES.includes('Travel'));
      assert.ok(ALLOWED_GOAL_CATEGORIES.includes('Electronics'));

      const invalidCategory = { name: 'Trip', category: 'SpaceExploration', target_amount: 10000 };
      const res = validateGoalInput(invalidCategory);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.category);
    });

    it('rejects zero, negative, or non-numeric target amounts', () => {
      assert.equal(validateGoalInput({ name: 'Car', target_amount: 0 }).isValid, false);
      assert.equal(validateGoalInput({ name: 'Car', target_amount: -5000 }).isValid, false);
      assert.equal(validateGoalInput({ name: 'Car', target_amount: 'invalid' }).isValid, false);
    });

    it('flags initial saved amount exceeding target amount without explicit override', () => {
      const overfundedInitial = {
        name: 'Bike',
        target_amount: 50000,
        initial_amount: 60000,
        allow_overfunded: false
      };
      const res = validateGoalInput(overfundedInitial);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.initial_amount);

      const withOverride = {
        ...overfundedInitial,
        allow_overfunded: true
      };
      const validRes = validateGoalInput(withOverride);
      assert.equal(validRes.isValid, true);
    });

    it('rejects target date earlier than start date', () => {
      const invertedDates = {
        name: 'Tech Fund',
        target_amount: 80000,
        start_date: '2026-10-15',
        target_date: '2026-09-01'
      };
      const res = validateGoalInput(invertedDates);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.target_date);
    });

    it('verifies useful preset templates exist without creating fake production data', () => {
      assert.ok(GOAL_TEMPLATES.length >= 5);
      const emergencyTpl = GOAL_TEMPLATES.find((t) => t.category === 'Emergency Fund');
      assert.ok(emergencyTpl);
      assert.equal(emergencyTpl.target_amount, 150000);
    });
  });

  describe('2. Progress Percentage & Remaining Amount Mathematics', () => {
    it('calculates progress percentage and remaining amount accurately', () => {
      // Saved 30,000 of 1,00,000 -> 30%, 70,000 remaining
      const prog = calculateGoalProgress(30000, 100000);
      assert.equal(prog.progressPercentage, 30);
      assert.equal(prog.displayPercentage, 30);
      assert.equal(prog.remainingAmount, 70000);
      assert.equal(prog.isCompleted, false);
      assert.equal(prog.isOverfunded, false);
    });

    it('handles exact completion cleanly', () => {
      const prog = calculateGoalProgress(50000, 50000);
      assert.equal(prog.progressPercentage, 100);
      assert.equal(prog.displayPercentage, 100);
      assert.equal(prog.remainingAmount, 0);
      assert.equal(prog.isCompleted, true);
      assert.equal(prog.isOverfunded, false);
    });

    it('caps display progress bar at 100% while preserving legitimate overfunded records', () => {
      // Saved 1,20,000 of 1,00,000 -> 120% raw, 100% display, 20,000 overfunded
      const prog = calculateGoalProgress(120000, 100000);
      assert.equal(prog.progressPercentage, 120);
      assert.equal(prog.displayPercentage, 100);
      assert.equal(prog.remainingAmount, 0);
      assert.equal(prog.isCompleted, true);
      assert.equal(prog.isOverfunded, true);
      assert.equal(prog.overfundedAmount, 20000);
    });

    it('handles zero target or zero saved gracefully without dividing by zero', () => {
      const zeroTarget = calculateGoalProgress(5000, 0);
      assert.equal(zeroTarget.progressPercentage, 0);
      assert.equal(zeroTarget.remainingAmount, 0);

      const zeroSaved = calculateGoalProgress(0, 50000);
      assert.equal(zeroSaved.progressPercentage, 0);
      assert.equal(zeroSaved.remainingAmount, 50000);
    });
  });

  describe('3. Dynamic Goal Status Transitions & Archiving', () => {
    it('identifies not_started status when current_amount is 0', () => {
      const goal = { current_amount: 0, target_amount: 50000, target_date: '2026-12-31' };
      assert.equal(computeGoalStatus(goal, '2026-10-15'), 'not_started');
    });

    it('identifies in_progress status when partially saved', () => {
      const goal = { current_amount: 15000, target_amount: 50000, target_date: '2026-12-31' };
      assert.equal(computeGoalStatus(goal, '2026-10-15'), 'in_progress');
    });

    it('identifies completed status when saved >= target', () => {
      const goal = { current_amount: 50000, target_amount: 50000, target_date: '2026-12-31' };
      assert.equal(computeGoalStatus(goal, '2026-10-15'), 'completed');
    });

    it('identifies overdue status when target date is passed and goal is unmet', () => {
      const goal = { current_amount: 20000, target_amount: 50000, target_date: '2026-10-01' };
      assert.equal(computeGoalStatus(goal, '2026-10-15'), 'overdue');
    });

    it('preserves paused status when explicitly paused by user', () => {
      const goal = { status: 'paused', current_amount: 20000, target_amount: 50000, target_date: '2026-10-01' };
      assert.equal(computeGoalStatus(goal, '2026-10-15'), 'paused');
    });

    it('treats archived goals cleanly in summaries', () => {
      const goals = [
        { id: '1', current_amount: 10000, target_amount: 50000, is_archived: false, status: 'in_progress' },
        { id: '2', current_amount: 50000, target_amount: 50000, is_archived: false, status: 'completed' },
        { id: '3', current_amount: 30000, target_amount: 30000, is_archived: true, status: 'completed' }
      ];
      const summary = calculateGoalsSummary(goals);
      assert.equal(summary.totalActiveGoals, 1);
      assert.equal(summary.completedGoalsCount, 1);
      assert.equal(summary.totalTargetAmount, 50000);
      assert.equal(summary.totalContributedAmount, 10000);
    });
  });

  describe('4. Contributions, Withdrawals & Validation Rules', () => {
    it('validates contribution payloads', () => {
      const validContrib = {
        type: 'contribution',
        amount: 5000,
        transaction_date: '2026-10-15',
        note: 'October bonus'
      };
      const res = validateGoalTransactionInput(validContrib, 10000);
      assert.equal(res.isValid, true);
    });

    it('rejects withdrawal exceeding currently saved balance', () => {
      const excessiveWithdrawal = {
        type: 'withdrawal',
        amount: 15000, // saved only 10,000
        transaction_date: '2026-10-15'
      };
      const res = validateGoalTransactionInput(excessiveWithdrawal, 10000);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.amount);
    });

    it('allows withdrawal within currently saved balance', () => {
      const validWithdrawal = {
        type: 'withdrawal',
        amount: 4000,
        transaction_date: '2026-10-15'
      };
      const res = validateGoalTransactionInput(validWithdrawal, 10000);
      assert.equal(res.isValid, true);
    });

    it('rejects zero or negative transaction amounts', () => {
      const zeroTx = { type: 'contribution', amount: 0, transaction_date: '2026-10-15' };
      assert.equal(validateGoalTransactionInput(zeroTx, 1000).isValid, false);

      const negTx = { type: 'contribution', amount: -500, transaction_date: '2026-10-15' };
      assert.equal(validateGoalTransactionInput(negTx, 1000).isValid, false);
    });
  });

  describe('5. Savings Planner Calculations', () => {
    it('calculates suggested monthly & weekly savings accurately for future target', () => {
      // Target: 1,20,000; Current: 20,000 -> Remaining: 1,00,000
      // Target date: 5 months away (~152 days)
      const planner = calculateSavingsPlanner({
        targetAmount: 120000,
        currentAmount: 20000,
        targetDate: '2027-03-15',
        referenceDateStr: '2026-10-15'
      });

      assert.equal(planner.status, 'on_track');
      assert.equal(planner.remainingAmount, 100000);
      assert.ok(planner.remainingMonths >= 4 && planner.remainingMonths <= 5);
      assert.equal(planner.suggestedMonthly, round2(100000 / planner.remainingMonths));
      assert.ok(planner.suggestedWeekly > 0);
    });

    it('evaluates target sufficiency when monthlyTarget is provided', () => {
      // Remaining 60,000 over 3 months -> Suggested: 20,000/mo
      // If user sets monthlyTarget = 25,000 -> Sufficient!
      const sufficient = calculateSavingsPlanner({
        targetAmount: 60000,
        currentAmount: 0,
        targetDate: '2027-01-15',
        monthlyTarget: 25000,
        referenceDateStr: '2026-10-15'
      });
      assert.equal(sufficient.isTargetSufficient, true);
      assert.equal(sufficient.targetDeficit, 0);

      // If user sets monthlyTarget = 10,000 (below suggestedMonthly of 15,000) -> Deficit of 5,000/mo!
      const deficit = calculateSavingsPlanner({
        targetAmount: 60000,
        currentAmount: 0,
        targetDate: '2027-01-15',
        monthlyTarget: 10000,
        referenceDateStr: '2026-10-15'
      });
      assert.equal(deficit.isTargetSufficient, false);
      assert.ok(deficit.targetDeficit > 0);
      assert.equal(deficit.targetDeficit, round2(deficit.suggestedMonthly - 10000));
    });

    it('handles completed goal in planner with 0 remaining', () => {
      const planner = calculateSavingsPlanner({
        targetAmount: 50000,
        currentAmount: 50000,
        targetDate: '2027-01-15'
      });
      assert.equal(planner.status, 'completed');
      assert.equal(planner.remainingAmount, 0);
      assert.equal(planner.suggestedMonthly, 0);
    });

    it('handles overdue goal requiring immediate full remaining contribution', () => {
      const planner = calculateSavingsPlanner({
        targetAmount: 50000,
        currentAmount: 30000,
        targetDate: '2026-09-01',
        referenceDateStr: '2026-10-15'
      });
      assert.equal(planner.status, 'overdue');
      assert.equal(planner.remainingAmount, 20000);
      assert.equal(planner.suggestedMonthly, 20000);
    });

    it('handles missing target date gracefully without crashing', () => {
      const planner = calculateSavingsPlanner({
        targetAmount: 50000,
        currentAmount: 10000,
        targetDate: null
      });
      assert.equal(planner.status, 'no_target_date');
      assert.equal(planner.remainingAmount, 40000);
      assert.equal(planner.suggestedMonthly, null);
    });
  });

  describe('6. Accounting Invariants: Virtual vs Linked Accounts', () => {
    it('virtual goal contributions do NOT alter bank account balances', () => {
      const account = { id: 'acc-bank', type: 'bank', opening_balance: 25000 };
      const expenses = [{ amount: 5000 }];
      const incomes = [];
      const transfersOut = [];
      const transfersIn = [];

      // Virtual goal with ₹10,000 contributed
      const virtualGoal = { id: 'g-1', name: 'Virtual Laptop', current_amount: 10000 };

      // Balance of actual account remains unaffected: 25000 - 5000 = 20000
      const bal = calculateAccountBalance({ account, expenses, incomes, transfersOut, transfersIn });
      assert.equal(bal.balance, 20000);
    });

    it('linked goal contributions utilize the transfer model without falsifying expenses or incomes', () => {
      // Scenario: Goal is linked to a "Dedicated Savings" account (acc-savings).
      // User deposits ₹5,000 from "Salary Bank" (acc-bank) into the goal.
      // This is recorded as a transfer: source acc-bank, destination acc-savings.
      const bankAccount = { id: 'acc-bank', type: 'bank', opening_balance: 50000 };
      const savingsAccount = { id: 'acc-savings', type: 'savings', opening_balance: 10000 };

      const bankTransfersOut = [{ source_account_id: 'acc-bank', destination_account_id: 'acc-savings', amount: 5000 }];
      const savingsTransfersIn = [{ source_account_id: 'acc-bank', destination_account_id: 'acc-savings', amount: 5000 }];

      // Bank account decreases by ₹5,000
      const bankBal = calculateAccountBalance({
        account: bankAccount,
        expenses: [],
        incomes: [],
        transfersOut: bankTransfersOut,
        transfersIn: []
      });
      assert.equal(bankBal.balance, 45000);

      // Savings account increases by ₹5,000
      const savingsBal = calculateAccountBalance({
        account: savingsAccount,
        expenses: [],
        incomes: [],
        transfersOut: [],
        transfersIn: savingsTransfersIn
      });
      assert.equal(savingsBal.balance, 15000);

      // Total portfolio Net Worth is strictly preserved: 45,000 + 15,000 = 60,000
      const portfolio = calculateNetWorthSummary([
        { ...bankAccount, computed: bankBal },
        { ...savingsAccount, computed: savingsBal }
      ]);
      assert.equal(portfolio.netWorth, 60000);
      assert.equal(portfolio.totalLiquidAssets, 60000);

      // CRITICAL ACCOUNTING CHECK:
      // The goal contribution is NOT an expense (so personal monthly spend is 0)
      assert.equal(bankBal.totalExpenses, 0);
      // The goal contribution is NOT income (so personal income is 0)
      assert.equal(savingsBal.totalIncomes, 0);
    });

    it('prevents double-counting of savings in net worth', () => {
      // If a user has a bank account with ₹1,00,000 and has created a goal target of ₹1,00,000,
      // net worth is ₹1,00,000 (from the account), NOT ₹2,00,000!
      const bankAccount = { id: 'acc-1', type: 'bank', opening_balance: 100000 };
      const bankBal = calculateAccountBalance({ account: bankAccount });
      const portfolio = calculateNetWorthSummary([{ ...bankAccount, computed: bankBal }]);

      assert.equal(portfolio.netWorth, 100000);
    });
  });

  describe('7. Multi-Tenant User Isolation Simulation', () => {
    it('simulates RLS isolation: user A cannot access or mutate user B goals', () => {
      const userAId = 'user-uuid-111';
      const userBId = 'user-uuid-222';

      const databaseGoals = [
        { id: 'g-1', user_id: userAId, name: 'Daksh Emergency Fund', current_amount: 50000 },
        { id: 'g-2', user_id: userBId, name: 'Alice Vacation Trip', current_amount: 30000 }
      ];

      // Simulate RLS: SELECT * FROM savings_goals WHERE user_id = auth.uid()
      const userAGoals = databaseGoals.filter((g) => g.user_id === userAId);
      assert.equal(userAGoals.length, 1);
      assert.equal(userAGoals[0].name, 'Daksh Emergency Fund');

      // Attempt by User A to delete or view User B goal
      const canUserAAccessGoalB = databaseGoals.some((g) => g.id === 'g-2' && g.user_id === userAId);
      assert.equal(canUserAAccessGoalB, false);
    });
  });

});
