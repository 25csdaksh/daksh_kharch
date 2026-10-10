import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Receipt,
  Trash2,
  HandCoins,
  Calendar,
  Tag,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getSharedExpenseById, deleteSharedExpense, getFriends } from '../services/splitService';
import { formatSplitINR } from '../utils/splitEngine';
import RecordSettlementModal from '../components/splits/RecordSettlementModal';
import './SplitDetailPage.css';

export default function SplitDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [exp, friendList] = await Promise.all([
        getSharedExpenseById(id),
        getFriends({ includeArchived: true })
      ]);
      setExpense(exp);
      setFriends(friendList);
    } catch (err) {
      setError(err.message || 'Failed to load expense details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${expense.title}"? This will update all friend balances.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteSharedExpense(id);
      navigate('/splits');
    } catch (err) {
      alert(err.message || 'Failed to delete expense.');
      setIsDeleting(false);
    }
  };

  const getParticipantName = (fId) => {
    if (fId === null || fId === 'USER') return 'You';
    const f = friends.find((item) => item.id === fId);
    return f ? f.name : 'Unknown';
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-muted)' }}>
        Loading expense details...
      </div>
    );
  }

  if (!expense) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h2>Expense Not Found</h2>
        <p style={{ color: 'var(--color-muted)', margin: '1rem 0' }}>This shared expense may have been deleted.</p>
        <Link to="/splits" className="btn btn-primary">Back to Splits</Link>
      </div>
    );
  }

  const paidByYou = expense.paid_by_friend_id === null;
  const payerName = paidByYou ? 'You' : getParticipantName(expense.paid_by_friend_id);
  const shares = expense.shares || [];

  return (
    <div className="split-detail-container">
      <div className="split-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={() => navigate('/splits')}
            aria-label="Back to splits"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-heading)' }}>
            {expense.title}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsSettlementModalOpen(true)}
          >
            <HandCoins size={16} />
            <span>Settle Up</span>
          </button>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#E11D48', border: '1px solid #FECDD3', background: '#FFF1F2', padding: '0.55rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
          >
            <Trash2 size={16} />
            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>

      <div className="split-detail-card">
        <div className="split-detail-hero">
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Bill
            </span>
            <div className="detail-amount-badge">
              {formatSplitINR(expense.total_amount)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              <span><Calendar size={14} style={{ verticalAlign: -2 }} /> {expense.expense_date}</span>
              <span><Tag size={14} style={{ verticalAlign: -2 }} /> {expense.category}</span>
              <span><Users size={14} style={{ verticalAlign: -2 }} /> {shares.length} People</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Paid in full by</span>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-heading)' }}>
              {payerName}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', background: paidByYou ? 'var(--color-primary-light)' : '#FFF1F2', color: paidByYou ? 'var(--color-primary)' : '#E11D48', display: 'inline-block', marginTop: '0.35rem' }}>
              Split method: {expense.split_method.toUpperCase()}
            </span>
          </div>
        </div>

        {expense.notes && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--color-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-secondary-text)' }}>
            <strong>Note:</strong> {expense.notes}
          </div>
        )}

        {/* Participant Shares Breakdown */}
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-heading)', marginBottom: '0.75rem' }}>
            Participant Shares Breakdown
          </h3>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <table className="detail-shares-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Share Amount</th>
                  <th>Status vs Payer</th>
                </tr>
              </thead>
              <tbody>
                {shares.map((s) => {
                  const pName = getParticipantName(s.friend_id);
                  const isPayer = (s.friend_id === null && paidByYou) || (String(s.friend_id) === String(expense.paid_by_friend_id));

                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{pName}</strong>
                        {isPayer && (
                          <span style={{ marginLeft: 8, fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: 4, background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 700 }}>
                            Payer
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-heading)' }}>
                        {formatSplitINR(s.share_amount)}
                      </td>
                      <td>
                        {isPayer ? (
                          <span style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Paid full bill</span>
                        ) : (
                          <span style={{ color: '#E11D48', fontWeight: 600, fontSize: '0.85rem' }}>
                            Owes {payerName} {formatSplitINR(s.share_amount)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RecordSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        friends={friends.filter((f) => !f.is_archived)}
        sharedExpenseId={expense.id}
        onSettlementSaved={() => loadData()}
      />
    </div>
  );
}
