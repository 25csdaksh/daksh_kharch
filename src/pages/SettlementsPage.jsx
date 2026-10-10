import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  HandCoins,
  ArrowRight,
  Trash2,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import { getSettlements, getFriends, deleteSettlement } from '../services/splitService';
import { formatSplitINR } from '../utils/splitEngine';
import RecordSettlementModal from '../components/splits/RecordSettlementModal';
import './SettlementsPage.css';

export default function SettlementsPage() {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [friendFilter, setFriendFilter] = useState('All');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sets, friendList] = await Promise.all([
        getSettlements(),
        getFriends({ includeArchived: true })
      ]);
      setSettlements(sets);
      setFriends(friendList);
    } catch (err) {
      console.error('Failed to load settlements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSplitChange = () => loadData();
    window.addEventListener('split:changed', handleSplitChange);
    return () => window.removeEventListener('split:changed', handleSplitChange);
  }, []);

  const getParticipantName = (id) => {
    if (id === null || id === 'USER') return 'You';
    const f = friends.find((item) => item.id === id);
    return f ? f.name : 'Unknown';
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete/reverse this settlement? This will restore the outstanding debt.')) {
      return;
    }
    try {
      await deleteSettlement(id);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete settlement.');
    }
  };

  const filteredSettlements = settlements.filter((s) => {
    if (friendFilter === 'All') return true;
    return String(s.payer_friend_id) === String(friendFilter) || String(s.recipient_friend_id) === String(friendFilter);
  });

  return (
    <div className="settlements-page-container">
      <div className="settlements-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <button
              type="button"
              className="btn-icon"
              onClick={() => navigate('/splits')}
              aria-label="Back to splits"
            >
              <ArrowLeft size={18} />
            </button>
            <h1>Settlement History</h1>
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem' }}>
            Audit log of all recorded debt repayments and settlements.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsRecordModalOpen(true)}
          >
            <PlusCircle size={16} />
            <span>Record Settlement</span>
          </button>
        </div>
      </div>

      <div className="settlements-card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--color-heading)' }}>
            <HandCoins size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Recorded Settlements ({filteredSettlements.length})</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={14} style={{ color: 'var(--color-muted)' }} />
            <select
              className="form-input"
              style={{ height: 34, fontSize: '0.85rem', width: 180 }}
              value={friendFilter}
              onChange={(e) => setFriendFilter(e.target.value)}
            >
              <option value="All">All Participants</option>
              {friends.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading settlement history...
          </div>
        ) : filteredSettlements.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-full)', background: 'var(--color-secondary)', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <HandCoins size={28} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-heading)' }}>
              No Settlements Recorded
            </h3>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', maxWidth: 360, margin: '0 auto 1.25rem' }}>
              When a friend pays you back or you repay someone, record it here to clear debts.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setIsRecordModalOpen(true)}
            >
              <PlusCircle size={16} />
              <span>Record First Settlement</span>
            </button>
          </div>
        ) : (
          <table className="settlements-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Repayment Flow</th>
                <th>Amount</th>
                <th>Notes</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSettlements.map((s) => {
                const pName = getParticipantName(s.payer_friend_id);
                const rName = getParticipantName(s.recipient_friend_id);

                return (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--color-muted)' }}>{s.settlement_date}</td>
                    <td>
                      <div className="settlement-flow-cell">
                        <span>{pName}</span>
                        <ArrowRight size={15} className="settlement-flow-arrow" />
                        <span>{rName}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                      {formatSplitINR(s.amount)}
                    </td>
                    <td style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                      {s.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-icon"
                        title="Delete / Reverse settlement"
                        onClick={() => handleDelete(s.id)}
                        style={{ color: '#E11D48' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <RecordSettlementModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        friends={friends.filter((f) => !f.is_archived)}
        onSettlementSaved={() => loadData()}
      />
    </div>
  );
}
