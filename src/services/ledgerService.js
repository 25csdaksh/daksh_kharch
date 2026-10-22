/**
 * HisabSetu — My Ledger (Udhar Khatu) Service
 * Manages contacts, debt entries, repayments, adjustments, and account balances
 * with live Supabase RLS and robust LocalStorage fallback.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import {
  calculateContactBalance,
  calculateLedgerSummary,
  validateRepayment,
  validateContactInput,
  generateIdempotencyKey,
  toPaise,
  fromPaise
} from '../utils/ledgerEngine.js';

const STORAGE_KEYS = {
  CONTACTS: 'hisabsetu_ledger_contacts',
  ENTRIES: 'hisabsetu_ledger_entries'
};

function getLocalData(key, defaultVal = []) {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (err) {
    console.warn(`Error reading localStorage ${key}:`, err);
    return defaultVal;
  }
}

function setLocalData(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error writing localStorage ${key}:`, err);
  }
}

export function notifyLedgerChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ledger:changed'));
    window.dispatchEvent(new CustomEvent('account:changed'));
  }
}

// ============================================================================
// 1. CONTACTS / LEDGER ACCOUNTS CRUD
// ============================================================================

/**
 * Retrieves all ledger contacts for the user.
 */
export async function getContacts({ includeArchived = false } = {}) {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('ledger_contacts')
        .select('*')
        .order('name', { ascending: true });

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;
      if (!error && data) {
        setLocalData(STORAGE_KEYS.CONTACTS, data);
        return data;
      }
      console.warn('Supabase getContacts warning, using fallback:', error?.message);
    } catch (err) {
      console.warn('Supabase getContacts error, using fallback:', err.message);
    }
  }

  const list = getLocalData(STORAGE_KEYS.CONTACTS, []);
  return includeArchived ? list : list.filter((c) => !c.is_archived);
}

/**
 * Retrieves a single contact by ID.
 */
export async function getContactById(id) {
  if (!id) return null;
  const contacts = await getContacts({ includeArchived: true });
  return contacts.find((c) => c.id === id) || null;
}

/**
 * Creates a new ledger contact, with optional auditable opening balance.
 */
export async function createContact(payload) {
  const validation = validateContactInput(payload);
  if (!validation.isValid) {
    const firstErr = Object.values(validation.errors)[0];
    throw new Error(firstErr || 'Invalid contact data.');
  }

  const contactObj = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `contact-${Date.now()}`,
    name: payload.name.trim(),
    phone: payload.phone ? payload.phone.trim() : null,
    email: payload.email ? payload.email.trim() : null,
    notes: payload.notes ? payload.notes.trim() : null,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  let savedContact = contactObj;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const insertPayload = {
        name: contactObj.name,
        phone: contactObj.phone,
        email: contactObj.email,
        notes: contactObj.notes,
        is_archived: false
      };
      if (userRes?.user?.id) {
        insertPayload.user_id = userRes.user.id;
      }

      const { data, error } = await supabase
        .from('ledger_contacts')
        .insert([insertPayload])
        .select()
        .single();

      if (!error && data) {
        savedContact = data;
      } else {
        console.warn('Supabase createContact failed, saving locally:', error?.message);
      }
    } catch (err) {
      console.warn('Supabase createContact error, saving locally:', err.message);
    }
  }

  // Update local contacts cache
  const localContacts = getLocalData(STORAGE_KEYS.CONTACTS, []);
  const existingIndex = localContacts.findIndex((c) => c.id === savedContact.id);
  if (existingIndex >= 0) {
    localContacts[existingIndex] = savedContact;
  } else {
    localContacts.push(savedContact);
  }
  setLocalData(STORAGE_KEYS.CONTACTS, localContacts);

  // If an opening balance is specified, record it as an auditable 'opening' entry
  const obAmount = Number(payload.opening_balance || 0);
  if (obAmount > 0) {
    const obDirection = payload.opening_balance_direction || 'receivable'; // 'receivable' (they owe me) | 'payable' (I owe them)
    await recordEntry({
      contact_id: savedContact.id,
      entry_type: 'opening',
      direction: obDirection,
      amount: obAmount,
      transaction_date: payload.opening_balance_date || new Date().toISOString().split('T')[0],
      due_date: payload.due_date || null,
      description: 'Opening Balance',
      payment_method: 'Other',
      idempotency_key: generateIdempotencyKey('open')
    });
  }

  notifyLedgerChange();
  return savedContact;
}

/**
 * Updates an existing contact's details.
 */
export async function updateContact(id, payload) {
  if (!id) throw new Error('Contact ID is required.');
  const validation = validateContactInput(payload);
  if (!validation.isValid) {
    const firstErr = Object.values(validation.errors)[0];
    throw new Error(firstErr || 'Invalid contact data.');
  }

  const updates = {
    name: payload.name.trim(),
    phone: payload.phone ? payload.phone.trim() : null,
    email: payload.email ? payload.email.trim() : null,
    notes: payload.notes ? payload.notes.trim() : null,
    updated_at: new Date().toISOString()
  };

  let updatedRecord = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('ledger_contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        updatedRecord = data;
      }
    } catch (err) {
      console.warn('Supabase updateContact error, updating locally:', err.message);
    }
  }

  const localContacts = getLocalData(STORAGE_KEYS.CONTACTS, []);
  const index = localContacts.findIndex((c) => c.id === id);
  if (index >= 0) {
    localContacts[index] = { ...localContacts[index], ...updates };
    setLocalData(STORAGE_KEYS.CONTACTS, localContacts);
    if (!updatedRecord) updatedRecord = localContacts[index];
  }

  notifyLedgerChange();
  return updatedRecord;
}

/**
 * Toggles contact archived state (History is preserved, no destructive delete).
 */
export async function archiveContact(id, isArchived = true) {
  if (!id) throw new Error('Contact ID is required.');

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('ledger_contacts')
        .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase archiveContact error:', err.message);
    }
  }

  const localContacts = getLocalData(STORAGE_KEYS.CONTACTS, []);
  const index = localContacts.findIndex((c) => c.id === id);
  if (index >= 0) {
    localContacts[index].is_archived = isArchived;
    localContacts[index].updated_at = new Date().toISOString();
    setLocalData(STORAGE_KEYS.CONTACTS, localContacts);
  }

  notifyLedgerChange();
  return true;
}

/**
 * Permanently deletes a contact only if they have zero historical entries.
 */
export async function deleteContact(id) {
  if (!id) throw new Error('Contact ID is required.');
  const entries = await getEntries({ contactId: id });
  if (entries.length > 0) {
    throw new Error('Cannot delete contact with existing ledger entries. Archive the contact instead.');
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('ledger_contacts').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteContact error:', err.message);
    }
  }

  const localContacts = getLocalData(STORAGE_KEYS.CONTACTS, []);
  const filtered = localContacts.filter((c) => c.id !== id);
  setLocalData(STORAGE_KEYS.CONTACTS, filtered);

  notifyLedgerChange();
  return true;
}

// ============================================================================
// 2. LEDGER ENTRIES & REPAYMENTS
// ============================================================================

/**
 * Retrieves all ledger entries, optionally filtered by contactId.
 */
export async function getEntries({ contactId = null } = {}) {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('ledger_entries')
        .select('*')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      const { data, error } = await query;
      if (!error && data) {
        // Merge with local cache
        const allLocal = getLocalData(STORAGE_KEYS.ENTRIES, []);
        if (contactId) {
          const others = allLocal.filter((e) => e.contact_id !== contactId);
          setLocalData(STORAGE_KEYS.ENTRIES, [...others, ...data]);
        } else {
          setLocalData(STORAGE_KEYS.ENTRIES, data);
        }
        return data;
      }
      console.warn('Supabase getEntries warning, using fallback:', error?.message);
    } catch (err) {
      console.warn('Supabase getEntries error, using fallback:', err.message);
    }
  }

  const list = getLocalData(STORAGE_KEYS.ENTRIES, []);
  if (contactId) {
    return list.filter((e) => e.contact_id === contactId);
  }
  return list;
}

/**
 * Records a new ledger entry (lend, borrow, repay_received, repay_paid, adjustment).
 */
export async function recordEntry(payload) {
  const {
    contact_id,
    entry_type,
    amount,
    transaction_date,
    due_date = null,
    description = '',
    payment_method = 'Cash',
    reference_number = null,
    linked_account_id = null,
    original_entry_id = null,
    adjustment_reason = null,
    idempotency_key = null
  } = payload;

  if (!contact_id) throw new Error('Contact is required.');
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new Error('Transaction amount must be greater than zero.');
  }

  // Determine direction
  let direction = payload.direction;
  if (!direction) {
    if (entry_type === 'lend' || entry_type === 'repay_received') {
      direction = 'receivable';
    } else if (entry_type === 'borrow' || entry_type === 'repay_paid') {
      direction = 'payable';
    } else {
      direction = 'receivable';
    }
  }

  // Repayment bounds checking against current contact balance
  if (entry_type === 'repay_received' || entry_type === 'repay_paid') {
    const existingEntries = await getEntries({ contactId: contact_id });
    const contactBalance = calculateContactBalance(existingEntries);
    const validation = validateRepayment({
      amount: numAmount,
      entryType: entry_type,
      contactBalance
    });
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
  }

  // Idempotency check: prevent duplicate submissions
  const finalKey = idempotency_key || generateIdempotencyKey('entry');
  const localEntries = getLocalData(STORAGE_KEYS.ENTRIES, []);
  const duplicate = localEntries.find((e) => e.idempotency_key === finalKey);
  if (duplicate) {
    console.warn('Duplicate entry submission ignored by idempotency key:', finalKey);
    return duplicate;
  }

  const entryObj = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `entry-${Date.now()}`,
    contact_id,
    entry_type,
    direction,
    amount: fromPaise(toPaise(numAmount)),
    transaction_date: transaction_date || new Date().toISOString().split('T')[0],
    due_date: due_date || null,
    description: (description || '').trim() || null,
    payment_method: payment_method || 'Cash',
    reference_number: reference_number ? reference_number.trim() : null,
    linked_account_id: linked_account_id || null,
    original_entry_id: original_entry_id || null,
    adjustment_reason: adjustment_reason ? adjustment_reason.trim() : null,
    idempotency_key: finalKey,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  let savedEntry = entryObj;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const insertPayload = {
        contact_id: entryObj.contact_id,
        entry_type: entryObj.entry_type,
        direction: entryObj.direction,
        amount: entryObj.amount,
        transaction_date: entryObj.transaction_date,
        due_date: entryObj.due_date,
        description: entryObj.description,
        payment_method: entryObj.payment_method,
        reference_number: entryObj.reference_number,
        linked_account_id: entryObj.linked_account_id,
        original_entry_id: entryObj.original_entry_id,
        adjustment_reason: entryObj.adjustment_reason,
        idempotency_key: entryObj.idempotency_key
      };
      if (userRes?.user?.id) {
        insertPayload.user_id = userRes.user.id;
      }

      const { data, error } = await supabase
        .from('ledger_entries')
        .insert([insertPayload])
        .select()
        .single();

      if (!error && data) {
        savedEntry = data;
      } else {
        console.warn('Supabase recordEntry error, saving locally:', error?.message);
      }
    } catch (err) {
      console.warn('Supabase recordEntry error, saving locally:', err.message);
    }
  }

  localEntries.unshift(savedEntry);
  setLocalData(STORAGE_KEYS.ENTRIES, localEntries);

  notifyLedgerChange();
  return savedEntry;
}

/**
 * Creates an audited reversal/adjustment entry rather than silently deleting history.
 */
export async function reverseEntry(entryId, reason = 'Entry reversed by user') {
  if (!entryId) throw new Error('Entry ID is required.');
  const entries = await getEntries();
  const target = entries.find((e) => e.id === entryId);
  if (!target) throw new Error('Original ledger entry not found.');

  // Determine reversal entry type
  let reversalType = 'adjustment';
  let reversalDirection = target.direction;

  if (target.entry_type === 'lend') {
    // Reversing a loan: record an adjustment in payable direction or repay_received
    reversalType = 'adjustment';
    reversalDirection = 'payable';
  } else if (target.entry_type === 'borrow') {
    reversalType = 'adjustment';
    reversalDirection = 'receivable';
  } else if (target.entry_type === 'repay_received') {
    reversalType = 'adjustment';
    reversalDirection = 'receivable';
  } else if (target.entry_type === 'repay_paid') {
    reversalType = 'adjustment';
    reversalDirection = 'payable';
  }

  const reversalEntry = await recordEntry({
    contact_id: target.contact_id,
    entry_type: reversalType,
    direction: reversalDirection,
    amount: target.amount,
    transaction_date: new Date().toISOString().split('T')[0],
    description: `Reversal of entry dated ${target.transaction_date}: ${target.description || ''}`.trim(),
    adjustment_reason: reason,
    original_entry_id: target.id,
    payment_method: target.payment_method,
    idempotency_key: generateIdempotencyKey('rev')
  });

  return reversalEntry;
}

/**
 * Computes individual contact summary with entries and balance.
 */
export async function getContactSummary(contactId) {
  const contact = await getContactById(contactId);
  if (!contact) return null;
  const entries = await getEntries({ contactId });
  const balance = calculateContactBalance(entries);

  return {
    contact,
    entries,
    balance
  };
}

/**
 * Computes global ledger overview for the main dashboard.
 */
export async function getLedgerOverview() {
  const contacts = await getContacts({ includeArchived: false });
  const entries = await getEntries();
  const summary = calculateLedgerSummary(contacts, entries);

  // Attach calculated balance to each contact
  const contactsWithBalance = contacts.map((c) => {
    const contactEntries = entries.filter((e) => e.contact_id === c.id);
    const balance = calculateContactBalance(contactEntries);
    return {
      ...c,
      balance
    };
  });

  // Recent activity: latest 10 entries with contact names
  const contactMap = new Map(contacts.map((c) => [c.id, c.name]));
  const recentActivity = entries.slice(0, 10).map((e) => ({
    ...e,
    contact_name: contactMap.get(e.contact_id) || 'Unknown Person'
  }));

  return {
    summary,
    contacts: contactsWithBalance,
    recentActivity
  };
}
