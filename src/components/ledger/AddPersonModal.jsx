import React, { useState } from 'react';
import { X, User, Phone, Mail, FileText, Calendar, IndianRupee, AlertCircle, Loader2 } from 'lucide-react';
import { createContact, updateContact } from '../../services/ledgerService';
import { validateContactInput } from '../../utils/ledgerEngine';
import './AddPersonModal.css';

export default function AddPersonModal({ isOpen, onClose, contactToEdit = null, onSaved }) {
  const isEditing = Boolean(contactToEdit);

  const [name, setName] = useState(contactToEdit?.name || '');
  const [phone, setPhone] = useState(contactToEdit?.phone || '');
  const [email, setEmail] = useState(contactToEdit?.email || '');
  const [notes, setNotes] = useState(contactToEdit?.notes || '');
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingDirection, setOpeningDirection] = useState('receivable'); // 'receivable' | 'payable'
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const validation = validateContactInput({
      name,
      phone,
      email,
      opening_balance: openingBalance
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateContact(contactToEdit.id, {
          name,
          phone,
          email,
          notes
        });
      } else {
        await createContact({
          name,
          phone,
          email,
          notes,
          opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
          opening_balance_direction: openingDirection,
          due_date: dueDate || null
        });
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving contact:', err);
      setSubmitError(err.message || 'Failed to save contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ledger-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ledger-modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="ledger-modal-header">
          <div className="ledger-modal-title-wrap">
            <div className="ledger-modal-icon">
              <User size={20} />
            </div>
            <div>
              <h2 className="ledger-modal-title">
                {isEditing ? 'Edit Person Details' : 'Add New Person (નવી વ્યક્તિ ઉમેરો)'}
              </h2>
              <p className="ledger-modal-subtitle">
                {isEditing
                  ? 'Update contact details for your personal ledger'
                  : 'Create a personal ledger account to track money lent and borrowed'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ledger-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {submitError && (
          <div className="ledger-alert ledger-alert-error" role="alert">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ledger-modal-form">
          {/* Full Name */}
          <div className="ledger-form-field">
            <label className="ledger-form-label" htmlFor="person-name">
              Full Name <span className="required-star">*</span>
            </label>
            <div className="ledger-input-wrap">
              <User size={16} className="ledger-field-icon" />
              <input
                id="person-name"
                type="text"
                className={`ledger-text-input ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g. Rahul Patel, Amit Shah"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: null });
                }}
                maxLength={150}
                required
                autoFocus
              />
            </div>
            {errors.name && <span className="ledger-field-error">{errors.name}</span>}
          </div>

          {/* Phone Number */}
          <div className="ledger-form-field">
            <label className="ledger-form-label" htmlFor="person-phone">
              Phone Number (Optional)
            </label>
            <div className="ledger-input-wrap">
              <Phone size={16} className="ledger-field-icon" />
              <input
                id="person-phone"
                type="tel"
                className={`ledger-text-input ${errors.phone ? 'input-error' : ''}`}
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors({ ...errors, phone: null });
                }}
                maxLength={30}
              />
            </div>
            {errors.phone && <span className="ledger-field-error">{errors.phone}</span>}
          </div>

          {/* Email */}
          <div className="ledger-form-field">
            <label className="ledger-form-label" htmlFor="person-email">
              Email Address (Optional)
            </label>
            <div className="ledger-input-wrap">
              <Mail size={16} className="ledger-field-icon" />
              <input
                id="person-email"
                type="email"
                className={`ledger-text-input ${errors.email ? 'input-error' : ''}`}
                placeholder="e.g. rahul@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                maxLength={255}
              />
            </div>
            {errors.email && <span className="ledger-field-error">{errors.email}</span>}
          </div>

          {/* Opening Balance (Only for new contacts) */}
          {!isEditing && (
            <div className="ledger-opening-balance-section">
              <label className="ledger-form-label" htmlFor="opening-balance">
                Opening Balance (પ્રારંભિક બાકી રકમ — Optional)
              </label>
              <div className="ledger-input-wrap">
                <IndianRupee size={16} className="ledger-field-icon" />
                <input
                  id="opening-balance"
                  type="number"
                  step="0.01"
                  min="0"
                  className={`ledger-text-input ${errors.opening_balance ? 'input-error' : ''}`}
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => {
                    setOpeningBalance(e.target.value);
                    if (errors.opening_balance) setErrors({ ...errors, opening_balance: null });
                  }}
                />
              </div>

              {Number(openingBalance) > 0 && (
                <div className="ledger-direction-toggle-wrap">
                  <span className="ledger-direction-label">Balance Direction:</span>
                  <div className="ledger-direction-radios">
                    <label className={`ledger-radio-badge ${openingDirection === 'receivable' ? 'active-rec' : ''}`}>
                      <input
                        type="radio"
                        name="openingDirection"
                        value="receivable"
                        checked={openingDirection === 'receivable'}
                        onChange={() => setOpeningDirection('receivable')}
                      />
                      <span>They owe me (મારે લેવાના)</span>
                    </label>
                    <label className={`ledger-radio-badge ${openingDirection === 'payable' ? 'active-pay' : ''}`}>
                      <input
                        type="radio"
                        name="openingDirection"
                        value="payable"
                        checked={openingDirection === 'payable'}
                        onChange={() => setOpeningDirection('payable')}
                      />
                      <span>I owe them (મારે આપવાના)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Optional Due Date for opening balance */}
              {Number(openingBalance) > 0 && (
                <div className="ledger-form-field" style={{ marginTop: '0.75rem' }}>
                  <label className="ledger-form-label" htmlFor="opening-due-date">
                    Due Date (Optional Repayment Deadline)
                  </label>
                  <div className="ledger-input-wrap">
                    <Calendar size={16} className="ledger-field-icon" />
                    <input
                      id="opening-due-date"
                      type="date"
                      className="ledger-text-input"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="ledger-form-field">
            <label className="ledger-form-label" htmlFor="person-notes">
              Notes / Remarks (Optional)
            </label>
            <textarea
              id="person-notes"
              className="ledger-textarea"
              placeholder="e.g. Colleague from work, relative, loan purpose..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="ledger-modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary ledger-btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? 'Update Contact' : 'Save Person (સેવ કરો)'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
