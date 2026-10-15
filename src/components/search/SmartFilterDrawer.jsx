import React, { useState } from 'react';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { DATE_PRESETS, TRANSACTION_TYPES } from '../../utils/filterUtils';
import { ALLOWED_CATEGORIES, ALLOWED_PAYMENT_METHODS } from '../../utils/dateUtils';
import { INCOME_SOURCES } from '../../utils/accountUtils';
import './SmartFilterDrawer.css';

export default function SmartFilterDrawer({
  filters,
  onChange,
  onReset,
  accounts = []
}) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleUpdate = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  // Count active filters (excluding default values)
  let activeFilterCount = 0;
  if (filters.datePreset && filters.datePreset !== 'all') activeFilterCount++;
  if (filters.type && filters.type !== 'all') activeFilterCount++;
  if (filters.category && filters.category !== 'all') activeFilterCount++;
  if (filters.accountId) activeFilterCount++;
  if (filters.paymentMethod && filters.paymentMethod !== 'all') activeFilterCount++;
  if (filters.minAmount !== '' && filters.minAmount !== undefined) activeFilterCount++;
  if (filters.maxAmount !== '' && filters.maxAmount !== undefined) activeFilterCount++;
  if (filters.isRecurring) activeFilterCount++;
  if (filters.isSplit) activeFilterCount++;

  const activeAccount = accounts.find((a) => a.id === filters.accountId);

  return (
    <div className="smart-filter-container">
      {/* Quick Pills Ribbon: Types & Date Presets */}
      <div className="filter-quick-ribbon">
        <div className="filter-pills-row">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginRight: '0.25rem' }}>
            TYPE:
          </span>
          {TRANSACTION_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`filter-pill-btn ${filters.type === t.id ? 'active' : ''}`}
              onClick={() => handleUpdate('type', t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={`btn-toggle-advanced ${activeFilterCount > 0 ? 'has-filters' : ''}`}
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          aria-expanded={isAdvancedOpen}
        >
          <SlidersHorizontal size={14} />
          <span>Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}</span>
          {isAdvancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <div className="filter-quick-ribbon">
        <div className="filter-pills-row">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', marginRight: '0.25rem' }}>
            DATE:
          </span>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`filter-pill-btn ${filters.datePreset === p.id ? 'active' : ''}`}
              onClick={() => handleUpdate('datePreset', p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Collapsible Advanced Filters Panel */}
      {isAdvancedOpen && (
        <div className="advanced-filter-panel">
          <div className="filter-grid-fields">
            {/* Account / Wallet selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>
                Account / Wallet
              </label>
              <select
                className="form-control"
                value={filters.accountId || ''}
                onChange={(e) => handleUpdate('accountId', e.target.value)}
              >
                <option value="">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Category / Source selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>
                Category
              </label>
              <select
                className="form-control"
                value={filters.category || 'all'}
                onChange={(e) => handleUpdate('category', e.target.value)}
              >
                <option value="all">All Categories</option>
                <optgroup label="Expense Categories">
                  {ALLOWED_CATEGORIES.map((cat) => (
                    <option key={`cat-${cat}`} value={cat}>
                      {cat}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Income Sources">
                  {INCOME_SOURCES.map((src) => (
                    <option key={`src-${src}`} value={src}>
                      {src} (Income)
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Payment Method selector */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>
                Payment Method
              </label>
              <select
                className="form-control"
                value={filters.paymentMethod || 'all'}
                onChange={(e) => handleUpdate('paymentMethod', e.target.value)}
              >
                <option value="all">All Methods</option>
                {ALLOWED_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount Range */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>
                Min Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className="form-control"
                value={filters.minAmount || ''}
                onChange={(e) => handleUpdate('minAmount', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.75rem' }}>
                Max Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="No limit"
                className="form-control"
                value={filters.maxAmount || ''}
                onChange={(e) => handleUpdate('maxAmount', e.target.value)}
              />
            </div>
          </div>

          {/* Custom Date Range Fields (if custom range selected) */}
          {filters.datePreset === 'custom' && (
            <div className="form-row-2" style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.startDate || ''}
                  onChange={(e) => handleUpdate('startDate', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  End Date
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.endDate || ''}
                  onChange={(e) => handleUpdate('endDate', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Checkboxes: Recurring & Split */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', borderTop: '1px dashed #E2E8F0', paddingTop: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(filters.isRecurring)}
                onChange={(e) => handleUpdate('isRecurring', e.target.checked)}
              />
              <span>Recurring Bills Only</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(filters.isSplit)}
                onChange={(e) => handleUpdate('isSplit', e.target.checked)}
              />
              <span>Split Expenses Only</span>
            </label>
          </div>
        </div>
      )}

      {/* Active Filter Chips Ribbon */}
      {activeFilterCount > 0 && (
        <div className="active-filters-chips-bar">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B' }}>
            Active Filters:
          </span>

          {filters.type !== 'all' && (
            <span className="active-chip">
              Type: {filters.type}
              <button type="button" className="active-chip-remove" onClick={() => handleUpdate('type', 'all')}>
                <X size={12} />
              </button>
            </span>
          )}

          {filters.datePreset !== 'all' && (
            <span className="active-chip">
              Date: {DATE_PRESETS.find((p) => p.id === filters.datePreset)?.label || filters.datePreset}
              <button type="button" className="active-chip-remove" onClick={() => handleUpdate('datePreset', 'all')}>
                <X size={12} />
              </button>
            </span>
          )}

          {filters.category !== 'all' && (
            <span className="active-chip">
              Category: {filters.category}
              <button type="button" className="active-chip-remove" onClick={() => handleUpdate('category', 'all')}>
                <X size={12} />
              </button>
            </span>
          )}

          {filters.accountId && (
            <span className="active-chip">
              Account: {activeAccount?.name || 'Selected'}
              <button type="button" className="active-chip-remove" onClick={() => handleUpdate('accountId', '')}>
                <X size={12} />
              </button>
            </span>
          )}

          {filters.paymentMethod !== 'all' && (
            <span className="active-chip">
              Method: {filters.paymentMethod}
              <button type="button" className="active-chip-remove" onClick={() => handleUpdate('paymentMethod', 'all')}>
                <X size={12} />
              </button>
            </span>
          )}

          {filters.minAmount && (
            <span className="active-chip">
              Min: ₹{filters.minAmount}
              <button type="button" className="active-chip-remove" onClick={() => handleUpdate('minAmount', '')}>
                <X size={12} />
              </button>
            </span>
          )}

          {filters.maxAmount && (
            <span className="active-chip">
              Max: ₹{filters.maxAmount}
              <button type="button" className="active-chip-remove" onClick={() => handleUpdate('maxAmount', '')}>
                <X size={12} />
              </button>
            </span>
          )}

          {filters.isRecurring && (
            <span className="active-chip">
              Recurring Only
              <button type="button" className="active-chip-remove" onClick={() => handleUpdate('isRecurring', false)}>
                <X size={12} />
              </button>
            </span>
          )}

          {filters.isSplit && (
            <span className="active-chip">
              Split Only
              <button type="button" className="active-chip-remove" onClick={() => handleUpdate('isSplit', false)}>
                <X size={12} />
              </button>
            </span>
          )}

          <button
            type="button"
            className="btn-clear-all-filters"
            onClick={onReset}
          >
            <RotateCcw size={12} />
            <span>Clear All</span>
          </button>
        </div>
      )}
    </div>
  );
}
