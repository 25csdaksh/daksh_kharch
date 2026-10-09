import React, { useState } from 'react';
import { X, AlertCircle, PlusCircle, CheckCircle } from 'lucide-react';
import './AddExpenseModal.css';

export default function AddExpenseModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Groceries & Food',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'UPI',
    notes: ''
  });

  const [previewFeedback, setPreviewFeedback] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) return;

    setPreviewFeedback({
      message: `UI Interaction Preview: "${formData.title}" (₹${formData.amount}) submitted in demo mode.`,
      subtext: 'No data was saved to any backend database. Phase 1 provides static and UI structure only.'
    });

    // Reset feedback after 4 seconds
    setTimeout(() => {
      setPreviewFeedback(null);
      onClose();
    }, 2800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="modal-title" className="modal-title">Add New Expense</h2>
            <p className="modal-subtitle">Record an expense transaction</p>
          </div>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-demo-banner">
          <AlertCircle size={16} />
          <span>
            <strong>UI Preview Mode:</strong> This form demonstrates the modal interaction. Expenses will not be saved.
          </span>
        </div>

        {previewFeedback && (
          <div className="preview-feedback-banner">
            <CheckCircle size={18} className="feedback-icon" />
            <div>
              <p className="feedback-main">{previewFeedback.message}</p>
              <p className="feedback-sub">{previewFeedback.subtext}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-group">
            <label htmlFor="expense-title">Expense Description / Merchant</label>
            <input
              id="expense-title"
              name="title"
              type="text"
              required
              placeholder="e.g. Groceries at Supermarket"
              value={formData.title}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expense-amount">Amount (₹)</label>
              <input
                id="expense-amount"
                name="amount"
                type="number"
                min="1"
                step="any"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="expense-category">Category</label>
              <select
                id="expense-category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-input"
              >
                <option value="Groceries & Food">Groceries & Food</option>
                <option value="Housing & Utilities">Housing & Utilities</option>
                <option value="Transportation">Transportation</option>
                <option value="Entertainment & Leisure">Entertainment & Leisure</option>
                <option value="Healthcare & Fitness">Healthcare & Fitness</option>
                <option value="Other Discretionary">Other Discretionary</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expense-date">Date</label>
              <input
                id="expense-date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="expense-payment">Payment Method</label>
              <select
                id="expense-payment"
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="form-input"
              >
                <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="expense-notes">Notes (Optional)</label>
            <textarea
              id="expense-notes"
              name="notes"
              rows={2}
              placeholder="Add additional details..."
              value={formData.notes}
              onChange={handleChange}
              className="form-input form-textarea"
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={Boolean(previewFeedback)}
            >
              <PlusCircle size={16} />
              {previewFeedback ? 'Previewing...' : 'Preview Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
