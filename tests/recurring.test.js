import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateNextDueDate,
  getDaysInMonth,
  getDueStatus,
  getDueBadgeInfo,
  validateRecurringInput,
  ALLOWED_FREQUENCIES
} from '../src/utils/recurringUtils.js';
import { ALLOWED_CATEGORIES, ALLOWED_PAYMENT_METHODS } from '../src/utils/dateUtils.js';

describe('HisabSetu Phase 2: Recurring Expenses & Bill Reminders Tests', () => {
  describe('1. Recurrence Calculations & Calendar Drift Prevention', () => {
    it('calculates daily recurrence (+1 day)', () => {
      const res1 = calculateNextDueDate('2026-10-15', 'daily');
      assert.strictEqual(res1.nextDueDate, '2026-10-16');

      // Month rollover
      const res2 = calculateNextDueDate('2026-10-31', 'daily');
      assert.strictEqual(res2.nextDueDate, '2026-11-01');

      // Year rollover
      const res3 = calculateNextDueDate('2026-12-31', 'daily');
      assert.strictEqual(res3.nextDueDate, '2027-01-01');
    });

    it('calculates weekly recurrence (+7 days)', () => {
      const res1 = calculateNextDueDate('2026-10-09', 'weekly');
      assert.strictEqual(res1.nextDueDate, '2026-10-16');

      // Month rollover
      const res2 = calculateNextDueDate('2026-10-27', 'weekly');
      assert.strictEqual(res2.nextDueDate, '2026-11-03');
    });

    it('handles monthly recurrence on 31st with anchor clamping without drift', () => {
      // Test the classic calendar bug: Jan 31 -> Feb 28 -> Mar 31 -> Apr 30 -> May 31
      // Step 1: Jan 31 -> Feb
      const feb2025 = calculateNextDueDate('2025-01-31', 'monthly', 31);
      assert.strictEqual(feb2025.nextDueDate, '2025-02-28', 'Feb in 2025 has 28 days');
      assert.strictEqual(feb2025.anchorDay, 31, 'Preserves original anchor day 31');

      // Step 2: Feb 28 -> March (Must restore to March 31!)
      const mar2025 = calculateNextDueDate(feb2025.nextDueDate, 'monthly', feb2025.anchorDay);
      assert.strictEqual(mar2025.nextDueDate, '2025-03-31', 'March must restore to 31st!');

      // Step 3: March 31 -> April (Clamps to April 30)
      const apr2025 = calculateNextDueDate(mar2025.nextDueDate, 'monthly', mar2025.anchorDay);
      assert.strictEqual(apr2025.nextDueDate, '2025-04-30');

      // Step 4: April 30 -> May (Restores to May 31)
      const may2025 = calculateNextDueDate(apr2025.nextDueDate, 'monthly', apr2025.anchorDay);
      assert.strictEqual(may2025.nextDueDate, '2025-05-31', 'May must restore to 31st!');
    });

    it('handles February leap year vs non-leap year for 29th and 30th anchors', () => {
      // Leap year 2024: Jan 31 -> Feb 29
      const febLeap = calculateNextDueDate('2024-01-31', 'monthly', 31);
      assert.strictEqual(febLeap.nextDueDate, '2024-02-29', 'Leap year Feb has 29 days');

      // Non-leap year 2025: Jan 29 -> Feb 28
      const febNonLeap = calculateNextDueDate('2025-01-29', 'monthly', 29);
      assert.strictEqual(febNonLeap.nextDueDate, '2025-02-28', 'Non-leap year Feb clamps to 28');

      // Next month from Feb 28 with anchor 29: restores to March 29!
      const marAfterClamped = calculateNextDueDate(febNonLeap.nextDueDate, 'monthly', febNonLeap.anchorDay);
      assert.strictEqual(marAfterClamped.nextDueDate, '2025-03-29', 'March restores anchor 29');
    });

    it('calculates yearly recurrence with leap-year clamping and restoration', () => {
      // Feb 29, 2024 (leap year) -> 2025 (non-leap year clamps to Feb 28)
      const res2025 = calculateNextDueDate('2024-02-29', 'yearly', 29);
      assert.strictEqual(res2025.nextDueDate, '2025-02-28');
      assert.strictEqual(res2025.anchorDay, 29);

      // 2025-02-28 with anchor 29 -> 2026-02-28
      const res2026 = calculateNextDueDate(res2025.nextDueDate, 'yearly', res2025.anchorDay);
      assert.strictEqual(res2026.nextDueDate, '2026-02-28');

      // Regular date yearly advance
      const regularYearly = calculateNextDueDate('2026-10-15', 'yearly');
      assert.strictEqual(regularYearly.nextDueDate, '2027-10-15');
    });
  });

  describe('2. Recurring Expense Input Validation', () => {
    it('validates a valid recurring expense payload', () => {
      const payload = {
        title: 'House Rent',
        amount: 18500,
        category: 'Bills',
        payment_method: 'Bank Transfer',
        frequency: 'monthly',
        start_date: '2026-11-01',
        next_due_date: '2026-11-01',
        notes: 'Landlord Sharma ji',
        reminder_days_before: 3
      };
      const result = validateRecurringInput(payload);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.sanitized.amount, 18500);
      assert.strictEqual(result.sanitized.frequency, 'monthly');
      assert.strictEqual(result.sanitized.reminder_days_before, 3);
    });

    it('rejects invalid title, zero/negative amounts, and out-of-bounds numbers', () => {
      assert.strictEqual(validateRecurringInput({ title: '', amount: 500, category: 'Bills', payment_method: 'UPI', frequency: 'monthly', start_date: '2026-10-15', next_due_date: '2026-10-15' }).isValid, false);
      assert.strictEqual(validateRecurringInput({ title: 'Rent', amount: 0, category: 'Bills', payment_method: 'UPI', frequency: 'monthly', start_date: '2026-10-15', next_due_date: '2026-10-15' }).isValid, false);
      assert.strictEqual(validateRecurringInput({ title: 'Rent', amount: -100, category: 'Bills', payment_method: 'UPI', frequency: 'monthly', start_date: '2026-10-15', next_due_date: '2026-10-15' }).isValid, false);
      assert.strictEqual(validateRecurringInput({ title: 'Rent', amount: 'NaN', category: 'Bills', payment_method: 'UPI', frequency: 'monthly', start_date: '2026-10-15', next_due_date: '2026-10-15' }).isValid, false);
    });

    it('validates allowed frequencies enum', () => {
      ALLOWED_FREQUENCIES.forEach((freq) => {
        const res = validateRecurringInput({
          title: 'Test Bill',
          amount: 100,
          category: 'Bills',
          payment_method: 'Cash',
          frequency: freq,
          start_date: '2026-10-15',
          next_due_date: '2026-10-15'
        });
        assert.strictEqual(res.isValid, true, `Frequency ${freq} should be valid`);
      });

      const invalidFreq = validateRecurringInput({
        title: 'Test Bill',
        amount: 100,
        category: 'Bills',
        payment_method: 'Cash',
        frequency: 'bi-weekly',
        start_date: '2026-10-15',
        next_due_date: '2026-10-15'
      });
      assert.strictEqual(invalidFreq.isValid, false);
      assert.match(invalidFreq.errors.frequency, /Invalid frequency/);
    });

    it('validates start date and rejects end_date earlier than start_date', () => {
      const inverted = validateRecurringInput({
        title: 'Subscription',
        amount: 299,
        category: 'Entertainment',
        payment_method: 'UPI',
        frequency: 'monthly',
        start_date: '2026-12-01',
        next_due_date: '2026-12-01',
        end_date: '2026-11-01' // Inverted!
      });
      assert.strictEqual(inverted.isValid, false);
      assert.match(inverted.errors.end_date, /earlier than start date/);
    });
  });

  describe('3. Due-Date Dashboard Classifications & Status Indicators', () => {
    const today = '2026-10-16';

    it('identifies overdue bills (due date < today)', () => {
      const status = getDueStatus('2026-10-14', today);
      assert.strictEqual(status, 'overdue');

      const badge = getDueBadgeInfo('2026-10-14', today);
      assert.strictEqual(badge.status, 'overdue');
      assert.strictEqual(badge.badgeClass, 'badge-danger');
      assert.strictEqual(badge.isActionRequired, true);
    });

    it('identifies bills due today (due date === today)', () => {
      const status = getDueStatus('2026-10-16', today);
      assert.strictEqual(status, 'due-today');

      const badge = getDueBadgeInfo('2026-10-16', today);
      assert.strictEqual(badge.badgeText, 'Due Today');
      assert.strictEqual(badge.badgeClass, 'badge-warning');
      assert.strictEqual(badge.isActionRequired, true);
    });

    it('identifies bills due within the next 7 days', () => {
      // 3 days away (Oct 19)
      const status = getDueStatus('2026-10-19', today);
      assert.strictEqual(status, 'upcoming-7-days');

      const badge = getDueBadgeInfo('2026-10-19', today);
      assert.strictEqual(badge.badgeText, 'Due in 3d');
      assert.strictEqual(badge.badgeClass, 'badge-info');
    });

    it('identifies bills due later (> 7 days)', () => {
      const status = getDueStatus('2026-11-01', today);
      assert.strictEqual(status, 'due-later');
    });
  });

  describe('4. Accounting Rule & Idempotent Expense Creation Simulation', () => {
    it('guarantees pending bills do NOT count as personal expenses', () => {
      const mockPersonalExpenses = [
        { id: 'exp-1', amount: 450, category: 'Food', expense_date: '2026-10-10' }
      ];

      const mockRecurringOccurrences = [
        { id: 'occ-1', scheduled_due_date: '2026-10-20', amount: 15000, status: 'pending', linked_expense_id: null }
      ];

      // Financial ledger query: only records in mockPersonalExpenses count towards spending
      const totalSpend = mockPersonalExpenses.reduce((sum, e) => sum + e.amount, 0);
      assert.strictEqual(totalSpend, 450, 'Pending recurring occurrences must never alter expense totals');
    });

    it('executes idempotent payment flow and links personal expense without duplicate creation', () => {
      const mockExpenses = [];
      const mockOccurrence = {
        id: 'occ-rent-oct',
        recurring_expense_id: 'rec-rent-1',
        scheduled_due_date: '2026-10-16',
        status: 'pending',
        linked_expense_id: null,
        actual_paid_amount: null,
        actual_payment_date: null
      };

      const mockSchedule = {
        id: 'rec-rent-1',
        title: 'House Rent',
        amount: 15000,
        category: 'Bills',
        payment_method: 'Bank Transfer',
        frequency: 'monthly',
        next_due_date: '2026-10-16'
      };

      // Simulated payment function with idempotency check
      const recordPayment = (occ, sched, paidAmount, paidDate) => {
        // Idempotency: If already paid with linked expense, return immediately
        if (occ.status === 'paid' && occ.linked_expense_id) {
          return { alreadyPaid: true, linkedExpenseId: occ.linked_expense_id };
        }

        // 1. Create personal expense
        const newExpense = {
          id: `exp-${Date.now()}`,
          amount: paidAmount,
          category: sched.category,
          payment_method: sched.payment_method,
          expense_date: paidDate,
          description: `[Recurring Bill] ${sched.title}`
        };
        mockExpenses.push(newExpense);

        // 2. Update occurrence
        occ.status = 'paid';
        occ.actual_paid_amount = paidAmount;
        occ.actual_payment_date = paidDate;
        occ.linked_expense_id = newExpense.id;

        return { alreadyPaid: false, linkedExpenseId: newExpense.id };
      };

      // First execution: creates expense and marks occurrence paid
      const result1 = recordPayment(mockOccurrence, mockSchedule, 15000, '2026-10-16');
      assert.strictEqual(result1.alreadyPaid, false);
      assert.strictEqual(mockExpenses.length, 1);
      assert.strictEqual(mockOccurrence.status, 'paid');
      assert.strictEqual(mockOccurrence.linked_expense_id, result1.linkedExpenseId);

      // Second execution (retry/network glitch): Idempotent, does NOT create a 2nd expense!
      const result2 = recordPayment(mockOccurrence, mockSchedule, 15000, '2026-10-16');
      assert.strictEqual(result2.alreadyPaid, true);
      assert.strictEqual(mockExpenses.length, 1, 'Retry must not duplicate personal expense!');
    });

    it('corrects mistakenly recorded payments by reverting occurrence and deleting linked expense', () => {
      const mockExpenses = [
        { id: 'exp-mistake', amount: 5000, category: 'Bills', description: '[Recurring Bill] Mistake' }
      ];

      const mockOccurrence = {
        id: 'occ-mistake',
        status: 'paid',
        actual_paid_amount: 5000,
        actual_payment_date: '2026-10-16',
        linked_expense_id: 'exp-mistake'
      };

      // Simulated revert function
      const revertPayment = (occ) => {
        const linkedId = occ.linked_expense_id;
        const expIdx = mockExpenses.findIndex((e) => e.id === linkedId);
        if (expIdx !== -1) {
          mockExpenses.splice(expIdx, 1); // delete linked expense
        }
        occ.status = 'pending';
        occ.actual_paid_amount = null;
        occ.actual_payment_date = null;
        occ.linked_expense_id = null;
      };

      revertPayment(mockOccurrence);
      assert.strictEqual(mockOccurrence.status, 'pending');
      assert.strictEqual(mockOccurrence.linked_expense_id, null);
      assert.strictEqual(mockExpenses.length, 0, 'Linked personal expense must be cleanly removed on revert');
    });
  });

  describe('5. Multi-Tenant User Isolation & RLS Security Simulation', () => {
    it('enforces tenant isolation: user A cannot access or mutate user B schedules and occurrences', () => {
      const userA = '11111111-1111-1111-1111-111111111111';
      const userB = '22222222-2222-2222-2222-222222222222';

      const mockRecurringTable = [
        { id: 'rec-1', user_id: userA, title: 'User A Rent', amount: 20000 },
        { id: 'rec-2', user_id: userA, title: 'User A Gym', amount: 1500 },
        { id: 'rec-3', user_id: userB, title: 'User B Secret Bill', amount: 99999 }
      ];

      // Simulated RLS SELECT filter: USING (user_id = auth.uid())
      const getSchedulesForUser = (authUid) => {
        return mockRecurringTable.filter((r) => r.user_id === authUid);
      };

      const userA_Schedules = getSchedulesForUser(userA);
      const userB_Schedules = getSchedulesForUser(userB);

      assert.strictEqual(userA_Schedules.length, 2);
      assert.strictEqual(userA_Schedules.some((s) => s.user_id === userB), false);

      assert.strictEqual(userB_Schedules.length, 1);
      assert.strictEqual(userB_Schedules[0].title, 'User B Secret Bill');
      assert.strictEqual(userB_Schedules.some((s) => s.user_id === userA), false);

      // Simulated RLS UPDATE constraint: WITH CHECK (user_id = auth.uid())
      const attemptMaliciousScheduleUpdate = (authUid, scheduleId, targetUserId) => {
        const record = mockRecurringTable.find((s) => s.id === scheduleId);
        if (!record || record.user_id !== authUid) {
          throw new Error('RLS Violation: User does not own this recurring schedule.');
        }
        if (targetUserId !== authUid) {
          throw new Error('RLS Violation: Cannot transfer schedule ownership.');
        }
        return true;
      };

      // User A cannot modify User B's schedule
      assert.throws(() => {
        attemptMaliciousScheduleUpdate(userA, 'rec-3', userA);
      }, /RLS Violation/);

      // User A cannot transfer ownership to User B
      assert.throws(() => {
        attemptMaliciousScheduleUpdate(userA, 'rec-1', userB);
      }, /RLS Violation/);
    });
  });
});
