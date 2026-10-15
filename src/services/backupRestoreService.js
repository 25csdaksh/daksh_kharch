/**
 * HisabSetu — Complete User Data Backup & Safe Restore Engine
 * Implements versioned JSON backup generation, structural and referential validation,
 * duplicate detection, user_id remapping to authenticated user, and staged restoration.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { downloadFile } from '../utils/fileDownloader.js';

export const BACKUP_SCHEMA_VERSION = '1.0.0';
export const APP_IDENTIFIER = 'HisabSetu';

export const TABLE_RESTORE_ORDER = [
  'split_friends',
  'accounts',
  'budgets',
  'expenses',
  'incomes',
  'transfers',
  'recurring_expenses',
  'recurring_expense_occurrences',
  'savings_goals',
  'goal_transactions',
  'shared_expenses',
  'shared_expense_shares',
  'shared_expense_settlements'
];

/**
 * Creates a versioned backup envelope object.
 */
export function createBackupEnvelope(backupData, user = {}) {
  const counts = {};
  let totalRecords = 0;
  Object.entries(backupData || {}).forEach(([tbl, rows]) => {
    const len = Array.isArray(rows) ? rows.length : 0;
    counts[tbl] = len;
    totalRecords += len;
  });

  const now = new Date();
  const timestampIso = now.toISOString();

  return {
    app: APP_IDENTIFIER,
    app_version: '0.1.0',
    schema_version: BACKUP_SCHEMA_VERSION,
    format: 'application/json',
    exported_at: timestampIso,
    generated_at: timestampIso,
    user_id: user.id || null,
    user_email: user.email || 'Authenticated User',
    total_records: totalRecords,
    record_counts: counts,
    data: backupData
  };
}

/**
 * Creates and downloads a complete, versioned JSON backup of all financial data for the authenticated user.
 */
export async function createAndDownloadBackup(user) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const userId = user?.id;
  if (!userId) {
    throw new Error('User authentication required to export data backup.');
  }

  // Fetch all 13 user-scoped tables concurrently
  const [
    accountsRes,
    expensesRes,
    incomesRes,
    transfersRes,
    budgetsRes,
    recurringRes,
    occurrencesRes,
    goalsRes,
    goalTxRes,
    friendsRes,
    sharedExpRes,
    sharedSharesRes,
    settlementsRes
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', userId),
    supabase.from('expenses').select('*').eq('user_id', userId),
    supabase.from('incomes').select('*').eq('user_id', userId),
    supabase.from('transfers').select('*').eq('user_id', userId),
    supabase.from('budgets').select('*').eq('user_id', userId),
    supabase.from('recurring_expenses').select('*').eq('user_id', userId),
    supabase.from('recurring_expense_occurrences').select('*').eq('user_id', userId),
    supabase.from('savings_goals').select('*').eq('user_id', userId),
    supabase.from('goal_transactions').select('*').eq('user_id', userId),
    supabase.from('split_friends').select('*').eq('user_id', userId),
    supabase.from('shared_expenses').select('*').eq('user_id', userId),
    supabase.from('shared_expense_shares').select('*'), // Filtered via shared_expense_id
    supabase.from('shared_expense_settlements').select('*').eq('user_id', userId)
  ]);

  // Check for critical fetch errors
  const errors = [
    accountsRes.error, expensesRes.error, incomesRes.error, transfersRes.error,
    budgetsRes.error, recurringRes.error, goalsRes.error
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error('Errors encountered while querying backup data:', errors);
    throw new Error(`Backup generation failed: ${errors[0].message}`);
  }

  // Filter shared expense shares strictly to those belonging to user's shared_expenses
  const userSharedExpenseIds = new Set((sharedExpRes.data || []).map((s) => s.id));
  const userShares = (sharedSharesRes.data || []).filter((share) =>
    userSharedExpenseIds.has(share.shared_expense_id)
  );

  const backupData = {
    accounts: accountsRes.data || [],
    expenses: expensesRes.data || [],
    incomes: incomesRes.data || [],
    transfers: transfersRes.data || [],
    budgets: budgetsRes.data || [],
    recurring_expenses: recurringRes.data || [],
    recurring_expense_occurrences: occurrencesRes.data || [],
    savings_goals: goalsRes.data || [],
    goal_transactions: goalTxRes.data || [],
    split_friends: friendsRes.data || [],
    shared_expenses: sharedExpRes.data || [],
    shared_expense_shares: userShares,
    shared_expense_settlements: settlementsRes.data || []
  };

  const backupEnvelope = createBackupEnvelope(backupData, user);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const filename = `HisabSetu_Backup_${dateStr}_${timeStr}.json`;

  const jsonString = JSON.stringify(backupEnvelope, null, 2);
  await downloadFile(jsonString, filename, 'application/json');

  return {
    filename,
    totalRecords: backupEnvelope.total_records,
    counts: backupEnvelope.record_counts,
    exportedAt: backupEnvelope.exported_at
  };
}


/**
 * Validates a parsed or raw JSON backup file before any database writes.
 */
export function validateBackupFile(fileContent) {
  let parsed = null;
  try {
    parsed = typeof fileContent === 'string' ? JSON.parse(fileContent) : fileContent;
  } catch (err) {
    const errorMsg = `Invalid JSON format: ${err.message}`;
    return {
      isValid: false,
      error: errorMsg,
      errors: [errorMsg],
      warnings: [],
      metadata: null
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    const errorMsg = 'Backup content is empty or not a valid JSON object.';
    return { isValid: false, error: errorMsg, errors: [errorMsg], warnings: [], metadata: null };
  }

  if (parsed.app !== APP_IDENTIFIER) {
    const errorMsg = `Invalid application signature: identifier is '${parsed.app || 'unknown'}', expected '${APP_IDENTIFIER}'.`;
    return {
      isValid: false,
      error: errorMsg,
      errors: [errorMsg],
      warnings: [],
      metadata: null
    };
  }

  if (!parsed.schema_version) {
    const errorMsg = 'Missing backup schema version.';
    return {
      isValid: false,
      error: errorMsg,
      errors: [errorMsg],
      warnings: [],
      metadata: null
    };
  }

  if (parsed.schema_version !== BACKUP_SCHEMA_VERSION) {
    const errorMsg = `Unsupported backup schema version ${parsed.schema_version}. Supported version is ${BACKUP_SCHEMA_VERSION}.`;
    return {
      isValid: false,
      error: errorMsg,
      errors: [errorMsg],
      warnings: [],
      metadata: null
    };
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    const errorMsg = 'Backup envelope does not contain a valid "data" property.';
    return { isValid: false, error: errorMsg, errors: [errorMsg], warnings: [], metadata: null };
  }

  const warnings = [];
  const errors = [];
  const requiredTables = [
    'accounts', 'expenses', 'incomes', 'transfers', 'budgets',
    'recurring_expenses', 'savings_goals'
  ];

  for (const tbl of requiredTables) {
    if (!Array.isArray(parsed.data[tbl])) {
      warnings.push(`Table '${tbl}' is missing from backup data; treated as empty array.`);
    }
  }

  // Validate record integrity: check that IDs are non-empty strings and numbers are valid
  const accounts = parsed.data.accounts || [];
  const expenses = parsed.data.expenses || [];
  const transfers = parsed.data.transfers || [];

  for (const acc of accounts) {
    if (!acc.id || !acc.name || typeof acc.name !== 'string') {
      errors.push(`Corrupt account record ${acc.id || 'unknown'}: missing id or name.`);
    }
    if (acc.balance !== undefined && isNaN(Number(acc.balance))) {
      errors.push(`Corrupt account record ${acc.id}: balance must be numeric.`);
    }
  }

  for (const exp of expenses) {
    if (isNaN(Number(exp.amount)) || Number(exp.amount) <= 0) {
      errors.push(`Invalid expense amount on record ${exp.id}: must be positive.`);
    }
    if (!exp.expense_date || isNaN(new Date(exp.expense_date).getTime())) {
      errors.push(`Invalid date format on expense record ${exp.id}.`);
    }
  }

  for (const tx of transfers) {
    if (!tx.source_account_id || !tx.destination_account_id) {
      errors.push(`Corrupt transfer record ${tx.id}: missing source or destination account.`);
    }
    if (tx.source_account_id === tx.destination_account_id) {
      errors.push(`Transfer record ${tx.id} has identical source and destination account.`);
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors[0],
      errors,
      warnings,
      metadata: null
    };
  }

  return {
    isValid: true,
    error: null,
    errors: [],
    backup: parsed,
    warnings,
    metadata: {
      schemaVersion: parsed.schema_version,
      app: parsed.app,
      totalRecords: parsed.total_records
    }
  };
}

/**
 * Previews the backup against the current user's database.
 * Detects existing records by ID to avoid duplicates and calculates new items.
 */
export async function previewBackupData(backupEnvelope, currentUserIdOrMap) {
  const data = backupEnvelope.data || {};
  const isMap = typeof currentUserIdOrMap === 'object' && currentUserIdOrMap !== null;
  const currentUserId = isMap ? null : currentUserIdOrMap;

  let existingMap = isMap ? currentUserIdOrMap : {};

  if (!isMap && isSupabaseConfigured && supabase && currentUserId) {
    try {
      const [existingAccs, existingExps, existingTxs, existingBudgets, existingGoals] = await Promise.all([
        supabase.from('accounts').select('id').eq('user_id', currentUserId),
        supabase.from('expenses').select('id').eq('user_id', currentUserId),
        supabase.from('transfers').select('id').eq('user_id', currentUserId),
        supabase.from('budgets').select('id').eq('user_id', currentUserId),
        supabase.from('savings_goals').select('id').eq('user_id', currentUserId)
      ]);

      existingMap = {
        accounts: new Set((existingAccs.data || []).map((r) => r.id)),
        expenses: new Set((existingExps.data || []).map((r) => r.id)),
        transfers: new Set((existingTxs.data || []).map((r) => r.id)),
        budgets: new Set((existingBudgets.data || []).map((r) => r.id)),
        savings_goals: new Set((existingGoals.data || []).map((r) => r.id))
      };
    } catch (_) {}
  }

  const preview = {
    totalIncomingRecords: 0,
    totalRecordsInFile: 0,
    newRecordsCount: 0,
    duplicateRecordsCount: 0,
    tableCounts: {},
    duplicateCounts: {},
    newCounts: {},
    tables: {},
    isCrossUserBackup: currentUserId ? backupEnvelope.user_id !== currentUserId : false
  };

  Object.entries(data).forEach(([tbl, rows]) => {
    if (!Array.isArray(rows)) return;
    const count = rows.length;
    preview.totalIncomingRecords += count;
    preview.tableCounts[tbl] = count;

    const existingSet = existingMap[tbl] || new Set();
    let dupes = 0;
    rows.forEach((r) => {
      if (r.id && existingSet.has(r.id)) {
        dupes += 1;
      }
    });

    const newItems = count - dupes;
    preview.duplicateCounts[tbl] = dupes;
    preview.newCounts[tbl] = newItems;
    preview.duplicateRecordsCount += dupes;
    preview.newRecordsCount += newItems;
    preview.tables[tbl] = { count, newCount: newItems, duplicateCount: dupes };
  });

  preview.totalRecordsInFile = preview.totalIncomingRecords;
  return preview;
}

/**

 * Safely restores backup data into the current user's database.
 * NEVER overwrites without permission. Re-associates ALL rows with currentUserId.
 * Strictly respects foreign-key dependency order.
 */
export async function executeRestore(backupEnvelope, currentUserId, options = { skipDuplicates: true }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const validation = validateBackupFile(backupEnvelope);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const data = backupEnvelope.data;
  const skipDuplicates = options.skipDuplicates !== false;

  const results = {
    success: true,
    totalProcessed: 0,
    totalInserted: 0,
    totalSkipped: 0,
    tableResults: {},
    errors: []
  };

  // Safe Foreign-Key Dependency Ordered Tables
  const orderedTables = TABLE_RESTORE_ORDER;


  for (const tbl of orderedTables) {
    const records = data[tbl] || [];
    if (records.length === 0) continue;

    results.tableResults[tbl] = { incoming: records.length, inserted: 0, skipped: 0 };
    results.totalProcessed += records.length;

    // Check existing records if skipDuplicates is on
    let existingIds = new Set();
    if (skipDuplicates) {
      try {
        let q = supabase.from(tbl).select('id');
        if (tbl !== 'shared_expense_shares') {
          q = q.eq('user_id', currentUserId);
        }
        const { data: existingRows } = await q;
        if (existingRows) {
          existingIds = new Set(existingRows.map((r) => r.id));
        }
      } catch (_) {}
    }

    // Filter and sanitize rows
    const toInsert = [];
    for (const rawRecord of records) {
      if (skipDuplicates && rawRecord.id && existingIds.has(rawRecord.id)) {
        results.tableResults[tbl].skipped += 1;
        results.totalSkipped += 1;
        continue;
      }

      // CRITICAL SECURITY ENFORCEMENT:
      // Always overwrite user_id with the currently authenticated user! Never trust imported user_id!
      const sanitized = { ...rawRecord };
      if (tbl !== 'shared_expense_shares') {
        sanitized.user_id = currentUserId;
      }

      toInsert.push(sanitized);
    }

    if (toInsert.length > 0) {
      try {
        // Chunk inserts to avoid large payload errors (50 per batch)
        const chunkSize = 50;
        for (let i = 0; i < toInsert.length; i += chunkSize) {
          const chunk = toInsert.slice(i, i + chunkSize);
          const { error: insErr } = await supabase.from(tbl).upsert(chunk, { onConflict: 'id', ignoreDuplicates: skipDuplicates });
          if (insErr) {
            console.error(`Error inserting into ${tbl}:`, insErr.message);
            results.errors.push(`Table ${tbl}: ${insErr.message}`);
          } else {
            results.tableResults[tbl].inserted += chunk.length;
            results.totalInserted += chunk.length;
          }
        }
      } catch (batchErr) {
        results.errors.push(`Table ${tbl} batch error: ${batchErr.message}`);
      }
    }
  }

  // Trigger global application refresh events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('expense:changed'));
    window.dispatchEvent(new CustomEvent('account:changed'));
    window.dispatchEvent(new CustomEvent('budget:changed'));
    window.dispatchEvent(new CustomEvent('recurring:changed'));
    window.dispatchEvent(new CustomEvent('goal:changed'));
    window.dispatchEvent(new CustomEvent('split:changed'));
  }

  return results;
}
