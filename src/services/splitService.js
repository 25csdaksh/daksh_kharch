/**
 * HisabSetu Split Service
 * Comprehensive data service for Friends, Shared Expenses, Participant Shares,
 * Settlements, and Balance calculations with dual live Supabase RLS and robust LocalStorage fallback.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { calculateBalances, simplifySettlements, toPaise, fromPaise } from '../utils/splitEngine.js';
import { getTodayLocalDateString } from '../utils/dateUtils.js';

const STORAGE_KEYS = {
  FRIENDS: 'hisabsetu_split_friends',
  EXPENSES: 'hisabsetu_shared_expenses',
  SHARES: 'hisabsetu_shared_shares',
  SETTLEMENTS: 'hisabsetu_shared_settlements'
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

function notifySplitChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('split:changed'));
  }
}

// ============================================================================
// 1. FRIENDS CRUD
// ============================================================================

export async function getFriends({ includeArchived = false } = {}) {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('split_friends').select('*').order('name', { ascending: true });
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }
      const { data, error } = await query;
      if (!error && data) {
        setLocalData(STORAGE_KEYS.FRIENDS, data);
        return data;
      }
      console.warn('Supabase getFriends failed or table not found, using local fallback:', error?.message);
    } catch (e) {
      console.warn('Supabase getFriends error, fallback to local:', e.message);
    }
  }

  const list = getLocalData(STORAGE_KEYS.FRIENDS, []);
  return includeArchived ? list : list.filter((f) => !f.is_archived);
}

export async function createFriend({ name, phone = null, email = null, notes = null }) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) throw new Error('Friend display name is required.');

  const friendObj = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `friend-${Date.now()}`,
    name: trimmedName,
    phone: phone ? phone.trim() : null,
    email: email ? email.trim() : null,
    notes: notes ? notes.trim() : null,
    is_archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: user } = await supabase.auth.getUser();
      const payload = {
        name: friendObj.name,
        phone: friendObj.phone,
        email: friendObj.email,
        notes: friendObj.notes,
        is_archived: false
      };
      if (user?.user?.id) {
        payload.user_id = user.user.id;
      }

      const { data, error } = await supabase.from('split_friends').insert([payload]).select().single();
      if (!error && data) {
        const local = getLocalData(STORAGE_KEYS.FRIENDS, []);
        setLocalData(STORAGE_KEYS.FRIENDS, [...local, data]);
        notifySplitChange();
        return data;
      }
      console.warn('Supabase createFriend failed, saving locally:', error?.message);
    } catch (e) {
      console.warn('Supabase createFriend error, saving locally:', e.message);
    }
  }

  const local = getLocalData(STORAGE_KEYS.FRIENDS, []);
  // Check for duplicate name
  const existing = local.find((f) => f.name.toLowerCase() === trimmedName.toLowerCase() && !f.is_archived);
  if (existing) {
    throw new Error(`A friend named "${trimmedName}" already exists.`);
  }

  const updated = [...local, friendObj];
  setLocalData(STORAGE_KEYS.FRIENDS, updated);
  notifySplitChange();
  return friendObj;
}

export async function updateFriend(id, { name, phone, email, notes, is_archived }) {
  if (!id) throw new Error('Friend ID is required for update.');

  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone ? phone.trim() : null;
  if (email !== undefined) updates.email = email ? email.trim() : null;
  if (notes !== undefined) updates.notes = notes ? notes.trim() : null;
  if (is_archived !== undefined) updates.is_archived = Boolean(is_archived);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('split_friends')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const local = getLocalData(STORAGE_KEYS.FRIENDS, []);
        setLocalData(STORAGE_KEYS.FRIENDS, local.map((f) => (f.id === id ? data : f)));
        notifySplitChange();
        return data;
      }
    } catch (e) {
      console.warn('Supabase updateFriend fallback:', e.message);
    }
  }

  const local = getLocalData(STORAGE_KEYS.FRIENDS, []);
  const updated = local.map((f) => (f.id === id ? { ...f, ...updates } : f));
  setLocalData(STORAGE_KEYS.FRIENDS, updated);
  notifySplitChange();
  return updated.find((f) => f.id === id);
}

export async function archiveFriend(id) {
  return updateFriend(id, { is_archived: true });
}

export async function deleteFriend(id) {
  if (!id) throw new Error('Friend ID is required for deletion.');

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('split_friends').delete().eq('id', id);
      if (!error) {
        const local = getLocalData(STORAGE_KEYS.FRIENDS, []);
        setLocalData(STORAGE_KEYS.FRIENDS, local.filter((f) => f.id !== id));
        notifySplitChange();
        return true;
      }
    } catch (e) {
      console.warn('Supabase deleteFriend fallback:', e.message);
    }
  }

  const local = getLocalData(STORAGE_KEYS.FRIENDS, []);
  setLocalData(STORAGE_KEYS.FRIENDS, local.filter((f) => f.id !== id));
  notifySplitChange();
  return true;
}

// ============================================================================
// 2. SHARED EXPENSES & SHARES CRUD
// ============================================================================

export async function getSharedExpenses({ friendId, startDate, endDate, category, search } = {}) {
  let expenses = [];

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('shared_expenses')
        .select(`
          *,
          shares:shared_expense_shares(*)
        `)
        .order('expense_date', { ascending: false });

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }
      if (startDate) query = query.gte('expense_date', startDate);
      if (endDate) query = query.lte('expense_date', endDate);
      if (search && search.trim()) query = query.ilike('title', `%${search.trim()}%`);

      const { data, error } = await query;
      if (!error && data) {
        expenses = data;
        setLocalData(STORAGE_KEYS.EXPENSES, data);
      }
    } catch (e) {
      console.warn('Supabase getSharedExpenses fallback:', e.message);
    }
  }

  if (expenses.length === 0) {
    expenses = getLocalData(STORAGE_KEYS.EXPENSES, []);
    const allShares = getLocalData(STORAGE_KEYS.SHARES, []);

    expenses = expenses.map((exp) => ({
      ...exp,
      shares: exp.shares || allShares.filter((s) => s.shared_expense_id === exp.id)
    }));

    if (category && category !== 'All') {
      expenses = expenses.filter((e) => e.category === category);
    }
    if (startDate) {
      expenses = expenses.filter((e) => e.expense_date >= startDate);
    }
    if (endDate) {
      expenses = expenses.filter((e) => e.expense_date <= endDate);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      expenses = expenses.filter((e) => e.title.toLowerCase().includes(q));
    }
  }

  if (friendId) {
    expenses = expenses.filter((exp) => {
      const isPayer = String(exp.paid_by_friend_id) === String(friendId);
      const isParticipant = (exp.shares || []).some(
        (s) => String(s.friend_id) === String(friendId)
      );
      return isPayer || isParticipant;
    });
  }

  return expenses;
}

export async function getSharedExpenseById(id) {
  if (!id) throw new Error('Shared expense ID is required.');

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('shared_expenses')
        .select(`
          *,
          shares:shared_expense_shares(*)
        `)
        .eq('id', id)
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase getSharedExpenseById fallback:', e.message);
    }
  }

  const all = await getSharedExpenses();
  return all.find((e) => e.id === id) || null;
}

/**
 * Creates a shared expense with its participant shares atomically.
 * Optionally records the logged-in user's own share into personal expenses
 * without double-counting the full bill.
 */
export async function createSharedExpense({
  title,
  totalAmount,
  category = 'Food',
  expenseDate = getTodayLocalDateString(),
  paidByFriendId = null,
  splitMethod = 'equal',
  shares = [],
  notes = null,
  alsoAddToPersonalExpenses = false
}) {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) throw new Error('Expense title is required.');
  const total = parseFloat(Number(totalAmount).toFixed(2));
  if (isNaN(total) || total <= 0) throw new Error('Total amount must be greater than zero.');
  if (!shares || shares.length === 0) throw new Error('At least one participant share is required.');

  // Validate sum of shares matches total amount
  const sharesPaise = shares.reduce((acc, s) => acc + toPaise(s.shareAmount), 0);
  const totalPaise = toPaise(total);
  if (sharesPaise !== totalPaise) {
    throw new Error(
      `Participant shares (${fromPaise(sharesPaise)}) must equal the total bill (${fromPaise(totalPaise)}).`
    );
  }

  const expenseId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`;
  const now = new Date().toISOString();

  const expenseRecord = {
    id: expenseId,
    title: cleanTitle,
    total_amount: total,
    category,
    expense_date: expenseDate,
    paid_by_friend_id: paidByFriendId || null,
    split_method: splitMethod,
    notes: notes ? notes.trim() : null,
    created_at: now,
    updated_at: now
  };

  const shareRecords = shares.map((s) => ({
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `share-${Date.now()}-${Math.random()}`,
    shared_expense_id: expenseId,
    friend_id: s.participantId === null || s.participantId === 'USER' ? null : s.participantId,
    share_amount: parseFloat(Number(s.shareAmount).toFixed(2)),
    created_at: now
  }));

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: user } = await supabase.auth.getUser();
      const expPayload = { ...expenseRecord };
      if (user?.user?.id) expPayload.user_id = user.user.id;

      const { data: createdExp, error: expErr } = await supabase
        .from('shared_expenses')
        .insert([expPayload])
        .select()
        .single();

      if (!expErr && createdExp) {
        const { error: sharesErr } = await supabase
          .from('shared_expense_shares')
          .insert(shareRecords);

        if (!sharesErr) {
          createdExp.shares = shareRecords;
          const localExp = getLocalData(STORAGE_KEYS.EXPENSES, []);
          setLocalData(STORAGE_KEYS.EXPENSES, [createdExp, ...localExp]);

          // Handle optional personal expense entry
          if (alsoAddToPersonalExpenses) {
            await recordPersonalShareIfNeeded(createdExp, shareRecords);
          }

          notifySplitChange();
          return createdExp;
        }
      }
      console.warn('Supabase createSharedExpense failed, saving locally:', expErr?.message);
    } catch (e) {
      console.warn('Supabase createSharedExpense error, saving locally:', e.message);
    }
  }

  // Local storage fallback
  const fullExp = { ...expenseRecord, shares: shareRecords };
  const localExp = getLocalData(STORAGE_KEYS.EXPENSES, []);
  setLocalData(STORAGE_KEYS.EXPENSES, [fullExp, ...localExp]);

  const localShares = getLocalData(STORAGE_KEYS.SHARES, []);
  setLocalData(STORAGE_KEYS.SHARES, [...shareRecords, ...localShares]);

  if (alsoAddToPersonalExpenses) {
    await recordPersonalShareIfNeeded(fullExp, shareRecords);
  }

  notifySplitChange();
  return fullExp;
}

export async function deleteSharedExpense(id) {
  if (!id) throw new Error('Shared expense ID is required for deletion.');

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('shared_expenses').delete().eq('id', id);
      if (!error) {
        const local = getLocalData(STORAGE_KEYS.EXPENSES, []);
        setLocalData(STORAGE_KEYS.EXPENSES, local.filter((e) => e.id !== id));
        notifySplitChange();
        return true;
      }
    } catch (e) {
      console.warn('Supabase deleteSharedExpense fallback:', e.message);
    }
  }

  const local = getLocalData(STORAGE_KEYS.EXPENSES, []);
  setLocalData(STORAGE_KEYS.EXPENSES, local.filter((e) => e.id !== id));

  const localShares = getLocalData(STORAGE_KEYS.SHARES, []);
  setLocalData(STORAGE_KEYS.SHARES, localShares.filter((s) => s.shared_expense_id !== id));

  notifySplitChange();
  return true;
}

/**
 * Inserts ONLY the user's own share into personal expenses.
 * Never inserts the full bill, preventing double-counting and maintaining audit integrity.
 */
async function recordPersonalShareIfNeeded(expense, shares) {
  const userShare = shares.find((s) => s.friend_id === null || s.friend_id === 'USER');
  if (!userShare || userShare.share_amount <= 0) return;

  const payload = {
    amount: userShare.share_amount,
    category: expense.category || 'Food',
    description: `My share for: ${expense.title} (Split Bill)`,
    expense_date: expense.expense_date,
    payment_method: 'UPI'
  };

  try {
    if (isSupabaseConfigured && supabase) {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.id) payload.user_id = user.user.id;
      await supabase.from('expenses').insert([payload]);
    }
  } catch (err) {
    console.warn('Could not add personal share to expenses table:', err);
  }
}

// ============================================================================
// 3. SETTLEMENTS CRUD
// ============================================================================

export async function getSettlements({ friendId, startDate, endDate } = {}) {
  let list = [];

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('shared_expense_settlements')
        .select('*')
        .order('settlement_date', { ascending: false });

      if (startDate) query = query.gte('settlement_date', startDate);
      if (endDate) query = query.lte('settlement_date', endDate);

      const { data, error } = await query;
      if (!error && data) {
        list = data;
        setLocalData(STORAGE_KEYS.SETTLEMENTS, data);
      }
    } catch (e) {
      console.warn('Supabase getSettlements fallback:', e.message);
    }
  }

  if (list.length === 0) {
    list = getLocalData(STORAGE_KEYS.SETTLEMENTS, []);
    if (startDate) list = list.filter((s) => s.settlement_date >= startDate);
    if (endDate) list = list.filter((s) => s.settlement_date <= endDate);
  }

  if (friendId) {
    list = list.filter(
      (s) => String(s.payer_friend_id) === String(friendId) || String(s.recipient_friend_id) === String(friendId)
    );
  }

  return list;
}

export async function createSettlement({
  payerFriendId = null,
  recipientFriendId = null,
  amount,
  settlementDate = getTodayLocalDateString(),
  sharedExpenseId = null,
  notes = null
}) {
  const pId = payerFriendId === 'USER' ? null : payerFriendId;
  const rId = recipientFriendId === 'USER' ? null : recipientFriendId;

  if (pId === rId) {
    throw new Error('Payer and recipient cannot be the same person.');
  }

  const amt = parseFloat(Number(amount).toFixed(2));
  if (isNaN(amt) || amt <= 0) {
    throw new Error('Settlement amount must be greater than zero.');
  }

  const settlementId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `set-${Date.now()}`;
  const now = new Date().toISOString();

  const record = {
    id: settlementId,
    payer_friend_id: pId,
    recipient_friend_id: rId,
    amount: amt,
    settlement_date: settlementDate,
    shared_expense_id: sharedExpenseId || null,
    notes: notes ? notes.trim() : null,
    created_at: now,
    updated_at: now
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: user } = await supabase.auth.getUser();
      const payload = { ...record };
      if (user?.user?.id) payload.user_id = user.user.id;

      const { data, error } = await supabase
        .from('shared_expense_settlements')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        const local = getLocalData(STORAGE_KEYS.SETTLEMENTS, []);
        setLocalData(STORAGE_KEYS.SETTLEMENTS, [data, ...local]);
        notifySplitChange();
        return data;
      }
    } catch (e) {
      console.warn('Supabase createSettlement error, saving locally:', e.message);
    }
  }

  const local = getLocalData(STORAGE_KEYS.SETTLEMENTS, []);
  setLocalData(STORAGE_KEYS.SETTLEMENTS, [record, ...local]);
  notifySplitChange();
  return record;
}

export async function deleteSettlement(id) {
  if (!id) throw new Error('Settlement ID is required for deletion.');

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('shared_expense_settlements').delete().eq('id', id);
      if (!error) {
        const local = getLocalData(STORAGE_KEYS.SETTLEMENTS, []);
        setLocalData(STORAGE_KEYS.SETTLEMENTS, local.filter((s) => s.id !== id));
        notifySplitChange();
        return true;
      }
    } catch (e) {
      console.warn('Supabase deleteSettlement fallback:', e.message);
    }
  }

  const local = getLocalData(STORAGE_KEYS.SETTLEMENTS, []);
  setLocalData(STORAGE_KEYS.SETTLEMENTS, local.filter((s) => s.id !== id));
  notifySplitChange();
  return true;
}

// ============================================================================
// 4. OVERVIEW & BALANCES CALCULATION
// ============================================================================

export async function getSplitOverview() {
  const [friends, expenses, settlements] = await Promise.all([
    getFriends({ includeArchived: true }),
    getSharedExpenses(),
    getSettlements()
  ]);

  const friendMap = {};
  friends.forEach((f) => {
    friendMap[f.id] = f.name;
  });

  const getName = (id) => {
    if (id === null || id === 'USER') return 'You';
    return friendMap[id] || 'Unknown';
  };

  const balanceResult = calculateBalances(expenses, settlements);
  const simplified = simplifySettlements(balanceResult.netBalances, getName);

  // Active friends count
  const activeFriends = friends.filter((f) => !f.is_archived);

  return {
    friends,
    activeFriends,
    friendMap,
    getName,
    expenses,
    settlements,
    balances: balanceResult,
    simplifiedSuggestions: simplified
  };
}
