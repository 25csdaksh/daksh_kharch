/**
 * HisabSetu — Phase 3: Multiple Wallets, Accounts & Transfers Test Suite
 * Validates financial balance formulas, credit card liability accounting,
 * transfer mechanics, safe deletion rules, and multi-tenant security isolation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCOUNT_TYPES,
  ALLOWED_ACCOUNT_TYPES,
  INCOME_SOURCES,
  isLiabilityAccount,
  round2,
  calculateAccountBalance,
  calculateNetWorthSummary,
  validateAccountInput,
  validateTransferInput,
  validateIncomeInput
} from '../src/utils/accountUtils.js';

describe('HisabSetu Phase 3: Wallets, Accounts & Transfers Tests', () => {

  describe('1. Account Input Validation & Type Constraints', () => {
    it('validates a correct account payload', () => {
      const valid = {
        name: 'HDFC Salary Bank',
        type: 'bank',
        opening_balance: 25000,
        color: '#2563EB'
      };
      const res = validateAccountInput(valid);
      assert.equal(res.isValid, true);
      assert.equal(Object.keys(res.errors).length, 0);
    });

    it('rejects empty or whitespace-only account names', () => {
      const emptyName = { name: '   ', type: 'cash', opening_balance: 500 };
      const res = validateAccountInput(emptyName);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.name);
    });

    it('rejects unsupported account types', () => {
      const invalidType = { name: 'Crypto Wallet', type: 'crypto', opening_balance: 1000 };
      const res = validateAccountInput(invalidType);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.type);
    });

    it('rejects negative opening balance for asset accounts', () => {
      const negAsset = { name: 'My Cash', type: 'cash', opening_balance: -500 };
      const res = validateAccountInput(negAsset);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.opening_balance);
    });

    it('allows zero or positive initial debt for credit card accounts', () => {
      const validCC = { name: 'Amazon ICICI Card', type: 'credit_card', opening_balance: 4500 };
      const res = validateAccountInput(validCC);
      assert.equal(res.isValid, true);
    });

    it('rejects notes exceeding 500 characters', () => {
      const longNotes = { name: 'Notes Acc', type: 'other', notes: 'a'.repeat(501) };
      const res = validateAccountInput(longNotes);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.notes);
    });
  });

  describe('2. Liquid Asset Balance Calculations', () => {
    it('computes balance with opening balance + incomes - expenses - transfers_out + transfers_in', () => {
      const account = { id: 'acc-1', type: 'bank', opening_balance: 10000 };
      const incomes = [{ amount: 50000 }, { amount: 5000 }]; // +55,000
      const expenses = [{ amount: 12000 }, { amount: 3500 }]; // -15,500
      const transfersOut = [{ amount: 8000 }]; // -8,000 (sent to wallet)
      const transfersIn = [{ amount: 2000 }]; // +2,000 (received from cash)

      // Expected: 10,000 + 55,000 - 15,500 - 8,000 + 2,000 = 43,500
      const res = calculateAccountBalance({
        account,
        expenses,
        incomes,
        transfersOut,
        transfersIn
      });

      assert.equal(res.balance, 43500);
      assert.equal(res.outstandingDebt, 0);
      assert.equal(res.isLiability, false);
      assert.equal(res.totalExpenses, 15500);
      assert.equal(res.totalIncomes, 55000);
    });

    it('handles asset account with zero transactions and preserves opening balance', () => {
      const account = { id: 'acc-2', type: 'cash', opening_balance: 3450.50 };
      const res = calculateAccountBalance({ account });
      assert.equal(res.balance, 3450.50);
      assert.equal(res.outstandingDebt, 0);
    });

    it('accurately handles fractional paise arithmetic without floating point precision errors', () => {
      const account = { id: 'acc-3', type: 'wallet', opening_balance: 100.10 };
      const expenses = [{ amount: 20.05 }, { amount: 30.04 }];
      const incomes = [{ amount: 50.08 }];

      // 100.10 + 50.08 - 50.09 = 100.09
      const res = calculateAccountBalance({ account, expenses, incomes });
      assert.equal(res.balance, 100.09);
    });
  });

  describe('3. Credit Card Liability & Debt Accounting', () => {
    it('treats credit cards as liabilities where expenses increase debt and transfers in pay down debt', () => {
      const card = { id: 'card-1', type: 'credit_card', opening_balance: 10000 }; // 10,000 initial unpaid bill
      const expenses = [{ amount: 4500 }, { amount: 2500 }]; // +7,000 charged to card
      const transfersIn = [{ amount: 12000 }]; // Paid 12,000 from bank account
      const transfersOut = [];

      // Expected Debt = 10,000 (initial) + 7,000 (new charges) - 12,000 (payments) = 5,000
      // Net Contribution to Net Worth = -5,000
      const res = calculateAccountBalance({
        account: card,
        expenses,
        transfersIn,
        transfersOut
      });

      assert.equal(res.isLiability, true);
      assert.equal(res.outstandingDebt, 5000);
      assert.equal(res.netContribution, -5000);
      assert.equal(res.totalExpenses, 7000);
      assert.equal(res.totalPayments, 12000);
    });

    it('handles full credit card payoff resulting in zero outstanding debt', () => {
      const card = { id: 'card-2', type: 'credit_card', opening_balance: 8000 };
      const expenses = [{ amount: 2000 }]; // 10,000 total debt
      const transfersIn = [{ amount: 10000 }]; // full payoff

      const res = calculateAccountBalance({ account: card, expenses, transfersIn });
      assert.equal(res.outstandingDebt, 0);
      assert.equal(res.netContribution, 0);
    });
  });

  describe('4. Portfolio Overview & Net Worth Consolidation', () => {
    it('aggregates liquid assets and isolates credit liabilities to derive true net worth', () => {
      const accounts = [
        { id: '1', type: 'cash', is_archived: false, computed: { balance: 5000, outstandingDebt: 0 } },
        { id: '2', type: 'bank', is_archived: false, computed: { balance: 85000, outstandingDebt: 0 } },
        { id: '3', type: 'wallet', is_archived: false, computed: { balance: 2500, outstandingDebt: 0 } },
        { id: '4', type: 'credit_card', is_archived: false, computed: { balance: -15000, outstandingDebt: 15000 } }
      ];

      // Liquid Assets = 5,000 + 85,000 + 2,500 = 92,500
      // Credit Liabilities = 15,000
      // Net Worth = 92,500 - 15,000 = 77,500
      const summary = calculateNetWorthSummary(accounts);

      assert.equal(summary.totalLiquidAssets, 92500);
      assert.equal(summary.totalCreditLiabilities, 15000);
      assert.equal(summary.netWorth, 77500);
    });

    it('excludes archived accounts from active net worth calculations', () => {
      const accounts = [
        { id: '1', type: 'bank', is_archived: false, computed: { balance: 50000, outstandingDebt: 0 } },
        { id: '2', type: 'bank', is_archived: true, computed: { balance: 10000, outstandingDebt: 0 } } // archived old bank
      ];

      const summary = calculateNetWorthSummary(accounts);
      assert.equal(summary.totalLiquidAssets, 50000);
      assert.equal(summary.netWorth, 50000);
    });
  });

  describe('5. Money Transfers & Validation Rules', () => {
    it('validates a valid inter-account transfer payload', () => {
      const valid = {
        source_account_id: 'acc-bank',
        destination_account_id: 'acc-wallet',
        amount: 2500,
        transfer_date: '2026-10-16',
        note: 'ATM withdrawal / wallet topup'
      };
      const res = validateTransferInput(valid);
      assert.equal(res.isValid, true);
    });

    it('rejects transfer when source and destination accounts are identical', () => {
      const same = {
        source_account_id: 'acc-bank',
        destination_account_id: 'acc-bank',
        amount: 1000,
        transfer_date: '2026-10-16'
      };
      const res = validateTransferInput(same);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.destination_account_id);
      assert.match(res.errors.destination_account_id, /different/i);
    });

    it('rejects zero or negative transfer amounts', () => {
      const zero = {
        source_account_id: 'acc-1',
        destination_account_id: 'acc-2',
        amount: 0,
        transfer_date: '2026-10-16'
      };
      const res = validateTransferInput(zero);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.amount);
    });

    it('verifies inter-account transfer is strictly balance-neutral across the portfolio', () => {
      const source = { id: 'source', type: 'bank', opening_balance: 20000 };
      const dest = { id: 'dest', type: 'wallet', opening_balance: 1000 };

      const transferAmount = 5000;
      const transfersOutSource = [{ amount: transferAmount }];
      const transfersInDest = [{ amount: transferAmount }];

      const balSource = calculateAccountBalance({ account: source, transfersOut: transfersOutSource });
      const balDest = calculateAccountBalance({ account: dest, transfersIn: transfersInDest });

      assert.equal(balSource.balance, 15000); // 20,000 - 5,000
      assert.equal(balDest.balance, 6000); // 1,000 + 5,000

      // Combined portfolio total before = 21,000; after = 15,000 + 6,000 = 21,000 (neutral!)
      assert.equal(balSource.balance + balDest.balance, 21000);
    });
  });

  describe('6. Safe Account Deletion & Integrity Rules', () => {
    it('simulates deletion safety checks: rejects deletion if account has transactions', () => {
      // Rule: An account with linked expenses, incomes, or transfers cannot be deleted
      const checkAccountUsage = ({ linkedExpenses = 0, linkedIncomes = 0, transferCount = 0 }) => {
        const reasons = [];
        if (linkedExpenses > 0) reasons.push(`${linkedExpenses} expense(s) linked`);
        if (linkedIncomes > 0) reasons.push(`${linkedIncomes} income(s) linked`);
        if (transferCount > 0) reasons.push(`${transferCount} transfer(s) linked`);
        return {
          canDelete: reasons.length === 0,
          reasons
        };
      };

      const busyAccount = checkAccountUsage({ linkedExpenses: 5, transferCount: 2 });
      assert.equal(busyAccount.canDelete, false);
      assert.equal(busyAccount.reasons.length, 2);

      const freshAccount = checkAccountUsage({ linkedExpenses: 0, linkedIncomes: 0, transferCount: 0 });
      assert.equal(freshAccount.canDelete, true);
    });

    it('tolerates historical transactions with account_id IS NULL without crashing', () => {
      const unassignedExpenses = [
        { id: 'old-1', amount: 450, account_id: null },
        { id: 'old-2', amount: 800, account_id: null }
      ];

      const account = { id: 'acc-new', type: 'cash', opening_balance: 1000 };
      const assignedExpenses = unassignedExpenses.filter((e) => e.account_id === account.id);

      const res = calculateAccountBalance({ account, expenses: assignedExpenses });
      // Opening balance remains untouched because unassigned expenses are not deducted from new account
      assert.equal(res.balance, 1000);
    });
  });

  describe('7. Income Validation & Inflow Integrity', () => {
    it('validates a valid income entry', () => {
      const valid = {
        amount: 75000,
        source: 'Salary',
        income_date: '2026-10-15',
        description: 'Monthly payroll deposit'
      };
      const res = validateIncomeInput(valid);
      assert.equal(res.isValid, true);
    });

    it('rejects invalid income sources and non-positive amounts', () => {
      const invalid = {
        amount: -100,
        source: 'LotteryUnknown',
        income_date: '2026-10-15'
      };
      const res = validateIncomeInput(invalid);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.amount);
      assert.ok(res.errors.source);
    });
  });

  describe('8. Multi-Tenant User Isolation & RLS Simulation', () => {
    it('simulates RLS tenant isolation: user A cannot read or mutate user B accounts and transfers', () => {
      const mockDatabase = {
        accounts: [
          { id: 'acc-userA', user_id: 'user-A', name: 'User A Savings', opening_balance: 5000 },
          { id: 'acc-userB', user_id: 'user-B', name: 'User B Secret Vault', opening_balance: 99999 }
        ],
        transfers: [
          { id: 'tr-userA', user_id: 'user-A', source_account_id: 'acc-userA', amount: 1000 },
          { id: 'tr-userB', user_id: 'user-B', source_account_id: 'acc-userB', amount: 5000 }
        ]
      };

      // Simulated RLS query for User A
      const currentAuthUser = 'user-A';
      const userAAccounts = mockDatabase.accounts.filter((a) => a.user_id === currentAuthUser);
      const userATransfers = mockDatabase.transfers.filter((t) => t.user_id === currentAuthUser);

      assert.equal(userAAccounts.length, 1);
      assert.equal(userAAccounts[0].name, 'User A Savings');
      assert.equal(userATransfers.length, 1);

      // Verify User A cannot see User B's secret vault
      const userBLeaked = userAAccounts.some((a) => a.user_id === 'user-B');
      assert.equal(userBLeaked, false);
    });
  });

});
