import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  PlusCircle,
  UserPlus,
  HandCoins,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Scale,
  Receipt,
  Search,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getSplitOverview } from '../services/splitService';
import { formatSplitINR } from '../utils/splitEngine';
import AddFriendModal from '../components/splits/AddFriendModal';
import RecordSettlementModal from '../components/splits/RecordSettlementModal';
import './SplitsPage.css';

export default function SplitsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    friends: [],
    activeFriends: [],
    friendMap: {},
    expenses: [],
    settlements: [],
    balances: {
      netBalances: {},
      pairwiseDebts: [],
      userSummary: { youOwe: 0, owedToYou: 0, netBalance: 0 }
    },
    simplifiedSuggestions: []
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [settlementModalConfig, setSettlementModalConfig] = useState({
    isOpen: false,
    defaultPayerId: null,
    defaultRecipientId: null,
    defaultAmount: '',
    maxSuggestedAmount: null
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getSplitOverview();
      setData(res);
    } catch (err) {
      console.error('Failed to load split overview:', err);
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

  const openSettleModal = (fromId, toId, amount = '') => {
    setSettlementModalConfig({
      isOpen: true,
      defaultPayerId: fromId,
      defaultRecipientId: toId,
      defaultAmount: amount,
      maxSuggestedAmount: amount ? Number(amount) : null
    });
  };

  const filteredExpenses = (data.expenses || []).filter((e) => {
    if (!searchQuery.trim()) return true;
    return e.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  const { userSummary, netBalances } = data.balances;

  return (
    <div className="splits-page-container">
      {/* 1. Top Header */}
      <div className="splits-header-row">
        <div className="splits-title-group">
          <h1>Split Bills & Friends</h1>
          <p>Split group expenses, track balances effortlessly, and settle debts.</p>
        </div>
        <div className="splits-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setIsAddFriendModalOpen(true)}
          >
            <UserPlus size={16} />
            <span>Add Friend</span>
          </button>
          <Link to="/splits/settlements" className="btn btn-secondary">
            <HandCoins size={16} />
            <span>Settlement History</span>
          </Link>
          <Link to="/splits/new" className="btn btn-primary">
            <PlusCircle size={16} />
            <span>Split New Bill</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Metric Summary Cards */}
      <div className="splits-metrics-grid">
        <div className="split-stat-card">
          <div className="split-stat-icon green">
            <ArrowDownLeft size={24} />
          </div>
          <div className="split-stat-info">
            <span className="split-stat-label">Others Owe You</span>
            <span className="split-stat-value" style={{ color: 'var(--color-primary)' }}>
              {formatSplitINR(userSummary.owedToYou)}
            </span>
            <span className="split-stat-sub">Pending reimbursements</span>
          </div>
        </div>

        <div className="split-stat-card">
          <div className="split-stat-icon rose">
            <ArrowUpRight size={24} />
          </div>
          <div className="split-stat-info">
            <span className="split-stat-label">You Owe Others</span>
            <span className="split-stat-value" style={{ color: '#E11D48' }}>
              {formatSplitINR(userSummary.youOwe)}
            </span>
            <span className="split-stat-sub">Your payable debts</span>
          </div>
        </div>

        <div className="split-stat-card">
          <div className="split-stat-icon amber">
            <Scale size={24} />
          </div>
          <div className="split-stat-info">
            <span className="split-stat-label">Your Net Balance</span>
            <span
              className="split-stat-value"
              style={{
                color: userSummary.netBalance > 0
                  ? 'var(--color-primary)'
                  : userSummary.netBalance < 0
                  ? '#E11D48'
                  : 'var(--color-text)'
              }}
            >
              {formatSplitINR(userSummary.netBalance)}
            </span>
            <span className="split-stat-sub">
              {userSummary.netBalance > 0
                ? 'You are in net credit'
                : userSummary.netBalance < 0
                ? 'You are in net debt'
                : 'All debts settled evenly'}
            </span>
          </div>
        </div>

        <div className="split-stat-card">
          <div className="split-stat-icon blue">
            <Receipt size={24} />
          </div>
          <div className="split-stat-info">
            <span className="split-stat-label">Shared Bills</span>
            <span className="split-stat-value">{data.expenses.length}</span>
            <span className="split-stat-sub">{data.activeFriends.length} Active friends</span>
          </div>
        </div>
      </div>

      {/* 3. Simplified Settlements Recommendations */}
      {data.simplifiedSuggestions.length > 0 && (
        <div className="simplify-banner">
          <div className="simplify-header">
            <div className="simplify-title">
              <Sparkles size={18} />
              <span>Smart Simplified Settlements</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              Calculated using net debt minimization algorithm
            </span>
          </div>

          <div className="simplify-grid">
            {data.simplifiedSuggestions.map((s, idx) => (
              <div key={idx} className="simplify-item">
                <div className="simplify-flow">
                  <span>{s.fromName}</span>
                  <ArrowRight size={16} className="simplify-arrow" />
                  <span>{s.toName}</span>
                  <strong style={{ color: 'var(--color-primary)', marginLeft: '0.25rem' }}>
                    {formatSplitINR(s.amount)}
                  </strong>
                </div>
                <button
                  className="simplify-action-btn"
                  onClick={() => openSettleModal(s.fromId, s.toId, s.amount)}
                >
                  Settle Up
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Main Two Column Layout */}
      <div className="splits-main-layout">
        {/* Left Column: Shared Expenses List */}
        <div className="splits-panel">
          <div className="splits-panel-header">
            <div className="splits-panel-title">
              <Receipt size={18} />
              <span>Shared Expenses</span>
            </div>
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
              <input
                type="text"
                placeholder="Search bills..."
                className="form-input"
                style={{ paddingLeft: '2rem', height: 34, fontSize: '0.85rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
              Loading shared bills...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-full)', background: 'var(--color-secondary)', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Receipt size={28} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--color-heading)' }}>
                No Shared Expenses Yet
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', maxWidth: 360, margin: '0 auto 1.25rem' }}>
                Split dinner, trips, groceries, or movies with your friends and HisabSetu will calculate who owes what.
              </p>
              <Link to="/splits/new" className="btn btn-primary">
                <PlusCircle size={16} />
                <span>Split Your First Bill</span>
              </Link>
            </div>
          ) : (
            <div className="split-expense-list">
              {filteredExpenses.map((exp) => {
                const paidByYou = exp.paid_by_friend_id === null;
                const payerName = paidByYou ? 'You' : (data.friendMap[exp.paid_by_friend_id] || 'Friend');
                const participantCount = (exp.shares || []).length;

                return (
                  <Link
                    key={exp.id}
                    to={`/splits/${exp.id}`}
                    className="split-expense-card"
                  >
                    <div className="split-exp-left">
                      <div className="split-exp-icon">
                        <Receipt size={20} />
                      </div>
                      <div className="split-exp-meta">
                        <span className="split-exp-title">{exp.title}</span>
                        <div className="split-exp-subtitle">
                          <span>{exp.expense_date}</span>
                          <span>•</span>
                          <span>{exp.category}</span>
                          <span>•</span>
                          <span>{participantCount} people</span>
                        </div>
                      </div>
                    </div>

                    <div className="split-exp-right">
                      <span className="split-exp-amount">{formatSplitINR(exp.total_amount)}</span>
                      <span className={`split-exp-badge ${paidByYou ? 'badge-paid-by-you' : 'badge-paid-by-friend'}`}>
                        {paidByYou ? 'Paid by You' : `Paid by ${payerName}`}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Friends & Net Balances */}
        <div className="splits-panel">
          <div className="splits-panel-header">
            <div className="splits-panel-title">
              <Users size={18} />
              <span>Friends & Balances</span>
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => setIsAddFriendModalOpen(true)}
            >
              <UserPlus size={14} />
              <span>Add</span>
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-muted)' }}>
              Loading friends...
            </div>
          ) : data.activeFriends.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-heading)' }}>
                No Friends Added Yet
              </h3>
              <p style={{ color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Add your friends by name to start splitting bills with them. No login needed for them!
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setIsAddFriendModalOpen(true)}
              >
                <UserPlus size={16} />
                <span>Add Friend</span>
              </button>
            </div>
          ) : (
            <div className="friends-list">
              {data.activeFriends.map((friend) => {
                const bal = netBalances[friend.id] || 0;
                const initials = friend.name.slice(0, 2).toUpperCase();

                // Check debt relation to user
                const userOwesFriendDebt = (data.balances.pairwiseDebts || []).find(
                  (d) => d.fromId === null && d.toId === friend.id
                );
                const friendOwesUserDebt = (data.balances.pairwiseDebts || []).find(
                  (d) => d.fromId === friend.id && d.toId === null
                );

                return (
                  <div key={friend.id} className="friend-card">
                    <div className="friend-left">
                      <div className="friend-avatar">{initials}</div>
                      <div className="friend-details">
                        <span className="friend-name">{friend.name}</span>
                        <span className="friend-sub">
                          {friendOwesUserDebt && friendOwesUserDebt.amount > 0 ? (
                            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                              Owes you {formatSplitINR(friendOwesUserDebt.amount)}
                            </span>
                          ) : userOwesFriendDebt && userOwesFriendDebt.amount > 0 ? (
                            <span style={{ color: '#E11D48', fontWeight: 600 }}>
                              You owe {formatSplitINR(userOwesFriendDebt.amount)}
                            </span>
                          ) : (
                            <span>All settled</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="friend-right">
                      {friendOwesUserDebt && friendOwesUserDebt.amount > 0 ? (
                        <button
                          className="btn-settle-mini"
                          onClick={() => openSettleModal(friend.id, 'USER', friendOwesUserDebt.amount)}
                        >
                          Settle
                        </button>
                      ) : userOwesFriendDebt && userOwesFriendDebt.amount > 0 ? (
                        <button
                          className="btn-settle-mini"
                          onClick={() => openSettleModal('USER', friend.id, userOwesFriendDebt.amount)}
                        >
                          Settle
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddFriendModal
        isOpen={isAddFriendModalOpen}
        onClose={() => setIsAddFriendModalOpen(false)}
        onFriendCreated={() => loadData()}
      />

      <RecordSettlementModal
        isOpen={settlementModalConfig.isOpen}
        onClose={() => setSettlementModalConfig((prev) => ({ ...prev, isOpen: false }))}
        friends={data.activeFriends}
        defaultPayerId={settlementModalConfig.defaultPayerId}
        defaultRecipientId={settlementModalConfig.defaultRecipientId}
        defaultAmount={settlementModalConfig.defaultAmount}
        maxSuggestedAmount={settlementModalConfig.maxSuggestedAmount}
        onSettlementSaved={() => loadData()}
      />
    </div>
  );
}
