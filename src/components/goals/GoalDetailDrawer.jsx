import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Info,
  CalendarDays
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { formatCurrencyINR } from '../../utils/dateUtils';
import {
  calculateSavingsPlanner,
  calculateDaysRemaining
} from '../../utils/goalUtils';
import {
  getGoalDetailsWithTransactions,
  deleteGoalTransaction
} from '../../services/goalService';
import './GoalDetailDrawer.css';

export default function GoalDetailDrawer({
  isOpen,
  onClose,
  goal: initialGoal,
  onAddContribution,
  onEdit,
  onGoalUpdated
}) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingTxId, setDeletingTxId] = useState(null);

  const fetchDetails = async () => {
    if (!initialGoal) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await getGoalDetailsWithTransactions(initialGoal.id);
      setDetails(data);
    } catch (err) {
      console.error('Error fetching goal details:', err);
      setError(err.message || 'Failed to load goal details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && initialGoal) {
      fetchDetails();
    }
  }, [isOpen, initialGoal]);

  if (!isOpen || !initialGoal) return null;

  const currentGoal = details?.goal || initialGoal;
  const progress = currentGoal.progress || {
    progressPercentage: 0,
    displayPercentage: 0,
    remainingAmount: currentGoal.target_amount,
    isCompleted: false,
    isOverfunded: false,
    overfundedAmount: 0
  };

  const planner = calculateSavingsPlanner({
    targetAmount: currentGoal.target_amount,
    currentAmount: currentGoal.current_amount,
    targetDate: currentGoal.target_date,
    monthlyTarget: currentGoal.monthly_target
  });

  const handleDeleteTransaction = async (tx) => {
    const isContrib = tx.type === 'contribution';
    const confirmMsg = `Are you sure you want to revert this ${tx.type} of ${formatCurrencyINR(tx.amount)}? Your goal balance will be adjusted accordingly.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setDeletingTxId(tx.id);
      await deleteGoalTransaction(tx.id);
      await fetchDetails();
      if (onGoalUpdated) onGoalUpdated();
    } catch (err) {
      alert(`Failed to delete transaction: ${err.message}`);
    } finally {
      setDeletingTxId(null);
    }
  };

  return (
    <div className="goal-drawer-overlay" role="dialog" aria-modal="true" aria-labelledby="drawer-goal-title">
      <div className="goal-drawer-container">
        {/* Header */}
        <div className="goal-drawer-header">
          <div className="goal-drawer-title-row">
            <div>
              <h2 id="drawer-goal-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                {currentGoal.name}
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)' }}>
                {currentGoal.category} • Created on {new Date(currentGoal.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-goal-icon"
              onClick={() => onEdit(currentGoal)}
              title="Edit Goal"
              aria-label="Edit Goal"
            >
              <Edit2 size={16} />
            </button>
            <button
              className="btn-modal-close"
              onClick={onClose}
              title="Close Drawer"
              aria-label="Close Drawer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="goal-drawer-body">
          {error && (
            <div className="modal-error-banner" role="alert">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Action Strip */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn-contribute-quick"
              style={{ padding: '10px 16px', fontSize: '14px' }}
              onClick={() => onAddContribution(currentGoal)}
            >
              <Plus size={16} />
              <span>Add Contribution / Withdrawal</span>
            </button>
          </div>

          {/* Overview Card */}
          <section className="goal-overview-card" aria-label="Goal Progress Summary">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0F172A)' }}>
                  {formatCurrencyINR(currentGoal.current_amount || 0, false)}
                </span>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary, #64748B)' }}>
                  {' '}saved of {formatCurrencyINR(currentGoal.target_amount, false)}
                </span>
              </div>
              <span className="goal-percent-badge" style={{ fontSize: '14px', padding: '4px 8px' }}>
                {progress.displayPercentage}%
              </span>
            </div>

            <div className="goal-progress-bar-bg" style={{ height: '10px' }}>
              <div
                className="goal-progress-bar-fill"
                style={{
                  width: `${progress.displayPercentage}%`,
                  backgroundColor: progress.isCompleted ? '#059669' : (currentGoal.color || '#064E3B')
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary, #64748B)' }}>
              <span>
                Remaining:{' '}
                <strong style={{ color: 'var(--text-primary, #0F172A)' }}>
                  {progress.isCompleted ? 'Goal Reached!' : formatCurrencyINR(progress.remainingAmount, false)}
                </strong>
              </span>
              {progress.isOverfunded && (
                <span style={{ color: '#059669', fontWeight: 600 }}>
                  Overfunded by {formatCurrencyINR(progress.overfundedAmount, false)}
                </span>
              )}
            </div>

            {currentGoal.linked_account && (
              <div className="goal-linked-pill" style={{ marginTop: '4px' }}>
                <Landmark size={13} />
                <span>Linked Account: <strong>{currentGoal.linked_account.name}</strong></span>
              </div>
            )}
          </section>

          {/* Savings Planner Section */}
          <section className="goal-planner-card" aria-label="Savings Planner & Schedule">
            <div className="planner-header">
              <span className="planner-title">
                <CalendarDays size={18} />
                <span>Smart Savings Planner</span>
              </span>
              {currentGoal.target_date && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary, #64748B)' }}>
                  Due: {new Date(`${currentGoal.target_date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>

            <div className="planner-grid">
              <div className="planner-stat-box">
                <span className="planner-stat-label">Suggested Monthly</span>
                <span className="planner-stat-val text-emerald">
                  {planner.suggestedMonthly !== null
                    ? formatCurrencyINR(planner.suggestedMonthly, false)
                    : 'N/A'}
                </span>
              </div>

              <div className="planner-stat-box">
                <span className="planner-stat-label">Suggested Weekly</span>
                <span className="planner-stat-val">
                  {planner.suggestedWeekly !== null
                    ? formatCurrencyINR(planner.suggestedWeekly, false)
                    : 'N/A'}
                </span>
              </div>

              <div className="planner-stat-box">
                <span className="planner-stat-label">Time Remaining</span>
                <span className="planner-stat-val">
                  {planner.daysRemaining !== null
                    ? planner.daysRemaining < 0
                      ? `${Math.abs(planner.daysRemaining)} days overdue`
                      : `${planner.daysRemaining} days (${planner.remainingMonths} mo)`
                    : 'No target date'}
                </span>
              </div>

              <div className="planner-stat-box">
                <span className="planner-stat-label">Target Sufficiency</span>
                <span
                  className="planner-stat-val"
                  style={{
                    fontSize: '13px',
                    color: planner.isTargetSufficient === false ? '#DC2626' : '#059669'
                  }}
                >
                  {currentGoal.monthly_target
                    ? planner.isTargetSufficient
                      ? 'Sufficient'
                      : `Deficit: ${formatCurrencyINR(planner.targetDeficit, false)}/mo`
                    : 'No monthly cap set'}
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-primary, #0F172A)' }}>
              {planner.message}
            </p>

            <span className="planner-disclaimer">
              * Note: Calculations are mathematical planning projections, not guaranteed financial results.
            </span>
          </section>

          {/* Monthly Progress Chart */}
          {details?.monthlyChartData && details.monthlyChartData.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
                  Monthly Contribution Velocity
                </span>
                {details.averageMonthlyContribution > 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)' }}>
                    Avg: <strong>{formatCurrencyINR(details.averageMonthlyContribution, false)}/mo</strong>
                  </span>
                )}
              </div>

              <div style={{ height: '180px', width: '100%', background: 'var(--bg-secondary, #F8FAFC)', borderRadius: '8px', padding: '10px 10px 0 0', boxSizing: 'border-box' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={details.monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(100, 116, 139, 0.2)" />
                    <XAxis dataKey="label" fontSize={11} tickLine={false} />
                    <YAxis fontSize={11} tickLine={false} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip
                      formatter={(val) => [formatCurrencyINR(val), 'Saved']}
                      labelFormatter={(lbl) => `Month: ${lbl}`}
                    />
                    <Bar dataKey="amount" fill={currentGoal.color || '#064E3B'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {details?.completionEstimate && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)', padding: '6px 8px', background: 'var(--bg-secondary, #F8FAFC)', borderRadius: '6px' }}>
                  <Info size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  <span>{details.completionEstimate.text}</span>
                </div>
              )}
            </section>
          )}

          {/* Transaction Activity Timeline */}
          <section className="goal-timeline-section" aria-label="Goal Transaction History">
            <div className="timeline-title-row">
              <span className="timeline-title">Contribution & Withdrawal Ledger</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary, #64748B)' }}>
                {details?.transactions?.length || 0} transaction(s)
              </span>
            </div>

            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary, #64748B)' }}>
                Loading transaction history...
              </div>
            ) : !details?.transactions || details.transactions.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-secondary, #F8FAFC)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary, #64748B)' }}>
                No contributions or withdrawals recorded yet.
              </div>
            ) : (
              <div className="timeline-list">
                {details.transactions.map((tx) => {
                  const isContrib = tx.type === 'contribution';
                  return (
                    <div key={tx.id} className="timeline-item">
                      <div className="timeline-item-left">
                        <div className={`timeline-item-icon ${isContrib ? 'icon-contrib' : 'icon-withdraw'}`}>
                          {isContrib ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="timeline-item-details">
                          <span className="timeline-item-desc">
                            {tx.note || (isContrib ? 'Goal Contribution' : 'Goal Withdrawal')}
                          </span>
                          <span className="timeline-item-sub">
                            {new Date(tx.transaction_date).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                            {tx.source_account && ` • Via ${tx.source_account.name}`}
                          </span>
                        </div>
                      </div>

                      <div className="timeline-item-right">
                        <span className={`timeline-item-amount ${isContrib ? 'amount-positive' : 'amount-negative'}`}>
                          {isContrib ? '+' : '−'}{formatCurrencyINR(tx.amount, false)}
                        </span>
                        <button
                          className="btn-delete-tx"
                          onClick={() => handleDeleteTransaction(tx)}
                          disabled={deletingTxId === tx.id}
                          title="Revert / Delete Entry"
                          aria-label={`Revert entry ${tx.amount}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
