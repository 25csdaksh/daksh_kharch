/**
 * HisabSetu — Advanced Search & Smart Filter Utilities
 * Provides date range presets, text highlight tokenizers, and filter serialization.
 */

import {
  getTodayLocalDateString,
  getCurrentWeekRange,
  getCurrentMonthRange
} from './dateUtils.js';

export const DATE_PRESETS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'prev_month', label: 'Previous Month' },
  { id: 'custom', label: 'Custom Range' }
];

export const TRANSACTION_TYPES = [
  { id: 'all', label: 'All Types' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Incomes' },
  { id: 'transfer', label: 'Transfers' }
];

/**
 * Calculates start and end dates (YYYY-MM-DD) for a given date preset.
 */
export function getDateRangeFromPreset(preset, customStart = null, customEnd = null) {
  const today = getTodayLocalDateString();

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today };

    case 'yesterday': {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const yStr = `${y}-${m}-${day}`;
      return { startDate: yStr, endDate: yStr };
    }

    case 'this_week': {
      const week = getCurrentWeekRange();
      return { startDate: week.startDate, endDate: week.endDate };
    }

    case 'this_month': {
      const month = getCurrentMonthRange();
      return { startDate: month.startDate, endDate: month.endDate };
    }

    case 'prev_month': {
      const now = new Date();
      // Month index 0-11. Setting month - 1 with day 1 gets previous month
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevMonthDate.getFullYear();
      const monthIdx = prevMonthDate.getMonth();
      const firstDay = new Date(year, monthIdx, 1);
      const lastDay = new Date(year, monthIdx + 1, 0);

      const format = (dt) => {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      return { startDate: format(firstDay), endDate: format(lastDay) };
    }

    case 'custom':
      return {
        startDate: customStart || null,
        endDate: customEnd || null
      };

    case 'all':
    default:
      return { startDate: null, endDate: null };
  }
}

/**
 * Safely escapes special regex characters to prevent regex injection.
 */
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits text into segments identifying case-insensitive matches for the query.
 * Returns array of { text: string, isMatch: boolean }.
 */
export function getHighlightedSegments(text, query) {
  if (!text) return [];
  if (!query || !query.trim()) {
    return [{ text: String(text), isMatch: false }];
  }

  const strText = String(text);
  const cleanQuery = query.trim();
  const escaped = escapeRegExp(cleanQuery);
  const regex = new RegExp(`(${escaped})`, 'gi');

  const parts = strText.split(regex);
  return parts.map((part) => ({
    text: part,
    isMatch: part.toLowerCase() === cleanQuery.toLowerCase()
  }));
}

/**
 * Serializes filter state into URLSearchParams for persistent URLs.
 */
export function filtersToSearchParams(filters) {
  const params = new URLSearchParams();

  if (filters.query?.trim()) params.set('q', filters.query.trim());
  if (filters.datePreset && filters.datePreset !== 'all') params.set('range', filters.datePreset);
  if (filters.startDate) params.set('start', filters.startDate);
  if (filters.endDate) params.set('end', filters.endDate);
  if (filters.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters.category && filters.category !== 'all') params.set('cat', filters.category);
  if (filters.accountId) params.set('account', filters.accountId);
  if (filters.paymentMethod && filters.paymentMethod !== 'all') params.set('method', filters.paymentMethod);
  if (filters.minAmount !== undefined && filters.minAmount !== '') params.set('min', filters.minAmount);
  if (filters.maxAmount !== undefined && filters.maxAmount !== '') params.set('max', filters.maxAmount);
  if (filters.isRecurring) params.set('recurring', '1');
  if (filters.isSplit) params.set('split', '1');

  return params;
}

/**
 * Deserializes URLSearchParams into filter state.
 */
export function searchParamsToFilters(searchParams) {
  return {
    query: searchParams.get('q') || '',
    datePreset: searchParams.get('range') || 'all',
    startDate: searchParams.get('start') || '',
    endDate: searchParams.get('end') || '',
    type: searchParams.get('type') || 'all',
    category: searchParams.get('cat') || 'all',
    accountId: searchParams.get('account') || '',
    paymentMethod: searchParams.get('method') || 'all',
    minAmount: searchParams.get('min') || '',
    maxAmount: searchParams.get('max') || '',
    isRecurring: searchParams.get('recurring') === '1',
    isSplit: searchParams.get('split') === '1'
  };
}
