import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  PlusCircle,
  UserPlus,
  Receipt,
  Scale,
  Percent,
  Check,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { getFriends, createSharedExpense } from '../services/splitService';
import {
  calculateEqualSplit,
  calculatePercentageSplit,
  calculateRatioSplit,
  validateCustomMonetarySplit,
  formatSplitINR,
  toPaise,
  fromPaise
} from '../utils/splitEngine';
import { getTodayLocalDateString, ALLOWED_CATEGORIES } from '../utils/dateUtils';
import AddFriendModal from '../components/splits/AddFriendModal';
import './CreateSplitPage.css';

export default function CreateSplitPage() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(getTodayLocalDateString());
  const [category, setCategory] = useState('Food');
  const [paidBy, setPaidBy] = useState('USER');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [notes, setNotes] = useState('');
  const [alsoAddToPersonal, setAlsoAddToPersonal] = useState(true);

  // Participant selection: array of IDs ('USER' or friend.id)
  const [selectedParticipants, setSelectedParticipants] = useState(['USER']);

  // Custom Split Values: Record<participantId, string>
  const [customValues, setCustomValues] = useState({});

  // UI state
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load Friends
  const loadFriendsList = async () => {
    try {
      setLoadingFriends(true);
      const list = await getFriends({ includeArchived: false });
      setFriends(list);
      // By default select USER and up to 2 friends
      const initial = ['USER'];
      if (list.length > 0) initial.push(list[0].id);
      setSelectedParticipants(initial);
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    loadFriendsList();
  }, []);

  const getParticipantName = (id) => {
    if (id === 'USER') return 'You';
    const f = friends.find((item) => item.id === id);
    return f ? f.name : 'Unknown';
  };

  const toggleParticipant = (id) => {
    if (selectedParticipants.includes(id)) {
      if (selectedParticipants.length === 1) {
        setError('At least one participant must be selected.');
        return;
      }
      setSelectedParticipants((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedParticipants((prev) => [...prev, id]);
    }
  };

  const handleCustomValueChange = (id, val) => {
    setCustomValues((prev) => ({ ...prev, [id]: val }));
  };

  // Calculate Computed Shares and Validation based on split method
  const calculationResult = useMemo(() => {
    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0 || selectedParticipants.length === 0) {
      return { shares: [], isValid: false, diffText: '', myShare: 0 };
    }

    try {
      if (splitMethod === 'equal') {
        const shares = calculateEqualSplit(
          total,
          selectedParticipants.map((id) => (id === 'USER' ? null : id))
        );
        const myShareObj = shares.find((s) => s.participantId === null);
        return {
          shares: shares.map((s) => ({
            id: s.participantId === null ? 'USER' : s.participantId,
            name: getParticipantName(s.participantId === null ? 'USER' : s.participantId),
            amount: s.shareAmount
          })),
          isValid: true,
          diffText: 'Balanced equally',
          myShare: myShareObj ? myShareObj.shareAmount : 0
        };
      }

      if (splitMethod === 'unequal') {
        const entries = selectedParticipants.map((id) => ({
          participantId: id,
          amount: parseFloat(customValues[id]) || 0
        }));
        const val = validateCustomMonetarySplit(total, entries);
        const myEntry = entries.find((e) => e.participantId === 'USER');
        return {
          shares: entries.map((e) => ({
            id: e.participantId,
            name: getParticipantName(e.participantId),
            amount: e.amount
          })),
          isValid: val.isValid,
          diffText: val.isValid
            ? 'Shares match total'
            : `Difference: ${formatSplitINR(fromPaise(Math.abs(val.diffPaise)))}`,
          myShare: myEntry ? myEntry.amount : 0,
          errors: val.errors
        };
      }

      if (splitMethod === 'percentage') {
        const entries = selectedParticipants.map((id) => ({
          participantId: id,
          percentage: parseFloat(customValues[id]) || 0
        }));
        const shares = calculatePercentageSplit(total, entries);
        const myShareObj = shares.find((s) => s.participantId === 'USER');
        return {
          shares: shares.map((s) => ({
            id: s.participantId,
            name: getParticipantName(s.participantId),
            amount: s.shareAmount,
            extra: `${s.percentage}%`
          })),
          isValid: true,
          diffText: '100% Allocated',
          myShare: myShareObj ? myShareObj.shareAmount : 0
        };
      }

      if (splitMethod === 'shares') {
        const entries = selectedParticipants.map((id) => ({
          participantId: id,
          shares: parseFloat(customValues[id]) || 1
        }));
        const shares = calculateRatioSplit(total, entries);
        const myShareObj = shares.find((s) => s.participantId === 'USER');
        return {
          shares: shares.map((s) => ({
            id: s.participantId,
            name: getParticipantName(s.participantId),
            amount: s.shareAmount
          })),
          isValid: true,
          diffText: 'Ratio distributed',
          myShare: myShareObj ? myShareObj.shareAmount : 0
        };
      }
    } catch (err) {
      return {
        shares: [],
        isValid: false,
        diffText: err.message,
        myShare: 0,
        errors: [err.message]
      };
    }

    return { shares: [], isValid: false, diffText: '', myShare: 0 };
  }, [totalAmount, selectedParticipants, splitMethod, customValues, friends]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) {
      setError('Please enter a valid expense total amount.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter an expense title.');
      return;
    }
    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant.');
      return;
    }
    if (!calculationResult.isValid) {
      setError(
        calculationResult.errors?.[0] || 'Please ensure all shares match the total bill.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const finalShares = calculationResult.shares.map((s) => ({
        participantId: s.id === 'USER' ? null : s.id,
        shareAmount: s.amount
      }));

      await createSharedExpense({
        title: title.trim(),
        totalAmount: total,
        category,
        expenseDate,
        paidByFriendId: paidBy === 'USER' ? null : paidBy,
        splitMethod,
        shares: finalShares,
        notes: notes.trim() || null,
        alsoAddToPersonalExpenses: alsoAddToPersonal
      });

      navigate('/splits');
    } catch (err) {
      setError(err.message || 'Failed to save shared expense.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-split-container">
      <div className="create-split-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => navigate('/splits')}
            aria-label="Back to splits"
          >
            <ArrowLeft size={18} />
          </button>
          <h1>Split a New Bill</h1>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setIsAddFriendModalOpen(true)}
        >
          <UserPlus size={16} />
          <span>New Friend</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1.25rem', background: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-split-layout">
        {/* Left Form Column */}
        <div className="create-split-card">
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Expense Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Pizza Night, Goa Trip, Apartment Groceries"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Total Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-input"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {ALLOWED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Who Paid?</label>
              <select
                className="form-input"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                <option value="USER">You (Daksh)</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Method Tabs */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Split Method</label>
            <div className="split-tabs-row">
              <button
                type="button"
                className={`split-tab-btn ${splitMethod === 'equal' ? 'active' : ''}`}
                onClick={() => setSplitMethod('equal')}
              >
                <Scale size={14} />
                <span>Split Equally</span>
              </button>
              <button
                type="button"
                className={`split-tab-btn ${splitMethod === 'unequal' ? 'active' : ''}`}
                onClick={() => setSplitMethod('unequal')}
              >
                <Receipt size={14} />
                <span>Exact Amounts</span>
              </button>
              <button
                type="button"
                className={`split-tab-btn ${splitMethod === 'percentage' ? 'active' : ''}`}
                onClick={() => setSplitMethod('percentage')}
              >
                <Percent size={14} />
                <span>By Percentage</span>
              </button>
              <button
                type="button"
                className={`split-tab-btn ${splitMethod === 'shares' ? 'active' : ''}`}
                onClick={() => setSplitMethod('shares')}
              >
                <Users size={14} />
                <span>By Ratio</span>
              </button>
            </div>
          </div>

          {/* Participants Selection */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Select Participants ({selectedParticipants.length})
              </label>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  const all = ['USER', ...friends.map((f) => f.id)];
                  setSelectedParticipants(all);
                }}
              >
                Select All
              </button>
            </div>

            <div className="participant-select-list">
              {/* Logged in User */}
              <div className={`participant-select-row ${selectedParticipants.includes('USER') ? 'selected' : ''}`}>
                <label className="participant-check-label">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes('USER')}
                    onChange={() => toggleParticipant('USER')}
                  />
                  <span>You (Account Owner)</span>
                </label>
                {splitMethod !== 'equal' && selectedParticipants.includes('USER') && (
                  <input
                    type="number"
                    step="any"
                    className="form-input share-input-control"
                    placeholder={splitMethod === 'percentage' ? '%' : splitMethod === 'shares' ? 'Units' : '₹'}
                    value={customValues['USER'] || ''}
                    onChange={(e) => handleCustomValueChange('USER', e.target.value)}
                  />
                )}
              </div>

              {/* Friends */}
              {friends.map((friend) => {
                const isSelected = selectedParticipants.includes(friend.id);
                return (
                  <div key={friend.id} className={`participant-select-row ${isSelected ? 'selected' : ''}`}>
                    <label className="participant-check-label">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleParticipant(friend.id)}
                      />
                      <span>{friend.name}</span>
                    </label>
                    {splitMethod !== 'equal' && isSelected && (
                      <input
                        type="number"
                        step="any"
                        className="form-input share-input-control"
                        placeholder={splitMethod === 'percentage' ? '%' : splitMethod === 'shares' ? 'Units' : '₹'}
                        value={customValues[friend.id] || ''}
                        onChange={(e) => handleCustomValueChange(friend.id, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personal Expense Integration Toggle */}
          <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1rem', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(5, 150, 105, 0.2)' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-brand-deep)' }}>
              <input
                type="checkbox"
                checked={alsoAddToPersonal}
                onChange={(e) => setAlsoAddToPersonal(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <div>
                <strong>Record my share in personal expenses</strong>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.78rem' }}>
                  Only your share ({formatSplitINR(calculationResult.myShare)}) will be recorded. The full ₹{totalAmount || 0} bill is NEVER double-counted.
                </p>
              </div>
            </label>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Notes (Optional)</label>
            <textarea
              className="form-input"
              rows="2"
              placeholder="e.g. Paid via Zomato, split between roommates"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/splits')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !calculationResult.isValid}
            >
              {submitting ? 'Saving...' : 'Save & Split Bill'}
            </button>
          </div>
        </div>

        {/* Right Live Preview Column */}
        <div className="split-preview-card">
          <div className="preview-title">
            <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Split Preview</span>
          </div>

          <div style={{ padding: '0.75rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Bill Amount
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-heading)' }}>
              {formatSplitINR(totalAmount || 0)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
              Paid by: <strong>{getParticipantName(paidBy)}</strong>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-heading)', marginBottom: '0.5rem' }}>
              Allocated Shares ({calculationResult.shares.length})
            </div>
            <div className="preview-breakdown-list">
              {calculationResult.shares.map((share) => (
                <div key={share.id} className="preview-breakdown-row">
                  <div>
                    <strong>{share.name}</strong>
                    {share.extra && <span style={{ marginLeft: 6, fontSize: '0.75rem', color: 'var(--color-muted)' }}>({share.extra})</span>}
                  </div>
                  <strong style={{ color: 'var(--color-heading)' }}>
                    {formatSplitINR(share.amount)}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className={`preview-diff-pill ${calculationResult.isValid ? 'diff-balanced' : 'diff-unbalanced'}`}>
            {calculationResult.isValid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{calculationResult.diffText}</span>
          </div>
        </div>
      </form>

      {/* Inline Add Friend Modal */}
      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        onFriendCreated={(newFriend) => {
          setFriends((prev) => [...prev, newFriend]);
          setSelectedParticipants((prev) => [...prev, newFriend.id]);
        }}
      />
    </div>
  );
}
