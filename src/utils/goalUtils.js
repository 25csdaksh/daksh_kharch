/**
 * HisabSetu — Savings Goals & Progress Tracking Utilities
 * Mathematical formulas, category metadata, input validation, and savings planner logic.
 */

import { formatCurrencyINR, getTodayLocalDateString } from './dateUtils.js';

export const GOAL_CATEGORIES = [
  { id: 'Emergency Fund', label: 'Emergency Fund', icon: 'Shield', defaultColor: '#059669' },
  { id: 'Education', label: 'Education', icon: 'GraduationCap', defaultColor: '#2563EB' },
  { id: 'Electronics', label: 'Electronics', icon: 'Laptop', defaultColor: '#8B5CF6' },
  { id: 'Travel', label: 'Travel & Vacation', icon: 'Plane', defaultColor: '#0EA5E9' },
  { id: 'Vehicle', label: 'Vehicle', icon: 'Car', defaultColor: '#F59E0B' },
  { id: 'Home', label: 'Home & Living', icon: 'Home', defaultColor: '#D97706' },
  { id: 'Investment', label: 'Investment & Wealth', icon: 'TrendingUp', defaultColor: '#10B981' },
  { id: 'Custom', label: 'Custom Goal', icon: 'Target', defaultColor: '#064E3B' }
];

export const ALLOWED_GOAL_CATEGORIES = GOAL_CATEGORIES.map((c) => c.id);

export const GOAL_STATUSES = [
  { id: 'not_started', label: 'Not Started', badgeClass: 'badge-secondary' },
  { id: 'in_progress', label: 'In Progress', badgeClass: 'badge-info' },
  { id: 'completed', label: 'Completed', badgeClass: 'badge-success' },
  { id: 'paused', label: 'Paused', badgeClass: 'badge-warning' },
  { id: 'overdue', label: 'Overdue', badgeClass: 'badge-danger' }
];

export const GOAL_TEMPLATES = [
  {
    name: '6-Month Emergency Fund',
    category: 'Emergency Fund',
    target_amount: 150000,
    icon: 'Shield',
    color: '#059669',
    description: 'Liquid buffer covering 6 months of living expenses.'
  },
  {
    name: 'Dream Vacation Trip',
    category: 'Travel',
    target_amount: 60000,
    icon: 'Plane',
    color: '#0EA5E9',
    description: 'Flight tickets, hotel stay, and leisure funds.'
  },
  {
    name: 'Tech Upgrade / Laptop',
    category: 'Electronics',
    target_amount: 85000,
    icon: 'Laptop',
    color: '#8B5CF6',
    description: 'High-performance laptop and desk workstation equipment.'
  },
  {
    name: 'Vehicle Downpayment',
    category: 'Vehicle',
    target_amount: 120000,
    icon: 'Car',
    color: '#F59E0B',
    description: 'Initial deposit for a two-wheeler or car purchase.'
  },
  {
    name: 'Home Renovation Fund',
    category: 'Home',
    target_amount: 250000,
    icon: 'Home',
    color: '#D97706',
    description: 'Interior upgrades, repairs, and appliance modernization.'
  },
  {
    name: 'Skill Certification / Degree',
    category: 'Education',
    target_amount: 45000,
    icon: 'GraduationCap',
    color: '#2563EB',
    description: 'Course fees, books, and professional examination costs.'
  }
];

/**
 * Decimal-safe round to 2 fractional places.
 */
export function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates progress percentage, remaining amount, and overfunded state for a goal.
 * Capped at 100% for progress bar display, while preserving legitimate overfunded amount.
 *
 * Progress percentage = (Current saved amount / Target amount) * 100
 * Remaining amount = max(Target amount - Current saved amount, 0)
 */
export function calculateGoalProgress(currentAmount, targetAmount) {
  const current = round2(Math.max(0, Number(currentAmount) || 0));
  const target = round2(Math.max(0, Number(targetAmount) || 0));

  if (target <= 0) {
    return {
      progressPercentage: 0,
      displayPercentage: 0,
      remainingAmount: 0,
      isCompleted: false,
      isOverfunded: false,
      overfundedAmount: 0,
      currentAmount: current,
      targetAmount: 0
    };
  }

  const rawPercentage = round2((current / target) * 100);
  const displayPercentage = Math.min(100, Math.max(0, rawPercentage));
  const remainingAmount = round2(Math.max(0, target - current));
  const isCompleted = current >= target;
  const isOverfunded = current > target;
  const overfundedAmount = isOverfunded ? round2(current - target) : 0;

  return {
    progressPercentage: rawPercentage,
    displayPercentage,
    remainingAmount,
    isCompleted,
    isOverfunded,
    overfundedAmount,
    currentAmount: current,
    targetAmount: target
  };
}

/**
 * Determines current dynamic status of a goal based on amounts, dates, and explicit flags.
 */
export function computeGoalStatus(goal, referenceDateStr = getTodayLocalDateString()) {
  if (!goal) return 'not_started';
  if (goal.status === 'paused') return 'paused';
  if (goal.is_archived) return 'completed';

  const current = Number(goal.current_amount || 0);
  const target = Number(goal.target_amount || 0);

  if (target > 0 && current >= target) {
    return 'completed';
  }

  if (goal.target_date && goal.target_date < referenceDateStr) {
    return 'overdue';
  }

  if (current <= 0) {
    return 'not_started';
  }

  return 'in_progress';
}

/**
 * Calculates days remaining between today (or reference date) and a target date.
 * Returns null if target date is not set or invalid.
 */
export function calculateDaysRemaining(targetDateStr, referenceDateStr = getTodayLocalDateString()) {
  if (!targetDateStr) return null;
  const targetTime = new Date(`${targetDateStr}T00:00:00`).getTime();
  const refTime = new Date(`${referenceDateStr}T00:00:00`).getTime();

  if (isNaN(targetTime) || isNaN(refTime)) return null;

  const diffMs = targetTime - refTime;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculates savings planner recommendations.
 * Computes suggested monthly & weekly contributions to meet the goal by target date.
 */
export function calculateSavingsPlanner({
  targetAmount,
  currentAmount,
  targetDate,
  monthlyTarget = null,
  referenceDateStr = getTodayLocalDateString()
}) {
  const { remainingAmount, isCompleted, isOverfunded } = calculateGoalProgress(currentAmount, targetAmount);

  // If already completed or overfunded
  if (isCompleted || remainingAmount <= 0) {
    return {
      status: 'completed',
      remainingAmount: 0,
      daysRemaining: 0,
      remainingMonths: 0,
      remainingWeeks: 0,
      suggestedMonthly: 0,
      suggestedWeekly: 0,
      isTargetSufficient: true,
      targetDeficit: 0,
      message: 'Goal completed! You have reached your target savings amount.'
    };
  }

  // If no target date is set
  if (!targetDate) {
    return {
      status: 'no_target_date',
      remainingAmount,
      daysRemaining: null,
      remainingMonths: null,
      remainingWeeks: null,
      suggestedMonthly: null,
      suggestedWeekly: null,
      isTargetSufficient: null,
      targetDeficit: 0,
      message: 'Set a target completion date to calculate your monthly savings schedule.'
    };
  }

  const daysRemaining = calculateDaysRemaining(targetDate, referenceDateStr);

  if (daysRemaining === null) {
    return {
      status: 'invalid_date',
      remainingAmount,
      daysRemaining: null,
      remainingMonths: null,
      remainingWeeks: null,
      suggestedMonthly: null,
      suggestedWeekly: null,
      isTargetSufficient: null,
      targetDeficit: 0,
      message: 'Target date format is invalid.'
    };
  }

  // If overdue
  if (daysRemaining < 0) {
    return {
      status: 'overdue',
      remainingAmount,
      daysRemaining,
      remainingMonths: 0,
      remainingWeeks: 0,
      suggestedMonthly: remainingAmount,
      suggestedWeekly: remainingAmount,
      isTargetSufficient: false,
      targetDeficit: remainingAmount,
      message: `Goal is overdue by ${Math.abs(daysRemaining)} day(s). Immediate savings of ${formatCurrencyINR(remainingAmount)} required.`
    };
  }

  // If due today or within 7 days
  if (daysRemaining <= 7) {
    return {
      status: 'due_soon',
      remainingAmount,
      daysRemaining,
      remainingMonths: 1,
      remainingWeeks: 1,
      suggestedMonthly: remainingAmount,
      suggestedWeekly: remainingAmount,
      isTargetSufficient: monthlyTarget ? monthlyTarget >= remainingAmount : null,
      targetDeficit: monthlyTarget ? Math.max(0, round2(remainingAmount - monthlyTarget)) : 0,
      message: `Goal is due within ${daysRemaining === 0 ? 'today' : `${daysRemaining} days`}. Suggested immediate contribution: ${formatCurrencyINR(remainingAmount)}.`
    };
  }

  // Calculate remaining months and weeks
  const remainingWeeks = Math.max(1, Math.ceil(daysRemaining / 7));
  const remainingMonths = Math.max(1, Math.ceil(daysRemaining / 30.4375));

  const suggestedMonthly = round2(remainingAmount / remainingMonths);
  const suggestedWeekly = round2(remainingAmount / remainingWeeks);

  let isTargetSufficient = null;
  let targetDeficit = 0;
  if (monthlyTarget !== null && monthlyTarget !== undefined && Number(monthlyTarget) > 0) {
    const numTarget = Number(monthlyTarget);
    isTargetSufficient = numTarget >= suggestedMonthly;
    targetDeficit = isTargetSufficient ? 0 : round2(suggestedMonthly - numTarget);
  }

  return {
    status: 'on_track',
    remainingAmount,
    daysRemaining,
    remainingMonths,
    remainingWeeks,
    suggestedMonthly,
    suggestedWeekly,
    isTargetSufficient,
    targetDeficit,
    message: `Save ${formatCurrencyINR(suggestedMonthly)}/month across ${remainingMonths} month(s) to hit your goal on schedule.`
  };
}

/**
 * Validates Goal Input form payload.
 */
export function validateGoalInput(payload) {
  const errors = {};

  if (!payload.name || !payload.name.trim()) {
    errors.name = 'Goal name is required.';
  } else if (payload.name.trim().length > 100) {
    errors.name = 'Goal name must not exceed 100 characters.';
  }

  if (payload.category && !ALLOWED_GOAL_CATEGORIES.includes(payload.category)) {
    errors.category = `Invalid category. Must be one of: ${ALLOWED_GOAL_CATEGORIES.join(', ')}`;
  }

  const target = Number(payload.target_amount);
  if (isNaN(target) || target <= 0) {
    errors.target_amount = 'Target amount must be a positive number greater than zero.';
  } else if (target > 9999999999.99) {
    errors.target_amount = 'Target amount exceeds maximum supported limit (₹9,99,99,99,999.99).';
  }

  if (payload.initial_amount !== undefined && payload.initial_amount !== null && payload.initial_amount !== '') {
    const initial = Number(payload.initial_amount);
    if (isNaN(initial) || initial < 0) {
      errors.initial_amount = 'Initial saved amount cannot be negative.';
    } else if (target > 0 && initial > target && !payload.allow_overfunded) {
      errors.initial_amount = 'Initial amount exceeds target amount. Check the confirmation box if intentional.';
    }
  }

  if (payload.start_date) {
    const start = new Date(`${payload.start_date}T00:00:00`);
    if (isNaN(start.getTime())) {
      errors.start_date = 'Invalid start date format (use YYYY-MM-DD).';
    }
  }

  if (payload.target_date) {
    const targetDateObj = new Date(`${payload.target_date}T00:00:00`);
    if (isNaN(targetDateObj.getTime())) {
      errors.target_date = 'Invalid target completion date format (use YYYY-MM-DD).';
    } else if (payload.start_date) {
      const startDateObj = new Date(`${payload.start_date}T00:00:00`);
      if (!isNaN(startDateObj.getTime()) && targetDateObj < startDateObj) {
        errors.target_date = 'Target date cannot be earlier than start date.';
      }
    }
  }

  if (payload.monthly_target !== undefined && payload.monthly_target !== null && payload.monthly_target !== '') {
    const mTarget = Number(payload.monthly_target);
    if (isNaN(mTarget) || mTarget <= 0) {
      errors.monthly_target = 'Monthly target must be a positive number greater than zero.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validates Goal Transaction payload (Contribution or Withdrawal).
 */
export function validateGoalTransactionInput(payload, currentGoalAmount = 0) {
  const errors = {};

  if (!payload.type || !['contribution', 'withdrawal'].includes(payload.type)) {
    errors.type = 'Transaction type must be either "contribution" or "withdrawal".';
  }

  const amt = Number(payload.amount);
  if (isNaN(amt) || amt <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (amt > 9999999999.99) {
    errors.amount = 'Amount exceeds maximum supported limit.';
  }

  if (payload.type === 'withdrawal' && amt > Number(currentGoalAmount || 0)) {
    errors.amount = `Withdrawal amount (${formatCurrencyINR(amt)}) cannot exceed currently saved goal balance (${formatCurrencyINR(currentGoalAmount)}).`;
  }

  if (!payload.transaction_date) {
    errors.transaction_date = 'Transaction date is required.';
  } else {
    const txDate = new Date(`${payload.transaction_date}T00:00:00`);
    if (isNaN(txDate.getTime())) {
      errors.transaction_date = 'Invalid date format (use YYYY-MM-DD).';
    }
  }

  if (payload.note && payload.note.length > 500) {
    errors.note = 'Note must not exceed 500 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Aggregates portfolio savings metrics across all active goals for dashboard summary.
 */
export function calculateGoalsSummary(goals = []) {
  const activeGoals = goals.filter((g) => !g.is_archived && g.status !== 'completed');
  const completedGoals = goals.filter((g) => !g.is_archived && g.status === 'completed');

  const totalActiveGoals = activeGoals.length;
  const completedGoalsCount = completedGoals.length;

  let totalTargetAmount = 0;
  let totalContributedAmount = 0;
  let approachingGoalsCount = 0;
  const todayStr = getTodayLocalDateString();

  for (const goal of activeGoals) {
    totalTargetAmount += Number(goal.target_amount || 0);
    totalContributedAmount += Number(goal.current_amount || 0);

    if (goal.target_date) {
      const days = calculateDaysRemaining(goal.target_date, todayStr);
      if (days !== null && days >= 0 && days <= 30) {
        approachingGoalsCount += 1;
      }
    }
  }

  totalTargetAmount = round2(totalTargetAmount);
  totalContributedAmount = round2(totalContributedAmount);
  const totalRemainingAmount = round2(Math.max(0, totalTargetAmount - totalContributedAmount));
  const overallProgress = totalTargetAmount > 0
    ? Math.min(100, round2((totalContributedAmount / totalTargetAmount) * 100))
    : 0;

  return {
    totalActiveGoals,
    totalTargetAmount,
    totalContributedAmount,
    totalRemainingAmount,
    overallProgress,
    completedGoalsCount,
    approachingGoalsCount
  };
}
