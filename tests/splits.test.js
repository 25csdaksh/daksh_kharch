import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  toPaise,
  fromPaise,
  formatSplitINR,
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateRatioSplit,
  validateCustomMonetarySplit,
  calculateBalances,
  simplifySettlements
} from '../src/utils/splitEngine.js';

describe('HisabSetu Phase 6: Split Expenses & Settlement Engine Tests', () => {
  describe('1. Monetary Conversion & Precision', () => {
    it('accurately converts rupees to integer paise without floating-point errors', () => {
      assert.strictEqual(toPaise(0.1 + 0.2), 30);
      assert.strictEqual(toPaise(900), 90000);
      assert.strictEqual(toPaise(1250.75), 125075);
      assert.strictEqual(fromPaise(125075), 1250.75);
      assert.strictEqual(toPaise('300.50'), 30050);
    });

    it('formats Indian currency representation correctly with minus signs', () => {
      assert.strictEqual(formatSplitINR(600), '₹600.00');
      assert.strictEqual(formatSplitINR(-300), '-₹300.00');
      assert.strictEqual(formatSplitINR(1500000), '₹15,00,000.00');
    });
  });

  describe('2. Equal Split Calculation & Paise Distribution', () => {
    it('divides clean amounts evenly among participants (Example: ₹900 / 3 = ₹300)', () => {
      const participants = [null, 'friend-1', 'friend-2']; // Daksh (user), Rahul, Amit
      const shares = calculateEqualSplit(900, participants);

      assert.strictEqual(shares.length, 3);
      shares.forEach((s) => {
        assert.strictEqual(s.shareAmount, 300);
        assert.strictEqual(s.paise, 30000);
      });
      const totalSum = shares.reduce((acc, s) => acc + s.shareAmount, 0);
      assert.strictEqual(totalSum, 900);
    });

    it('handles paise remainder deterministically without losing any fraction', () => {
      // ₹100 divided among 3 participants -> 33.34, 33.33, 33.33 = exactly 100.00
      const participants = ['A', 'B', 'C'];
      const shares = calculateEqualSplit(100, participants);

      assert.strictEqual(shares[0].shareAmount, 33.34);
      assert.strictEqual(shares[1].shareAmount, 33.33);
      assert.strictEqual(shares[2].shareAmount, 33.33);

      const totalSumPaise = shares.reduce((acc, s) => acc + s.paise, 0);
      assert.strictEqual(totalSumPaise, 10000);
      assert.strictEqual(fromPaise(totalSumPaise), 100);
    });

    it('rejects invalid or empty participant arrays and zero/negative amounts', () => {
      assert.throws(() => calculateEqualSplit(100, []), /At least one participant/);
      assert.throws(() => calculateEqualSplit(0, ['A']), /greater than zero/);
      assert.throws(() => calculateEqualSplit(-50, ['A']), /greater than zero/);
    });
  });

  describe('3. Percentage Split Calculation', () => {
    it('calculates exact shares based on percentages summing to 100%', () => {
      const entries = [
        { participantId: 'A', percentage: 50 },
        { participantId: 'B', percentage: 30 },
        { participantId: 'C', percentage: 20 }
      ];
      const result = calculatePercentageSplit(1000, entries);

      assert.strictEqual(result[0].shareAmount, 500);
      assert.strictEqual(result[1].shareAmount, 300);
      assert.strictEqual(result[2].shareAmount, 200);

      const sum = result.reduce((acc, r) => acc + r.paise, 0);
      assert.strictEqual(sum, 100000);
    });

    it('rejects percentages that do not sum to 100%', () => {
      assert.throws(() => {
        calculatePercentageSplit(1000, [
          { participantId: 'A', percentage: 50 },
          { participantId: 'B', percentage: 40 }
        ]);
      }, /must equal 100%/);
    });
  });

  describe('4. Custom Ratio & Unequal Split Validation', () => {
    it('calculates ratio shares (e.g. 2:1:1 on ₹400 = ₹200, ₹100, ₹100)', () => {
      const entries = [
        { participantId: 'A', shares: 2 },
        { participantId: 'B', shares: 1 },
        { participantId: 'C', shares: 1 }
      ];
      const result = calculateRatioSplit(400, entries);
      assert.strictEqual(result[0].shareAmount, 200);
      assert.strictEqual(result[1].shareAmount, 100);
      assert.strictEqual(result[2].shareAmount, 100);
    });

    it('validates custom monetary shares matching total bill', () => {
      const validEntries = [
        { participantId: null, amount: 500 },
        { participantId: 'friend-1', amount: 400 },
        { participantId: 'friend-2', amount: 300 }
      ];
      const validation = validateCustomMonetarySplit(1200, validEntries);
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.errors.length, 0);

      // Mismatch test
      const invalidEntries = [
        { participantId: null, amount: 500 },
        { participantId: 'friend-1', amount: 300 }
      ];
      const invalidValidation = validateCustomMonetarySplit(1200, invalidEntries);
      assert.strictEqual(invalidValidation.isValid, false);
      assert.match(invalidValidation.errors[0], /do not equal the total bill/);
    });
  });

  describe('5. Balance Engine: User Requirements Example 1 & Example 2', () => {
    it('solves Example 1: Daksh pays ₹900, split equally with Rahul & Amit', () => {
      // Total bill: ₹900
      // Paid by Daksh (user, null)
      // Shares: Daksh = 300, Rahul = 300, Amit = 300
      const expenses = [
        {
          id: 'exp-1',
          paid_by_friend_id: null, // Daksh paid
          total_amount: 900,
          shares: [
            { friend_id: null, share_amount: 300 }, // Daksh
            { friend_id: 'rahul', share_amount: 300 }, // Rahul
            { friend_id: 'amit', share_amount: 300 } // Amit
          ]
        }
      ];

      const balance = calculateBalances(expenses, []);

      // Daksh: +₹600
      // Rahul: -₹300
      // Amit: -₹300
      assert.strictEqual(balance.netBalances['USER'], 600);
      assert.strictEqual(balance.netBalances['rahul'], -300);
      assert.strictEqual(balance.netBalances['amit'], -300);

      // User summary
      assert.strictEqual(balance.userSummary.owedToYou, 600);
      assert.strictEqual(balance.userSummary.youOwe, 0);
      assert.strictEqual(balance.userSummary.netBalance, 600);

      // Pairwise debts
      const rahulOwesDaksh = balance.pairwiseDebts.find((d) => d.fromId === 'rahul' && d.toId === null);
      const amitOwesDaksh = balance.pairwiseDebts.find((d) => d.fromId === 'amit' && d.toId === null);
      assert.strictEqual(rahulOwesDaksh.amount, 300);
      assert.strictEqual(amitOwesDaksh.amount, 300);

      // Balance conservation: group sum must equal 0
      assert.strictEqual(balance.isBalanced, true);
    });

    it('solves Example 2: Bill ₹1,200, Paid by Rahul, Shares: Daksh 500, Rahul 400, Amit 300', () => {
      const expenses = [
        {
          id: 'exp-2',
          paid_by_friend_id: 'rahul', // Rahul paid
          total_amount: 1200,
          shares: [
            { friend_id: null, share_amount: 500 }, // Daksh (user) owes 500
            { friend_id: 'rahul', share_amount: 400 }, // Rahul's own share
            { friend_id: 'amit', share_amount: 300 } // Amit owes 300
          ]
        }
      ];

      const balance = calculateBalances(expenses, []);

      // Results:
      // Daksh owes ₹500 (net -500)
      // Rahul is owed ₹800 (net +800)
      // Amit owes ₹300 (net -300)
      assert.strictEqual(balance.netBalances['USER'], -500);
      assert.strictEqual(balance.netBalances['rahul'], 800);
      assert.strictEqual(balance.netBalances['amit'], -300);

      assert.strictEqual(balance.userSummary.youOwe, 500);
      assert.strictEqual(balance.userSummary.owedToYou, 0);
      assert.strictEqual(balance.userSummary.netBalance, -500);

      assert.strictEqual(balance.isBalanced, true);
    });
  });

  describe('6. Settlement Management & Net Balance Updates', () => {
    it('updates balances immediately after partial settlement (Rahul owes 300, pays 200 -> owes 100)', () => {
      const expenses = [
        {
          id: 'exp-1',
          paid_by_friend_id: null, // Daksh paid 300 for Rahul
          total_amount: 300,
          shares: [{ friend_id: 'rahul', share_amount: 300 }]
        }
      ];

      // Settlement: Rahul pays Daksh 200
      const settlements = [
        {
          id: 'set-1',
          payer_friend_id: 'rahul',
          recipient_friend_id: null, // to Daksh
          amount: 200,
          settlement_date: '2026-10-10'
        }
      ];

      const balance = calculateBalances(expenses, settlements);

      assert.strictEqual(balance.netBalances['USER'], 100);
      assert.strictEqual(balance.netBalances['rahul'], -100);
      assert.strictEqual(balance.userSummary.owedToYou, 100);
      assert.strictEqual(balance.isBalanced, true);
    });

    it('marks fully settled when remaining debt reaches 0', () => {
      const expenses = [
        {
          id: 'exp-1',
          paid_by_friend_id: null,
          total_amount: 300,
          shares: [{ friend_id: 'rahul', share_amount: 300 }]
        }
      ];

      const settlements = [
        {
          id: 'set-1',
          payer_friend_id: 'rahul',
          recipient_friend_id: null,
          amount: 300,
          settlement_date: '2026-10-10'
        }
      ];

      const balance = calculateBalances(expenses, settlements);
      assert.strictEqual(balance.netBalances['USER'], 0);
      assert.strictEqual(balance.netBalances['rahul'], 0);
      assert.strictEqual(balance.pairwiseDebts.length, 0);
    });
  });

  describe('7. Simplified Settlements Algorithm (Debt Minimization)', () => {
    it('produces simplified settlement suggestions that clear all debts', () => {
      // 3 people: Daksh (+600), Rahul (-300), Amit (-300)
      const netBalances = {
        USER: 600,
        rahul: -300,
        amit: -300
      };

      const suggestions = simplifySettlements(netBalances, (id) => {
        if (id === null) return 'Daksh';
        if (id === 'rahul') return 'Rahul';
        if (id === 'amit') return 'Amit';
        return id;
      });

      assert.strictEqual(suggestions.length, 2);
      // All payments should go to Daksh
      assert.strictEqual(suggestions[0].toName, 'Daksh');
      assert.strictEqual(suggestions[1].toName, 'Daksh');
      const totalPaid = suggestions.reduce((acc, s) => acc + s.amount, 0);
      assert.strictEqual(totalPaid, 600);
    });

    it('minimizes transaction count across complex circular debts', () => {
      // A owes B 100, B owes C 100 -> Simplified: A owes C 100
      const netBalances = {
        A: -100,
        B: 0,
        C: 100
      };

      const suggestions = simplifySettlements(netBalances, (id) => id);
      assert.strictEqual(suggestions.length, 1);
      assert.strictEqual(suggestions[0].fromId, 'A');
      assert.strictEqual(suggestions[0].toId, 'C');
      assert.strictEqual(suggestions[0].amount, 100);
    });
  });
});
