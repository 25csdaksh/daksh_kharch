import React, { useState, useEffect } from 'react';
import { X, HandCoins, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createSettlement } from '../../services/splitService';
import { formatSplitINR, toPaise, fromPaise } from '../../utils/splitEngine';
import { getTodayLocalDateString } from '../../utils/dateUtils';

export default function RecordSettlementModal({
  isOpen,
  onClose,
  friends = [],
  defaultPayerId = null,
  defaultRecipientId = null,
  defaultAmount = '',
  maxSuggestedAmount = null,
  onSettlementSaved
}) {
  const [payerId, setPayerId] = useState(defaultPayerId);
  const [recipientId, setRecipientId] = useState(defaultRecipientId);
  const [amount, setAmount] = useState(defaultAmount || '');
  const [date, setDate] = useState(getTodayLocalDateString());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPayerId(defaultPayerId);
      setRecipientId(defaultRecipientId);
      setAmount(defaultAmount ? String(defaultAmount) : '');
      setDate(getTodayLocalDateString());
      setNotes('');
      setError('');
    }
  }, [isOpen, defaultPayerId, defaultRecipientId, defaultAmount]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive settlement amount.');
      return;
    }

    if (payerId === recipientId) {
      setError('Payer and Recipient cannot be the same person.');
      return;
    }

    setLoading(true);
    try {
      const result = await createSettlement({
        payerFriendId: payerId === 'USER' ? null : payerId,
        recipientFriendId: recipientId === 'USER' ? null : recipientId,
        amount: numAmount,
        settlementDate: date,
        notes: notes ? notes.trim() : null
      });

      if (onSettlementSaved) onSettlementSaved(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record settlement.');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (id) => {
    if (id === null || id === 'USER') return 'You';
    const f = friends.find((item) => item.id === id);
    return f ? f.name : 'Select Person';
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HandCoins size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-heading)' }}>Record Settlement</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Repayment of shared expense debt</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ margin: '1rem 1.5rem 0', padding: '0.65rem 0.9rem', background: 'var(--color-danger-light)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Who Paid? (Payer)</label>
              <select
                className="form-input"
                value={payerId === null ? 'USER' : (payerId || 'USER')}
                onChange={(e) => setPayerId(e.target.value === 'USER' ? null : e.target.value)}
                required
              >
                <option value="USER">You</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '1.25rem', color: 'var(--color-primary)' }}>
              <ArrowRight size={20} />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>To Whom? (Recipient)</label>
              <select
                className="form-input"
                value={recipientId === null ? 'USER' : (recipientId || '')}
                onChange={(e) => setRecipientId(e.target.value === 'USER' ? null : e.target.value)}
                required
              >
                <option value="">Select</option>
                <option value="USER">You</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Amount (₹) *</label>
              {maxSuggestedAmount && (
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  onClick={() => setAmount(String(maxSuggestedAmount))}
                >
                  Fill full debt: {formatSplitINR(maxSuggestedAmount)}
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Settlement Date</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Note / Reference (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Paid via GPay / Cash"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
