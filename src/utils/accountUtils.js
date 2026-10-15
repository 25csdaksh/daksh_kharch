/**
 * HisabSetu — Account, Wallet & Transfer Utilities
 * Provides financial balance mathematics, type definitions, and validation logic.
 */

export const ACCOUNT_TYPES = [
  { id: 'cash', label: 'Cash in Hand', category: 'asset', defaultColor: '#10B981', defaultIcon: 'Coins' },
  { id: 'bank', label: 'Bank Account', category: 'asset', defaultColor: '#2563EB', defaultIcon: 'Landmark' },
  { id: 'wallet', label: 'UPI / Digital Wallet', category: 'asset', defaultColor: '#8B5CF6', defaultIcon: 'Smartphone' },
  { id: 'savings', label: 'Savings & Deposits', category: 'asset', defaultColor: '#059669', defaultIcon: 'PiggyBank' },
  { id: 'credit_card', label: 'Credit Card', category: 'liability', defaultColor: '#DC2626', defaultIcon: 'CreditCard' },
  { id: 'other', label: 'Other Account', category: 'asset', defaultColor: '#64748B', defaultIcon: 'Wallet' }
];

export const ALLOWED_ACCOUNT_TYPES = ACCOUNT_TYPES.map((t) => t.id);

export const INCOME_SOURCES = [
  'Salary',
  'Business',
  'Freelance',
  'Investments',
  'Rental',
  'Gifts',
  'Refund',
  'Other'
];

export const ACCOUNT_PRESETS = [
  { name: 'Cash in Hand', type: 'cash', opening_balance: 1000, color: '#10B981' },
  { name: 'Salary Bank Account', type: 'bank', opening_balance: 25000, color: '#2563EB' },
  { name: 'Emergency Savings', type: 'savings', opening_balance: 50000, color: '#059669' },
  { name: 'UPI Digital Wallet', type: 'wallet', opening_balance: 2000, color: '#8B5CF6' },
  { name: 'Primary Credit Card', type: 'credit_card', opening_balance: 0, color: '#DC2626' }
];

/**
 * Checks whether an account type represents a liability (e.g. credit card)
 */
export function isLiabilityAccount(type) {
  return type === 'credit_card';
}

/**
 * Decimal-safe round to 2 fractional places.
 */
export function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Computes individual account balance based on transactions:
 * 
 * For Asset accounts (Cash, Bank, Wallet, Savings, Other):
 * Balance = opening_balance + incomes - expenses - transfers_out + transfers_in
 * 
 * For Credit Card liability accounts:
 * Outstanding Debt = opening_balance + expenses + transfers_out - transfers_in (transfers in represent bill payments)
 * Net Asset Value = - (Outstanding Debt)
 */
export function calculateAccountBalance({
  account,
  expenses = [],
  incomes = [],
  transfersOut = [],
  transfersIn = []
}) {
  if (!account) return { balance: 0, outstandingDebt: 0, netContribution: 0 };

  const opening = Number(account.opening_balance) || 0;
  const isCredit = isLiabilityAccount(account.type);

  // Sum confirmed expenses linked to this account
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Sum incomes linked to this account
  const totalIncomes = incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // Sum transfers where this account was the source (money leaving)
  const totalTransfersOut = transfersOut.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Sum transfers where this account was the destination (money entering / debt paid)
  const totalTransfersIn = transfersIn.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  if (isCredit) {
    // For credit cards:
    // Opening balance represents initial unpaid debt
    // Expenses increase debt
    // Transfers out (e.g. cash advance from card) increase debt
    // Transfers in (e.g. payment made from bank to card) decrease debt
    const debt = round2(opening + totalExpenses + totalTransfersOut - totalTransfersIn);
    const outstandingDebt = Math.max(0, debt); // non-negative debt display
    const netContribution = round2(-debt);

    return {
      balance: netContribution,
      outstandingDebt: debt,
      netContribution,
      isLiability: true,
      totalExpenses: round2(totalExpenses),
      totalPayments: round2(totalTransfersIn),
      totalTransfersOut: round2(totalTransfersOut)
    };
  }

  // Asset accounts:
  const balance = round2(opening + totalIncomes - totalExpenses - totalTransfersOut + totalTransfersIn);

  return {
    balance,
    outstandingDebt: 0,
    netContribution: balance,
    isLiability: false,
    totalExpenses: round2(totalExpenses),
    totalIncomes: round2(totalIncomes),
    totalTransfersOut: round2(totalTransfersOut),
    totalTransfersIn: round2(totalTransfersIn)
  };
}

/**
 * Computes portfolio financial overview across all accounts:
 * - Total Liquid Assets (Cash + Bank + Wallets + Savings)
 * - Total Credit Card Liabilities (Sum of outstanding card balances)
 * - Net Worth = Liquid Assets - Credit Card Liabilities
 */
export function calculateNetWorthSummary(accountsWithBalances = []) {
  let totalLiquidAssets = 0;
  let totalCreditLiabilities = 0;

  for (const item of accountsWithBalances) {
    if (item.is_archived) continue;

    if (isLiabilityAccount(item.type)) {
      const debt = Number(item.computed?.outstandingDebt ?? 0);
      if (debt > 0) {
        totalCreditLiabilities += debt;
      }
    } else {
      const bal = Number(item.computed?.balance ?? 0);
      totalLiquidAssets += bal;
    }
  }

  totalLiquidAssets = round2(totalLiquidAssets);
  totalCreditLiabilities = round2(totalCreditLiabilities);
  const netWorth = round2(totalLiquidAssets - totalCreditLiabilities);

  return {
    totalLiquidAssets,
    totalCreditLiabilities,
    netWorth
  };
}

/**
 * Validates an Account creation / edit payload.
 */
export function validateAccountInput(payload) {
  const errors = {};

  if (!payload.name || typeof payload.name !== 'string' || !payload.name.trim()) {
    errors.name = 'Account name is required.';
  } else if (payload.name.trim().length > 100) {
    errors.name = 'Account name cannot exceed 100 characters.';
  }

  if (!payload.type || !ALLOWED_ACCOUNT_TYPES.includes(payload.type)) {
    errors.type = `Account type must be one of: ${ALLOWED_ACCOUNT_TYPES.join(', ')}`;
  }

  if (payload.opening_balance !== undefined && payload.opening_balance !== null && payload.opening_balance !== '') {
    const num = Number(payload.opening_balance);
    if (isNaN(num) || !isFinite(num)) {
      errors.opening_balance = 'Opening balance must be a valid number.';
    } else if (num < 0 && payload.type !== 'credit_card') {
      errors.opening_balance = 'Opening balance for asset accounts cannot be negative.';
    } else if (Math.abs(num) > 9999999999.99) {
      errors.opening_balance = 'Opening balance exceeds maximum permitted value.';
    }
  }

  if (payload.notes && payload.notes.length > 500) {
    errors.notes = 'Notes cannot exceed 500 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates a Transfer creation payload.
 */
export function validateTransferInput(payload, sourceAccount = null) {
  const errors = {};

  if (!payload.source_account_id) {
    errors.source_account_id = 'Source account is required.';
  }

  if (!payload.destination_account_id) {
    errors.destination_account_id = 'Destination account is required.';
  }

  if (payload.source_account_id && payload.destination_account_id && payload.source_account_id === payload.destination_account_id) {
    errors.destination_account_id = 'Source and destination accounts must be different.';
  }

  if (payload.amount === undefined || payload.amount === null || payload.amount === '') {
    errors.amount = 'Transfer amount is required.';
  } else {
    const num = Number(payload.amount);
    if (isNaN(num) || !isFinite(num)) {
      errors.amount = 'Transfer amount must be a valid number.';
    } else if (num <= 0) {
      errors.amount = 'Transfer amount must be greater than zero.';
    } else if (num > 9999999999.99) {
      errors.amount = 'Transfer amount exceeds maximum permitted limit.';
    }
  }

  if (!payload.transfer_date) {
    errors.transfer_date = 'Transfer date is required.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.transfer_date)) {
    errors.transfer_date = 'Transfer date must be in YYYY-MM-DD format.';
  }

  if (payload.note && payload.note.length > 500) {
    errors.note = 'Note cannot exceed 500 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates an Income creation payload.
 */
export function validateIncomeInput(payload) {
  const errors = {};

  if (payload.amount === undefined || payload.amount === null || payload.amount === '') {
    errors.amount = 'Income amount is required.';
  } else {
    const num = Number(payload.amount);
    if (isNaN(num) || !isFinite(num)) {
      errors.amount = 'Income amount must be a valid number.';
    } else if (num <= 0) {
      errors.amount = 'Income amount must be greater than zero.';
    } else if (num > 9999999999.99) {
      errors.amount = 'Income amount exceeds maximum permitted limit.';
    }
  }

  if (!payload.source || !INCOME_SOURCES.includes(payload.source)) {
    errors.source = `Income source must be one of: ${INCOME_SOURCES.join(', ')}`;
  }

  if (!payload.income_date) {
    errors.income_date = 'Income date is required.';
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.income_date)) {
    errors.income_date = 'Income date must be in YYYY-MM-DD format.';
  }

  if (payload.description && payload.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
