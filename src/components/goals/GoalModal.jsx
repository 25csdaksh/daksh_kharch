import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Shield,
  GraduationCap,
  Laptop,
  Plane,
  Car,
  Home,
  TrendingUp,
  AlertCircle,
  Save,
  Sparkles
} from 'lucide-react';
import {
  GOAL_CATEGORIES,
  GOAL_TEMPLATES,
  validateGoalInput
} from '../../utils/goalUtils';
import { getTodayLocalDateString } from '../../utils/dateUtils';
import { createGoal, updateGoal } from '../../services/goalService';
import './GoalModal.css';

const COLOR_OPTIONS = [
  '#064E3B', // Deep Emerald
  '#059669', // Emerald
  '#2563EB', // Royal Blue
  '#8B5CF6', // Purple
  '#0EA5E9', // Sky Blue
  '#F59E0B', // Amber
  '#D97706', // Orange
  '#DC2626'  // Crimson
];

const ICON_OPTIONS = [
  { id: 'Target', label: 'Target', icon: Target },
  { id: 'Shield', label: 'Emergency', icon: Shield },
  { id: 'GraduationCap', label: 'Education', icon: GraduationCap },
  { id: 'Laptop', label: 'Tech', icon: Laptop },
  { id: 'Plane', label: 'Travel', icon: Plane },
  { id: 'Car', label: 'Vehicle', icon: Car },
  { id: 'Home', label: 'Home', icon: Home },
  { id: 'TrendingUp', label: 'Invest', icon: TrendingUp }
];

export default function GoalModal({
  isOpen,
  onClose,
  initialGoal = null,
  accounts = [],
  onSuccess
}) {
  const isEditing = Boolean(initialGoal);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Custom',
    target_amount: '',
    initial_amount: '',
    allow_overfunded: false,
    start_date: getTodayLocalDateString(),
    target_date: '',
    monthly_target: '',
    linked_account_id: '',
    funding_account_id: '',
    color: '#064E3B',
    icon: 'Target',
    description: ''
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialGoal) {
      setFormData({
        name: initialGoal.name || '',
        category: initialGoal.category || 'Custom',
        target_amount: initialGoal.target_amount?.toString() || '',
        initial_amount: '',
        allow_overfunded: false,
        start_date: initialGoal.start_date || getTodayLocalDateString(),
        target_date: initialGoal.target_date || '',
        monthly_target: initialGoal.monthly_target?.toString() || '',
        linked_account_id: initialGoal.linked_account_id || '',
        funding_account_id: '',
        color: initialGoal.color || '#064E3B',
        icon: initialGoal.icon || 'Target',
        description: initialGoal.description || ''
      });
    } else {
      setFormData({
        name: '',
        category: 'Custom',
        target_amount: '',
        initial_amount: '',
        allow_overfunded: false,
        start_date: getTodayLocalDateString(),
        target_date: '',
        monthly_target: '',
        linked_account_id: '',
        funding_account_id: '',
        color: '#064E3B',
        icon: 'Target',
        description: ''
      });
    }
    setErrors({});
    setServerError(null);
  }, [initialGoal, isOpen]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tpl) => {
    setFormData((prev) => ({
      ...prev,
      name: tpl.name,
      category: tpl.category,
      target_amount: tpl.target_amount.toString(),
      icon: tpl.icon,
      color: tpl.color,
      description: tpl.description
    }));
    setErrors({});
  };

  const handleCategoryChange = (catName) => {
    const meta = GOAL_CATEGORIES.find((c) => c.id === catName);
    setFormData((prev) => ({
      ...prev,
      category: catName,
      color: meta?.defaultColor || prev.color,
      icon: meta?.icon || prev.icon
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const validation = validateGoalInput({
      name: formData.name,
      category: formData.category,
      target_amount: formData.target_amount,
      initial_amount: isEditing ? undefined : (formData.initial_amount || 0),
      allow_overfunded: formData.allow_overfunded,
      start_date: formData.start_date,
      target_date: formData.target_date || null,
      monthly_target: formData.monthly_target || null
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        target_amount: parseFloat(formData.target_amount),
        start_date: formData.start_date,
        target_date: formData.target_date || null,
        monthly_target: formData.monthly_target ? parseFloat(formData.monthly_target) : null,
        linked_account_id: formData.linked_account_id || null,
        color: formData.color,
        icon: formData.icon,
        description: formData.description?.trim() || null
      };

      if (!isEditing) {
        payload.initial_amount = formData.initial_amount ? parseFloat(formData.initial_amount) : 0;
        payload.funding_account_id = formData.funding_account_id || null;
        await createGoal(payload);
      } else {
        await updateGoal(initialGoal.id, payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Goal submission error:', err);
      setServerError(err.message || 'Failed to save savings goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Asset accounts available for linking (exclude credit cards)
  const assetAccounts = accounts.filter((a) => !a.is_archived && a.type !== 'credit_card');

  return (
    <div className="goal-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="goal-modal-title">
      <div className="goal-modal-container">
        <div className="goal-modal-header">
          <h2 id="goal-modal-title" className="goal-modal-title">
            <Target size={20} className="text-emerald" />
            <span>{isEditing ? 'Edit Savings Goal' : 'Create New Savings Goal'}</span>
          </h2>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="goal-modal-body">
          {serverError && (
            <div className="modal-error-banner" role="alert">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Preset Templates (Only when creating) */}
          {!isEditing && (
            <div className="goal-templates-section">
              <span className="goal-templates-label">
                <Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                Quick Goal Presets:
              </span>
              <div className="goal-templates-pills">
                {GOAL_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    className="goal-template-pill"
                    onClick={() => handleApplyTemplate(tpl)}
                  >
                    <span>{tpl.name}</span>
                    <span style={{ fontSize: '11px', color: '#059669' }}>
                      (₹{tpl.target_amount / 1000}k)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="goal-form-grid">
            {/* Goal Name */}
            <div className="form-group-full">
              <label htmlFor="goal_name" className="goal-form-label">
                Goal Name <span className="required-star">*</span>
              </label>
              <input
                id="goal_name"
                type="text"
                placeholder="e.g. 6-Month Emergency Fund, Japan Trip"
                className={`goal-form-input ${errors.name ? 'input-error' : ''}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                maxLength={100}
                required
              />
              {errors.name && <div className="goal-form-error-msg">{errors.name}</div>}
            </div>

            {/* Category */}
            <div>
              <label htmlFor="goal_category" className="goal-form-label">
                Goal Category <span className="required-star">*</span>
              </label>
              <select
                id="goal_category"
                className="goal-form-select"
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {GOAL_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Amount */}
            <div>
              <label htmlFor="goal_target_amount" className="goal-form-label">
                Target Amount (₹ INR) <span className="required-star">*</span>
              </label>
              <input
                id="goal_target_amount"
                type="number"
                step="any"
                min="1"
                placeholder="e.g. 150000"
                className={`goal-form-input ${errors.target_amount ? 'input-error' : ''}`}
                value={formData.target_amount}
                onChange={(e) => {
                  setFormData({ ...formData, target_amount: e.target.value });
                  if (errors.target_amount) setErrors({ ...errors, target_amount: null });
                }}
                required
              />
              {errors.target_amount && (
                <div className="goal-form-error-msg">{errors.target_amount}</div>
              )}
            </div>

            {/* Initial Amount (Only when creating) */}
            {!isEditing && (
              <div>
                <label htmlFor="goal_initial_amount" className="goal-form-label">
                  Initial Saved Amount (₹)
                </label>
                <input
                  id="goal_initial_amount"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  className={`goal-form-input ${errors.initial_amount ? 'input-error' : ''}`}
                  value={formData.initial_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, initial_amount: e.target.value });
                    if (errors.initial_amount) setErrors({ ...errors, initial_amount: null });
                  }}
                />
                {errors.initial_amount && (
                  <div className="goal-form-error-msg">{errors.initial_amount}</div>
                )}
                {Number(formData.initial_amount) > Number(formData.target_amount) && (
                  <div style={{ marginTop: '6px' }}>
                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={formData.allow_overfunded}
                        onChange={(e) => setFormData({ ...formData, allow_overfunded: e.target.checked })}
                      />
                      <span>Allow initial saved amount to exceed target</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Linked Bank / Savings Account */}
            <div>
              <label htmlFor="goal_linked_account" className="goal-form-label">
                Linked Account (Optional)
              </label>
              <select
                id="goal_linked_account"
                className="goal-form-select"
                value={formData.linked_account_id}
                onChange={(e) => setFormData({ ...formData, linked_account_id: e.target.value })}
              >
                <option value="">Virtual Goal (No Linked Account)</option>
                {assetAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()})
                  </option>
                ))}
              </select>
              <div className="goal-form-help-text">
                Tracked independently. Linked accounts synchronize real deposits.
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="goal_start_date" className="goal-form-label">
                Start Date
              </label>
              <input
                id="goal_start_date"
                type="date"
                className="goal-form-input"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>

            {/* Target Completion Date */}
            <div>
              <label htmlFor="goal_target_date" className="goal-form-label">
                Target Completion Date (Optional)
              </label>
              <input
                id="goal_target_date"
                type="date"
                min={formData.start_date}
                className={`goal-form-input ${errors.target_date ? 'input-error' : ''}`}
                value={formData.target_date}
                onChange={(e) => {
                  setFormData({ ...formData, target_date: e.target.value });
                  if (errors.target_date) setErrors({ ...errors, target_date: null });
                }}
              />
              {errors.target_date && (
                <div className="goal-form-error-msg">{errors.target_date}</div>
              )}
            </div>

            {/* Monthly Target Target */}
            <div>
              <label htmlFor="goal_monthly_target" className="goal-form-label">
                Monthly Target Target (₹)
              </label>
              <input
                id="goal_monthly_target"
                type="number"
                step="any"
                min="1"
                placeholder="Optional monthly contribution target"
                className="goal-form-input"
                value={formData.monthly_target}
                onChange={(e) => setFormData({ ...formData, monthly_target: e.target.value })}
              />
            </div>

            {/* Initial Funding Account if initial deposit > 0 and linked account set */}
            {!isEditing && Number(formData.initial_amount) > 0 && formData.linked_account_id && (
              <div>
                <label htmlFor="funding_account_id" className="goal-form-label">
                  Fund From Account (Optional)
                </label>
                <select
                  id="funding_account_id"
                  className="goal-form-select"
                  value={formData.funding_account_id}
                  onChange={(e) => setFormData({ ...formData, funding_account_id: e.target.value })}
                >
                  <option value="">Virtual Entry (No Bank Transfer)</option>
                  {assetAccounts
                    .filter((a) => a.id !== formData.linked_account_id)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Theme Color Picker */}
            <div className="form-group-full">
              <label className="goal-form-label">Theme Color</label>
              <div className="goal-color-palette">
                {COLOR_OPTIONS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    className={`goal-color-swatch ${formData.color === col ? 'active-swatch' : ''}`}
                    style={{ backgroundColor: col }}
                    onClick={() => setFormData({ ...formData, color: col })}
                    aria-label={`Select color ${col}`}
                  />
                ))}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="form-group-full">
              <label className="goal-form-label">Goal Icon</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ICON_OPTIONS.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = formData.icon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`goal-template-pill ${isSelected ? 'active-swatch' : ''}`}
                      style={{
                        borderColor: isSelected ? formData.color : undefined,
                        backgroundColor: isSelected ? 'rgba(5, 150, 105, 0.12)' : undefined
                      }}
                      onClick={() => setFormData({ ...formData, icon: item.id })}
                    >
                      <IconComp size={16} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description / Notes */}
            <div className="form-group-full">
              <label htmlFor="goal_description" className="goal-form-label">
                Notes & Strategy (Optional)
              </label>
              <textarea
                id="goal_description"
                rows={2}
                placeholder="Reason, milestones, or saving strategies..."
                className="goal-form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={500}
              />
            </div>
          </div>

          <div className="goal-modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={isSubmitting}
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving Goal...' : isEditing ? 'Update Goal' : 'Create Goal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
