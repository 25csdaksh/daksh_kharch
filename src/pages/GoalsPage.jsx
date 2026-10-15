import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Target,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  FolderArchive,
  PauseCircle,
  Coins
} from 'lucide-react';
import GoalCard from '../components/goals/GoalCard';
import GoalModal from '../components/goals/GoalModal';
import GoalContributionModal from '../components/goals/GoalContributionModal';
import GoalDetailDrawer from '../components/goals/GoalDetailDrawer';
import {
  getGoals,
  toggleGoalPause,
  archiveGoal
} from '../services/goalService';
import { getAccounts } from '../services/accountService';
import { calculateGoalsSummary } from '../utils/goalUtils';
import { formatCurrencyINR } from '../utils/dateUtils';
import './GoalsPage.css';

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed' | 'paused' | 'archived'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const [isContribModalOpen, setIsContribModalOpen] = useState(false);
  const [contributingGoal, setContributingGoal] = useState(null);

  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [detailedGoal, setDetailedGoal] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [goalsData, accountsData] = await Promise.all([
        getGoals({ includeArchived: true }),
        getAccounts({ includeArchived: false }).catch(() => [])
      ]);
      setGoals(goalsData || []);
      setAccounts(accountsData || []);
    } catch (err) {
      console.error('Error loading goals page data:', err);
      setError(err.message || 'Failed to load savings goals.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleGoalChange = () => {
      loadData();
    };

    window.addEventListener('goal:changed', handleGoalChange);
    return () => {
      window.removeEventListener('goal:changed', handleGoalChange);
    };
  }, [loadData]);

  // Compute portfolio summary metrics across all active & completed goals
  const summary = useMemo(() => {
    return calculateGoalsSummary(goals);
  }, [goals]);

  // Tab counts
  const counts = useMemo(() => {
    return {
      active: goals.filter((g) => !g.is_archived && g.status !== 'completed' && g.status !== 'paused').length,
      completed: goals.filter((g) => !g.is_archived && g.status === 'completed').length,
      paused: goals.filter((g) => !g.is_archived && g.status === 'paused').length,
      archived: goals.filter((g) => g.is_archived).length
    };
  }, [goals]);

  // Filtered goals based on activeTab and search query
  const filteredGoals = useMemo(() => {
    return goals.filter((g) => {
      // 1. Tab filter
      if (activeTab === 'active') {
        if (g.is_archived || g.status === 'completed' || g.status === 'paused') return false;
      } else if (activeTab === 'completed') {
        if (g.is_archived || g.status !== 'completed') return false;
      } else if (activeTab === 'paused') {
        if (g.is_archived || g.status !== 'paused') return false;
      } else if (activeTab === 'archived') {
        if (!g.is_archived) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = g.name?.toLowerCase().includes(q);
        const matchesCategory = g.category?.toLowerCase().includes(q);
        const matchesDesc = g.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesDesc) return false;
      }

      return true;
    });
  }, [goals, activeTab, searchQuery]);

  // Action handlers
  const handleOpenCreateModal = () => {
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  };

  const handleOpenEditModal = (goal) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  const handleOpenContribution = (goal) => {
    setContributingGoal(goal);
    setIsContribModalOpen(true);
  };

  const handleOpenDetails = (goal) => {
    setDetailedGoal(goal);
    setIsDetailDrawerOpen(true);
  };

  const handleTogglePause = async (goal, shouldPause) => {
    try {
      await toggleGoalPause(goal.id, shouldPause);
      await loadData();
    } catch (err) {
      alert(`Could not toggle pause state: ${err.message}`);
    }
  };

  const handleArchive = async (goal, shouldArchive) => {
    const actionLabel = shouldArchive ? 'archive' : 'unarchive';
    if (!window.confirm(`Are you sure you want to ${actionLabel} "${goal.name}"?`)) return;

    try {
      await archiveGoal(goal.id, shouldArchive);
      await loadData();
    } catch (err) {
      alert(`Could not ${actionLabel} goal: ${err.message}`);
    }
  };

  return (
    <div className="goals-page-container">
      {/* Executive KPI Summary Header */}
      <section className="goals-kpi-grid" aria-label="Savings Goals Executive Metrics">
        <div className="goals-kpi-card">
          <div className="goals-kpi-icon-wrap kpi-emerald">
            <Target size={24} />
          </div>
          <div className="goals-kpi-info">
            <span className="goals-kpi-label">Active Savings</span>
            <span className="goals-kpi-value">
              {formatCurrencyINR(summary.totalContributedAmount, false)}
            </span>
            <span className="goals-kpi-sub">
              of {formatCurrencyINR(summary.totalTargetAmount, false)} target
            </span>
          </div>
        </div>

        <div className="goals-kpi-card">
          <div className="goals-kpi-icon-wrap kpi-blue">
            <TrendingUp size={24} />
          </div>
          <div className="goals-kpi-info">
            <span className="goals-kpi-label">Overall Progress</span>
            <span className="goals-kpi-value text-emerald">
              {summary.overallProgress}%
            </span>
            <span className="goals-kpi-sub">
              {formatCurrencyINR(summary.totalRemainingAmount, false)} remaining
            </span>
          </div>
        </div>

        <div className="goals-kpi-card">
          <div className="goals-kpi-icon-wrap kpi-purple">
            <CheckCircle2 size={24} />
          </div>
          <div className="goals-kpi-info">
            <span className="goals-kpi-label">Goals Met</span>
            <span className="goals-kpi-value">
              {summary.completedGoalsCount}
            </span>
            <span className="goals-kpi-sub">
              {summary.totalActiveGoals} currently active
            </span>
          </div>
        </div>

        <div className="goals-kpi-card">
          <div className="goals-kpi-icon-wrap kpi-amber">
            <Clock size={24} />
          </div>
          <div className="goals-kpi-info">
            <span className="goals-kpi-label">Approaching Target</span>
            <span className="goals-kpi-value" style={{ color: summary.approachingGoalsCount > 0 ? '#D97706' : 'inherit' }}>
              {summary.approachingGoalsCount}
            </span>
            <span className="goals-kpi-sub">
              Due within 30 days
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div className="modal-error-banner" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <span>{error}</span>
            <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={loadData}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Controls Bar: Tabs, Search, and New Goal Action */}
      <div className="goals-controls-bar">
        <div className="goals-tab-group" role="tablist">
          <button
            type="button"
            className={`goals-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
            role="tab"
            aria-selected={activeTab === 'active'}
          >
            <span>Active Goals</span>
            <span className="goals-tab-count">{counts.active}</span>
          </button>

          <button
            type="button"
            className={`goals-tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
            role="tab"
            aria-selected={activeTab === 'completed'}
          >
            <span>Completed</span>
            <span className="goals-tab-count">{counts.completed}</span>
          </button>

          <button
            type="button"
            className={`goals-tab-btn ${activeTab === 'paused' ? 'active' : ''}`}
            onClick={() => setActiveTab('paused')}
            role="tab"
            aria-selected={activeTab === 'paused'}
          >
            <span>Paused</span>
            <span className="goals-tab-count">{counts.paused}</span>
          </button>

          <button
            type="button"
            className={`goals-tab-btn ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
            role="tab"
            aria-selected={activeTab === 'archived'}
          >
            <span>Archived</span>
            <span className="goals-tab-count">{counts.archived}</span>
          </button>
        </div>

        <div className="goals-controls-right">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search goals..."
              className="goals-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search savings goals"
            />
          </div>

          <button
            type="button"
            className="btn-new-goal"
            onClick={handleOpenCreateModal}
            aria-label="Create New Savings Goal"
          >
            <Plus size={16} />
            <span>Create Goal</span>
          </button>
        </div>
      </div>

      {/* Goals Content Area */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary, #64748B)' }}>
          <RefreshCw size={24} className="spinner-icon" style={{ marginBottom: '12px' }} />
          <div>Loading your savings goals ledger...</div>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="goals-empty-state">
          <div className="goals-empty-icon">
            <Coins size={28} />
          </div>
          <h3 className="goals-empty-title">
            {searchQuery ? 'No matching savings goals' : `No ${activeTab} goals found`}
          </h3>
          <p className="goals-empty-text">
            {searchQuery
              ? `No goals matched your filter "${searchQuery}". Try a different keyword or clear search.`
              : activeTab === 'active'
              ? 'Start building wealth with targeted savings goals. Track emergency funds, travel, gadgets, and investments.'
              : `You have no ${activeTab} goals currently.`}
          </p>
          {activeTab === 'active' && !searchQuery && (
            <button
              type="button"
              className="btn-new-goal"
              onClick={handleOpenCreateModal}
            >
              <Plus size={16} />
              <span>Create Your First Goal</span>
            </button>
          )}
        </div>
      ) : (
        <div className="goals-grid">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onViewDetails={handleOpenDetails}
              onAddContribution={handleOpenContribution}
              onEdit={handleOpenEditModal}
              onTogglePause={handleTogglePause}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        initialGoal={editingGoal}
        accounts={accounts}
        onSuccess={loadData}
      />

      {/* Contribution / Withdrawal Modal */}
      <GoalContributionModal
        isOpen={isContribModalOpen}
        onClose={() => setIsContribModalOpen(false)}
        goal={contributingGoal}
        accounts={accounts}
        onSuccess={loadData}
      />

      {/* Goal Details & Planner Drawer */}
      <GoalDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        goal={detailedGoal}
        onAddContribution={(g) => {
          setIsDetailDrawerOpen(false);
          handleOpenContribution(g);
        }}
        onEdit={(g) => {
          setIsDetailDrawerOpen(false);
          handleOpenEditModal(g);
        }}
        onGoalUpdated={loadData}
      />
    </div>
  );
}
