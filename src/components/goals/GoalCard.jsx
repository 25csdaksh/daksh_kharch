import React from 'react';
import {
  Target,
  Shield,
  GraduationCap,
  Laptop,
  Plane,
  Car,
  Home,
  TrendingUp,
  Pause,
  Play,
  Archive,
  Plus,
  Clock,
  AlertCircle,
  Landmark,
  Edit2,
  ChevronRight
} from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';
import { calculateDaysRemaining } from '../../utils/goalUtils';
import './GoalCard.css';

const ICON_MAP = {
  Target,
  Shield,
  GraduationCap,
  Laptop,
  Plane,
  Car,
  Home,
  TrendingUp
};

export default function GoalCard({
  goal,
  onViewDetails,
  onAddContribution,
  onEdit,
  onTogglePause,
  onArchive
}) {
  const IconComponent = ICON_MAP[goal.icon] || Target;
  const progress = goal.progress || {
    progressPercentage: 0,
    displayPercentage: 0,
    remainingAmount: goal.target_amount,
    isCompleted: false,
    isOverfunded: false,
    overfundedAmount: 0
  };

  const status = goal.computedStatus || goal.status || 'not_started';
  const daysRemaining = calculateDaysRemaining(goal.target_date);

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <span className="goal-status-badge badge-completed">Completed</span>;
      case 'paused':
        return <span className="goal-status-badge badge-paused">Paused</span>;
      case 'overdue':
        return <span className="goal-status-badge badge-overdue">Overdue</span>;
      case 'not_started':
        return <span className="goal-status-badge badge-not-started">Not Started</span>;
      case 'in_progress':
      default:
        return <span className="goal-status-badge badge-in-progress">In Progress</span>;
    }
  };

  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';

  return (
    <article className="goal-card" aria-label={`Savings goal ${goal.name}`}>
      {/* Category theme accent top border */}
      <div
        className="goal-card-top-accent"
        style={{ backgroundColor: goal.color || '#064E3B' }}
      />

      <div className="goal-card-header">
        <div className="goal-header-left">
          <div
            className="goal-icon-badge"
            style={{ backgroundColor: goal.color || '#064E3B' }}
          >
            <IconComponent size={22} />
          </div>
          <div className="goal-title-wrap">
            <h3 className="goal-card-name" title={goal.name}>
              {goal.name}
            </h3>
            <span className="goal-card-category">{goal.category}</span>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {goal.description && (
        <p className="goal-card-description">{goal.description}</p>
      )}

      {/* Progress Bar & Amount Row */}
      <div className="goal-progress-section">
        <div className="goal-progress-stats-row">
          <div>
            <span className="goal-saved-text">
              {formatCurrencyINR(goal.current_amount || 0, false)}
            </span>
            <span className="goal-target-text">
              {' '}of {formatCurrencyINR(goal.target_amount, false)}
            </span>
          </div>
          <span className="goal-percent-badge">
            {progress.displayPercentage}%
            {progress.isOverfunded && ' (Overfunded)'}
          </span>
        </div>

        <div className="goal-progress-bar-bg" role="progressbar" aria-valuenow={progress.displayPercentage} aria-valuemin="0" aria-valuemax="100">
          <div
            className="goal-progress-bar-fill"
            style={{
              width: `${progress.displayPercentage}%`,
              backgroundColor: isCompleted ? '#059669' : (goal.color || '#064E3B')
            }}
          />
        </div>
      </div>

      {/* Meta Grid: Remaining & Deadline */}
      <div className="goal-meta-grid">
        <div className="goal-meta-item">
          <span className="goal-meta-label">Remaining</span>
          <span className="goal-meta-value">
            {isCompleted ? 'Goal Met!' : formatCurrencyINR(progress.remainingAmount, false)}
          </span>
        </div>

        <div className="goal-meta-item">
          <span className="goal-meta-label">Target Date</span>
          <span className="goal-meta-value">
            {goal.target_date ? (
              <>
                <Clock size={12} className="text-secondary" />
                <span>
                  {new Date(`${goal.target_date}T00:00:00`).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: '2-digit'
                  })}
                  {daysRemaining !== null && (
                    <span style={{ fontSize: '11px', color: daysRemaining < 0 ? '#DC2626' : 'inherit', marginLeft: '3px' }}>
                      ({daysRemaining < 0 ? `${Math.abs(daysRemaining)}d late` : `${daysRemaining}d left`})
                    </span>
                  )}
                </span>
              </>
            ) : (
              'No deadline'
            )}
          </span>
        </div>
      </div>

      {/* Linked Account Pill if linked */}
      {goal.linked_account && (
        <div className="goal-linked-pill" title={`Linked to account: ${goal.linked_account.name}`}>
          <Landmark size={12} />
          <span>Linked: <strong>{goal.linked_account.name}</strong></span>
        </div>
      )}

      {/* Actions */}
      <div className="goal-card-actions">
        <button
          className="btn-contribute-quick"
          onClick={() => onAddContribution(goal)}
          disabled={goal.is_archived || isPaused}
          title="Add contribution or withdrawal"
          aria-label={`Add contribution to ${goal.name}`}
        >
          <Plus size={15} />
          <span>Contribute</span>
        </button>

        <div className="goal-icon-btn-group">
          <button
            className="btn-goal-icon"
            onClick={() => onViewDetails(goal)}
            title="View Details & Planner"
            aria-label={`View details for ${goal.name}`}
          >
            <ChevronRight size={16} />
          </button>

          <button
            className="btn-goal-icon"
            onClick={() => onEdit(goal)}
            title="Edit Goal"
            aria-label={`Edit ${goal.name}`}
          >
            <Edit2 size={14} />
          </button>

          <button
            className="btn-goal-icon"
            onClick={() => onTogglePause(goal, !isPaused)}
            title={isPaused ? 'Resume Goal' : 'Pause Goal'}
            aria-label={isPaused ? `Resume ${goal.name}` : `Pause ${goal.name}`}
          >
            {isPaused ? <Play size={14} /> : <Pause size={14} />}
          </button>

          <button
            className="btn-goal-icon"
            onClick={() => onArchive(goal, !goal.is_archived)}
            title={goal.is_archived ? 'Unarchive Goal' : 'Archive Goal'}
            aria-label={goal.is_archived ? `Unarchive ${goal.name}` : `Archive ${goal.name}`}
          >
            <Archive size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
