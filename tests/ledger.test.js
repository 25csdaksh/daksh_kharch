import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  toPaise,
  fromPaise,
  formatLedgerINR,
  calculateContactBalance,
  calculateLedgerSummary,
  validateRepayment,
  generateIdempotencyKey,
  ENTRY_TYPES,
  PAYMENT_DIRECTIONS
} from '../src/utils/ledgerEngine.js';

describe('HisabSetu My Ledger (Udhar Khatu) Engine Tests', () => {

  describe('1. Currency & Monetary Conversion', () => {
    it('converts decimal rupees to integer paise accurately avoiding float issues', () => {
      assert.strictEqual(toPaise(0.1 + 0.2), 30);
      assert.strictEqual(toPaise(2000), 200000);
      assert.strictEqual(toPaise(12500.75), 1250075);
      assert.strictEqual(fromPaise(1250075), 12500.75);
      assert.strictEqual(toPaise('500.50'), 50050);
      assert.strictEqual(toPaise(0), 0);
      assert.strictEqual(toPaise(-50), -5000);
    });

    it('formats Indian currency representation (INR)', () => {
      assert.strictEqual(formatLedgerINR(0), '₹0.00');
      assert.strictEqual(formatLedgerINR(2000), '₹2,000.00');
      assert.strictEqual(formatLedgerINR(12500), '₹12,500.00');
      assert.strictEqual(formatLedgerINR(1500000), '₹15,00,000.00');
      assert.strictEqual(formatLedgerINR(-1500), '-₹1,500.00');
    });
  });

  describe('2. Prompt Test 1-3: Lend ₹2,000 -> Receive ₹500 -> Receive ₹1,500', () => {
    const contact = { id: 'c-rahul', name: 'Rahul' };

    it('Lend ₹2,000 -> receivable ₹2,000, payable ₹0, net ₹2,000', () => {
      const entries = [
        {
          id: 'e1',
          contact_id: 'c-rahul',
          entry_type: ENTRY_TYPES.LEND,
          amount: 2000,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.receivable, 2000);
      assert.strictEqual(balance.payable, 0);
      assert.strictEqual(balance.netBalance, 2000);
      assert.strictEqual(balance.isSettled, false);
      assert.strictEqual(balance.statusLabel, 'To Receive');
    });

    it('Receive ₹500 partial repayment -> receivable ₹1,500', () => {
      const entries = [
        {
          id: 'e1',
          contact_id: 'c-rahul',
          entry_type: ENTRY_TYPES.LEND,
          amount: 2000,
          is_reversed: false
        },
        {
          id: 'e2',
          contact_id: 'c-rahul',
          entry_type: ENTRY_TYPES.REPAY_RECEIVED,
          amount: 500,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.receivable, 1500);
      assert.strictEqual(balance.payable, 0);
      assert.strictEqual(balance.netBalance, 1500);
      assert.strictEqual(balance.isSettled, false);
      assert.strictEqual(balance.statusLabel, 'To Receive');
    });

    it('Receive remaining ₹1,500 repayment -> receivable ₹0 (Settled)', () => {
      const entries = [
        {
          id: 'e1',
          contact_id: 'c-rahul',
          entry_type: ENTRY_TYPES.LEND,
          amount: 2000,
          is_reversed: false
        },
        {
          id: 'e2',
          contact_id: 'c-rahul',
          entry_type: ENTRY_TYPES.REPAY_RECEIVED,
          amount: 500,
          is_reversed: false
        },
        {
          id: 'e3',
          contact_id: 'c-rahul',
          entry_type: ENTRY_TYPES.REPAY_RECEIVED,
          amount: 1500,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.receivable, 0);
      assert.strictEqual(balance.payable, 0);
      assert.strictEqual(balance.netBalance, 0);
      assert.strictEqual(balance.isSettled, true);
      assert.strictEqual(balance.statusLabel, 'Settled');
    });
  });

  describe('3. Prompt Test 4-6: Borrow ₹1,500 -> Repay ₹500 -> Repay ₹1,000', () => {
    const contact = { id: 'c-amit', name: 'Amit' };

    it('Borrow ₹1,500 -> payable ₹1,500, receivable ₹0, net -₹1,500', () => {
      const entries = [
        {
          id: 'e10',
          contact_id: 'c-amit',
          entry_type: ENTRY_TYPES.BORROW,
          amount: 1500,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.payable, 1500);
      assert.strictEqual(balance.receivable, 0);
      assert.strictEqual(balance.netBalance, -1500);
      assert.strictEqual(balance.isSettled, false);
      assert.strictEqual(balance.statusLabel, 'To Pay');
    });

    it('Repay ₹500 -> payable ₹1,000', () => {
      const entries = [
        {
          id: 'e10',
          contact_id: 'c-amit',
          entry_type: ENTRY_TYPES.BORROW,
          amount: 1500,
          is_reversed: false
        },
        {
          id: 'e11',
          contact_id: 'c-amit',
          entry_type: ENTRY_TYPES.REPAY_PAID,
          amount: 500,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.payable, 1000);
      assert.strictEqual(balance.receivable, 0);
      assert.strictEqual(balance.netBalance, -1000);
      assert.strictEqual(balance.isSettled, false);
      assert.strictEqual(balance.statusLabel, 'To Pay');
    });

    it('Repay remaining ₹1,000 -> payable ₹0 (Settled)', () => {
      const entries = [
        {
          id: 'e10',
          contact_id: 'c-amit',
          entry_type: ENTRY_TYPES.BORROW,
          amount: 1500,
          is_reversed: false
        },
        {
          id: 'e11',
          contact_id: 'c-amit',
          entry_type: ENTRY_TYPES.REPAY_PAID,
          amount: 500,
          is_reversed: false
        },
        {
          id: 'e12',
          contact_id: 'c-amit',
          entry_type: ENTRY_TYPES.REPAY_PAID,
          amount: 1000,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.payable, 0);
      assert.strictEqual(balance.receivable, 0);
      assert.strictEqual(balance.netBalance, 0);
      assert.strictEqual(balance.isSettled, true);
      assert.strictEqual(balance.statusLabel, 'Settled');
    });
  });

  describe('4. Prompt Test 7: Simultaneous Receivable and Payable for One Person', () => {
    it('accurately maintains separate receivable, payable and net position', () => {
      const contact = { id: 'c-priya', name: 'Priya' };
      const entries = [
        { id: 'p1', contact_id: 'c-priya', entry_type: ENTRY_TYPES.LEND, amount: 5000, is_reversed: false },
        { id: 'p2', contact_id: 'c-priya', entry_type: ENTRY_TYPES.BORROW, amount: 2000, is_reversed: false },
        { id: 'p3', contact_id: 'c-priya', entry_type: ENTRY_TYPES.REPAY_RECEIVED, amount: 1000, is_reversed: false },
        { id: 'p4', contact_id: 'c-priya', entry_type: ENTRY_TYPES.REPAY_PAID, amount: 500, is_reversed: false }
      ];

      const balance = calculateContactBalance(contact, entries);
      // Receivable: 5000 - 1000 = 4000
      // Payable: 2000 - 500 = 1500
      // Net: 4000 - 1500 = +2500 (To Receive)
      assert.strictEqual(balance.receivable, 4000);
      assert.strictEqual(balance.payable, 1500);
      assert.strictEqual(balance.netBalance, 2500);
      assert.strictEqual(balance.statusLabel, 'To Receive');
    });
  });

  describe('5. Prompt Test 8: Opening Balances', () => {
    it('handles auditable opening balance entry where contact owes user', () => {
      const contact = { id: 'c-open-1', name: 'Opening Contact' };
      const entries = [
        {
          id: 'ob-1',
          contact_id: 'c-open-1',
          entry_type: ENTRY_TYPES.OPENING_BALANCE,
          direction: PAYMENT_DIRECTIONS.THEY_OWE_ME,
          amount: 3500,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.receivable, 3500);
      assert.strictEqual(balance.payable, 0);
      assert.strictEqual(balance.netBalance, 3500);
    });

    it('handles auditable opening balance entry where user owes contact', () => {
      const contact = { id: 'c-open-2', name: 'Opening Contact 2' };
      const entries = [
        {
          id: 'ob-2',
          contact_id: 'c-open-2',
          entry_type: ENTRY_TYPES.OPENING_BALANCE,
          direction: PAYMENT_DIRECTIONS.I_OWE_THEM,
          amount: 1800,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.receivable, 0);
      assert.strictEqual(balance.payable, 1800);
      assert.strictEqual(balance.netBalance, -1800);
    });
  });

  describe('6. Prompt Test 9: Adjustments & Audited Reversals', () => {
    it('applies positive and negative adjustment correctly', () => {
      const contact = { id: 'c-adj', name: 'Adjustment Test' };
      const entries = [
        { id: 'a1', contact_id: 'c-adj', entry_type: ENTRY_TYPES.LEND, amount: 1000, is_reversed: false },
        { id: 'a2', contact_id: 'c-adj', entry_type: ENTRY_TYPES.ADJUSTMENT, direction: PAYMENT_DIRECTIONS.THEY_OWE_ME, amount: 200, is_reversed: false }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.receivable, 1200);
      assert.strictEqual(balance.netBalance, 1200);
    });

    it('completely ignores reversed transactions in balance calculation', () => {
      const contact = { id: 'c-rev', name: 'Reversal Test' };
      const entries = [
        { id: 'r1', contact_id: 'c-rev', entry_type: ENTRY_TYPES.LEND, amount: 2000, is_reversed: false },
        { id: 'r2', contact_id: 'c-rev', entry_type: ENTRY_TYPES.REPAY_RECEIVED, amount: 500, is_reversed: true } // reversed!
      ];

      const balance = calculateContactBalance(contact, entries);
      // r2 is reversed, so balance remains ₹2000
      assert.strictEqual(balance.receivable, 2000);
      assert.strictEqual(balance.netBalance, 2000);
    });
  });

  describe('7. Prompt Test 10: Multiple Contacts with Independent Balances & Dashboard Summary', () => {
    it('aggregates across multiple contacts without cross-contamination', () => {
      const contacts = [
        { id: 'c1', name: 'Rahul' },
        { id: 'c2', name: 'Amit' },
        { id: 'c3', name: 'Vikas' }
      ];

      const entries = [
        // Rahul: lend 2000, receive 500 -> receivable 1500
        { id: 'e1', contact_id: 'c1', entry_type: ENTRY_TYPES.LEND, amount: 2000, is_reversed: false },
        { id: 'e2', contact_id: 'c1', entry_type: ENTRY_TYPES.REPAY_RECEIVED, amount: 500, is_reversed: false },

        // Amit: borrow 1500 -> payable 1500
        { id: 'e3', contact_id: 'c2', entry_type: ENTRY_TYPES.BORROW, amount: 1500, is_reversed: false },

        // Vikas: lend 1000, repaid 1000 -> settled 0
        { id: 'e4', contact_id: 'c3', entry_type: ENTRY_TYPES.LEND, amount: 1000, is_reversed: false },
        { id: 'e5', contact_id: 'c3', entry_type: ENTRY_TYPES.REPAY_RECEIVED, amount: 1000, is_reversed: false }
      ];

      const summary = calculateLedgerSummary(contacts, entries);

      assert.strictEqual(summary.totalReceivable, 1500);
      assert.strictEqual(summary.totalPayable, 1500);
      assert.strictEqual(summary.netBalance, 0); // 1500 - 1500
      assert.strictEqual(summary.activeAccounts, 2); // Rahul and Amit
      assert.strictEqual(summary.contactBalances.length, 3);
    });
  });

  describe('8. Prompt Test 12: Over-Repayment Validation & Rejection', () => {
    it('rejects repayment exceeding outstanding receivable balance', () => {
      const currentBalance = { receivable: 1500, payable: 0 };
      const validation = validateRepayment(ENTRY_TYPES.REPAY_RECEIVED, 2000, currentBalance);

      assert.strictEqual(validation.valid, false);
      assert.match(validation.error, /exceeds outstanding receivable/i);
    });

    it('rejects repayment exceeding outstanding payable balance', () => {
      const currentBalance = { receivable: 0, payable: 800 };
      const validation = validateRepayment(ENTRY_TYPES.REPAY_PAID, 1000, currentBalance);

      assert.strictEqual(validation.valid, false);
      assert.match(validation.error, /exceeds outstanding payable/i);
    });

    it('rejects zero or negative repayment amounts', () => {
      const currentBalance = { receivable: 1500, payable: 800 };
      const valZero = validateRepayment(ENTRY_TYPES.REPAY_RECEIVED, 0, currentBalance);
      assert.strictEqual(valZero.valid, false);

      const valNeg = validateRepayment(ENTRY_TYPES.REPAY_PAID, -100, currentBalance);
      assert.strictEqual(valNeg.valid, false);
    });

    it('accepts exact full settlement repayment', () => {
      const currentBalance = { receivable: 1500, payable: 0 };
      const validation = validateRepayment(ENTRY_TYPES.REPAY_RECEIVED, 1500, currentBalance);

      assert.strictEqual(validation.valid, true);
    });
  });

  describe('9. Prompt Test 13-14: Idempotency Key & Retry Protection', () => {
    it('generates unique idempotency keys with custom or default prefix', () => {
      const key1 = generateIdempotencyKey('ledger');
      const key2 = generateIdempotencyKey('ledger');
      assert.strictEqual(typeof key1, 'string');
      assert.strictEqual(key1.startsWith('ledger-'), true);
      assert.notStrictEqual(key1, key2); // unique per request
    });
  });

  describe('10. Prompt Test 15: Due Dates and Overdue Detection', () => {
    it('correctly marks an account as overdue if past due date with outstanding balance', () => {
      const contact = { id: 'c-overdue', name: 'Overdue Contact' };
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const entries = [
        {
          id: 'e-od',
          contact_id: 'c-overdue',
          entry_type: ENTRY_TYPES.LEND,
          amount: 2500,
          due_date: pastDateStr,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.isOverdue, true);
      assert.strictEqual(balance.receivable, 2500);
    });

    it('does NOT mark an account as overdue if balance is settled even if date has passed', () => {
      const contact = { id: 'c-settled-past', name: 'Settled Past Contact' };
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const pastDateStr = pastDate.toISOString().split('T')[0];

      const entries = [
        {
          id: 'e-sp1',
          contact_id: 'c-settled-past',
          entry_type: ENTRY_TYPES.LEND,
          amount: 2500,
          due_date: pastDateStr,
          is_reversed: false
        },
        {
          id: 'e-sp2',
          contact_id: 'c-settled-past',
          entry_type: ENTRY_TYPES.REPAY_RECEIVED,
          amount: 2500,
          is_reversed: false
        }
      ];

      const balance = calculateContactBalance(contact, entries);
      assert.strictEqual(balance.isSettled, true);
      assert.strictEqual(balance.isOverdue, false);
    });
  });

  describe('11. Prompt Section 10: Financial Isolation (No Expense / Budget Distortion)', () => {
    it('ledger entry types are isolated and not treated as standard living expense categories', () => {
      const ledgerTypes = Object.values(ENTRY_TYPES);
      const standardLivingExpenses = ['Food & Dining', 'Groceries', 'Utilities', 'Entertainment', 'Transportation'];

      ledgerTypes.forEach((lt) => {
        assert.strictEqual(standardLivingExpenses.includes(lt), false);
      });
    });
  });
});
