/**
 * HisabSetu — My Ledger (Udhar Khatu) Core Engine
 * Precise financial accounting calculations, paise arithmetic, balance reconciliation,
 * and Indian currency formatting.
 */

export const ENTRY_TYPES = {
  LEND: 'lend',
  BORROW: 'borrow',
  REPAY_RECEIVED: 'repay_received',
  REPAY_PAID: 'repay_paid',
  OPENING_BALANCE: 'opening',
  ADJUSTMENT: 'adjustment'
};

export const PAYMENT_DIRECTIONS = {
  THEY_OWE_ME: 'receivable',
  I_OWE_THEM: 'payable'
};

/**
 * Converts a monetary amount to integer paise to eliminate floating point issues.
 * e.g., 2000 -> 200000, "1250.75" -> 125075
 */
export function toPaise(val) {
  if (val === null || val === undefined || val === '') return 0;
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100);
}

/**
 * Converts integer paise back to rupees float with 2 decimal places.
 */
export function fromPaise(paise) {
  return Math.round(paise) / 100;
}

/**
 * Rounds a number strictly to 2 decimal places.
 */
export function round2(num) {
  const n = typeof num === 'string' ? parseFloat(num) : Number(num);
  if (isNaN(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a monetary value into Indian Rupee representation (e.g. ₹12,500.00).
 */
export function formatLedgerINR(amount, { showDecimals = true, showSign = true } = {}) {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num)) return '₹0.00';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toFixed(showDecimals ? 2 : 0).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian grouping: last 3 digits, then groups of 2
  if (integerPart.length > 3) {
    const last3 = integerPart.slice(-3);
    const rest = integerPart.slice(0, -3);
    const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = `${withCommas},${last3}`;
  }

  const formatted = showDecimals ? `${integerPart}.${decimalPart}` : integerPart;
  if (isNegative && showSign) {
    return `-₹${formatted}`;
  }
  return `₹${formatted}`;
}

/**
 * Calculates complete accounting balance for a single person / contact from their entries.
 *
 * Rules:
 * Receivable:
 *   + lend entries
 *   + opening (direction = 'receivable')
 *   + adjustment (direction = 'receivable')
 *   - repay_received entries
 *
 * Payable:
 *   + borrow entries
 *   + opening (direction = 'payable')
 *   + adjustment (direction = 'payable')
 *   - repay_paid entries
 *
 * Net Balance:
 *   receivable - payable
 *   > 0 : Customer owes me (Receivable)
 *   < 0 : I owe customer (Payable)
 *   = 0 : Settled
 */
export function calculateContactBalance(entriesOrContact = [], maybeEntries = null) {
  let contact = null;
  let rawEntries = [];

  if (Array.isArray(entriesOrContact)) {
    rawEntries = entriesOrContact;
    contact = maybeEntries;
  } else {
    contact = entriesOrContact;
    rawEntries = Array.isArray(maybeEntries) ? maybeEntries : [];
  }

  // Strictly exclude reversed transactions from financial balances
  const activeEntries = rawEntries.filter((e) => !e.is_reversed);

  let lentPaise = 0;
  let repayReceivedPaise = 0;
  let borrowPaise = 0;
  let repayPaidPaise = 0;
  let lastActivityDate = null;
  let earliestPendingDueDate = null;

  // Sort entries chronologically for deterministic processing
  const sorted = [...activeEntries].sort((a, b) => {
    const dateA = new Date(a.transaction_date || a.created_at || 0).getTime();
    const dateB = new Date(b.transaction_date || b.created_at || 0).getTime();
    return dateA - dateB;
  });

  for (const entry of sorted) {
    const amountPaise = toPaise(entry.amount);
    const entryType = entry.entry_type;
    const direction = entry.direction;

    // Track last activity
    if (entry.transaction_date) {
      if (!lastActivityDate || entry.transaction_date > lastActivityDate) {
        lastActivityDate = entry.transaction_date;
      }
    }

    if (entryType === 'lend') {
      lentPaise += amountPaise;
    } else if (entryType === 'borrow') {
      borrowPaise += amountPaise;
    } else if (entryType === 'repay_received') {
      repayReceivedPaise += amountPaise;
    } else if (entryType === 'repay_paid') {
      repayPaidPaise += amountPaise;
    } else if (entryType === 'opening' || entryType === 'adjustment') {
      if (direction === 'receivable') {
        lentPaise += amountPaise;
      } else if (direction === 'payable') {
        borrowPaise += amountPaise;
      }
    }
  }

  // Authoritative outstanding calculations
  const receivablePaise = Math.max(0, lentPaise - repayReceivedPaise);
  const payablePaise = Math.max(0, borrowPaise - repayPaidPaise);
  const netPaise = receivablePaise - payablePaise;

  const receivable = fromPaise(receivablePaise);
  const payable = fromPaise(payablePaise);
  const netBalance = fromPaise(netPaise);

  let status = 'settled';
  if (netPaise > 0) {
    status = 'receivable';
  } else if (netPaise < 0) {
    status = 'payable';
  }

  // Check pending due dates if balance is not settled
  if (status !== 'settled') {
    for (const entry of sorted) {
      if (entry.due_date) {
        if (!earliestPendingDueDate || entry.due_date < earliestPendingDueDate) {
          earliestPendingDueDate = entry.due_date;
        }
      }
    }
  }

  const isSettled = netPaise === 0;
  const statusLabel = isSettled ? 'Settled' : status === 'receivable' ? 'To Receive' : 'To Pay';
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = !isSettled && !!earliestPendingDueDate && earliestPendingDueDate < todayStr;

  return {
    contact,
    totalLent: fromPaise(lentPaise),
    totalRepaidReceived: fromPaise(repayReceivedPaise),
    receivable,
    totalBorrowed: fromPaise(borrowPaise),
    totalRepaidPaid: fromPaise(repayPaidPaise),
    payable,
    netBalance,
    isSettled,
    statusLabel,
    isOverdue,
    status, // 'receivable' | 'payable' | 'settled'
    lastActivityDate,
    due_date: earliestPendingDueDate,
    entryCount: activeEntries.length
  };
}

/**
 * Calculates dashboard aggregates across all contacts and all entries.
 */
export function calculateLedgerSummary(contacts = [], allEntries = [], todayStr = null) {
  const today = todayStr || new Date().toISOString().split('T')[0];

  let totalReceivablePaise = 0;
  let totalPayablePaise = 0;
  let activeAccounts = 0;
  let settledAccounts = 0;
  let overdueAccounts = 0;
  let overduePaise = 0;

  // Group entries by contact_id
  const entriesByContact = new Map();
  for (const entry of allEntries) {
    const cId = entry.contact_id;
    if (!entriesByContact.has(cId)) {
      entriesByContact.set(cId, []);
    }
    entriesByContact.get(cId).push(entry);
  }

  const unarchivedContacts = contacts.filter((c) => !c.is_archived);
  const contactBalances = [];

  for (const contact of unarchivedContacts) {
    const entries = entriesByContact.get(contact.id) || [];
    const balance = calculateContactBalance(contact, entries);
    contactBalances.push(balance);

    totalReceivablePaise += toPaise(balance.receivable);
    totalPayablePaise += toPaise(balance.payable);

    if (balance.status === 'settled') {
      settledAccounts += 1;
    } else {
      activeAccounts += 1;
      // Overdue check
      if (balance.due_date && balance.due_date < today) {
        overdueAccounts += 1;
        overduePaise += toPaise(balance.receivable);
      }
    }
  }

  const totalReceivable = fromPaise(totalReceivablePaise);
  const totalPayable = fromPaise(totalPayablePaise);
  const netPosition = fromPaise(totalReceivablePaise - totalPayablePaise);

  return {
    totalReceivable,
    totalPayable,
    netPosition,
    netBalance: netPosition,
    activeAccounts,
    settledAccounts,
    totalAccounts: unarchivedContacts.length,
    overdueAccounts,
    overdueAmount: fromPaise(overduePaise),
    contactBalances
  };
}

/**
 * Validates a new repayment attempt to prevent overpayments or invalid directions.
 * Supports both validateRepayment({ amount, entryType, contactBalance }) and
 * validateRepayment(entryType, amount, contactBalance).
 */
export function validateRepayment(arg1, arg2, arg3) {
  let amount, entryType, contactBalance;

  if (typeof arg1 === 'object' && arg1 !== null && arg2 === undefined) {
    amount = arg1.amount;
    entryType = arg1.entryType;
    contactBalance = arg1.contactBalance;
  } else {
    entryType = arg1;
    amount = arg2;
    contactBalance = arg3 || {};
  }

  const amtPaise = toPaise(amount);
  if (amtPaise <= 0) {
    return {
      isValid: false,
      valid: false,
      error: 'Repayment amount must be greater than zero.'
    };
  }

  if (entryType === 'repay_received') {
    const maxAllowed = toPaise(contactBalance.receivable || 0);
    if (amtPaise > maxAllowed) {
      return {
        isValid: false,
        valid: false,
        error: `Repayment received (₹${fromPaise(amtPaise)}) exceeds outstanding receivable of ₹${contactBalance.receivable || 0}.`
      };
    }
  } else if (entryType === 'repay_paid') {
    const maxAllowed = toPaise(contactBalance.payable || 0);
    if (amtPaise > maxAllowed) {
      return {
        isValid: false,
        valid: false,
        error: `Repayment paid (₹${fromPaise(amtPaise)}) exceeds outstanding payable of ₹${contactBalance.payable || 0}.`
      };
    }
  } else {
    return { isValid: false, valid: false, error: 'Invalid repayment type.' };
  }

  return { isValid: true, valid: true, error: null };
}

/**
 * Validates input for adding / editing a person.
 */
export function validateContactInput({ name, phone, email, opening_balance }) {
  const errors = {};
  const trimmedName = (name || '').trim();

  if (!trimmedName) {
    errors.name = "Person's name is required.";
  } else if (trimmedName.length > 150) {
    errors.name = 'Name must not exceed 150 characters.';
  }

  if (email && email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
  }

  if (phone && phone.trim()) {
    if (phone.trim().length > 30) {
      errors.phone = 'Phone number is too long.';
    }
  }

  if (opening_balance !== undefined && opening_balance !== null && opening_balance !== '') {
    const ob = Number(opening_balance);
    if (isNaN(ob) || ob < 0) {
      errors.opening_balance = 'Opening balance must be a non-negative number.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Generates an idempotency key to prevent accidental double-taps on web and Android.
 */
export function generateIdempotencyKey(prefix = 'entry') {
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}
