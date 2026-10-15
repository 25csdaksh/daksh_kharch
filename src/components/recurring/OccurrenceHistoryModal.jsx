import React, { useState, useEffect } from 'react';
import { X, History, CheckCircle2, Clock, RotateCcw, AlertCircle } from 'lucide-react';
import { formatCurrencyINR } from '../../utils/dateUtils';
import { getOccurrences, revertOccurrenceToPending } from '../../services/recurringService';
import './OccurrenceHistoryModal.css';

export default function OccurrenceHistoryModal({
  isOpen,
  onClose,
  schedule,
  onRefresh
}) {
  const [occurrences, setOccurrences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revertingId, setRevertingId] = useState(null);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    if (!schedule?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await getOccurrences({ recurringExpenseId: schedule.id, limit: 50 });
      setOccurrences(data);
    } catch (err) {
      console.error('Error fetching occurrence history:', err);
      setError(err.message || 'Failed to load occurrence history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && schedule) {
      fetchHistory();
    }
  }, [isOpen, schedule]);

  if (!isOpen || !schedule) return null;

  const handleRevert = async (occurrence) => {
    const confirmMsg = `Are you sure you want to revert the payment for ${occurrence.scheduled_due_date}? This will safely delete the corresponding expense from your ledger.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setRevertingId(occurrence.id);
      await revertOccurrenceToPending(occurrence.id);
      await fetchHistory();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Failed to revert occurrence: ${err.message}`);
    } finally {
      setRevertingId(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container occurrence-history-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" aria-hidden="true">
              <History size={20} />
            </div>
            <div>
              <h2 className="modal-title">Payment History</h2>
              <p className="modal-subtitle">
                {schedule.title} • {schedule.frequency.toUpperCase()} ({formatCurrencyINR(schedule.amount, false)})
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="modal-error-alert" role="alert">
              <AlertCircle size={16} className="text-danger flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="history-loading-wrap">
              <span className="loading-pulse-text">Loading occurrence history...</span>
            </div>
          ) : occurrences.length === 0 ? (
            <div className="history-empty-wrap">
              <Clock size={32} className="empty-state-icon" />
              <p className="empty-state-title">No occurrences recorded yet</p>
              <p className="empty-state-subtitle">
                Occurrences will appear as this bill reaches its scheduled due dates.
              </p>
            </div>
          ) : (
            <div className="occurrence-timeline-list">
              {occurrences.map((occ) => {
                const isPaid = occ.status === 'paid';
                return (
                  <div key={occ.id} className={`occurrence-item-card ${isPaid ? 'occ-paid' : 'occ-pending'}`}>
                    <div className="occ-status-icon-box">
                      {isPaid ? (
                        <CheckCircle2 size={18} className="text-success" />
                      ) : (
                        <Clock size={18} className="text-muted" />
                      )}
                    </div>

                    <div className="occ-details">
                      <div className="occ-top-line">
                        <span className="occ-date-title">Due: {occ.scheduled_due_date}</span>
                        <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'}`}>
                          {isPaid ? 'Paid' : 'Pending'}
                        </span>
                      </div>

                      <div className="occ-sub-line">
                        <span>
                          Amount: <strong>{formatCurrencyINR(occ.actual_paid_amount || schedule.amount, false)}</strong>
                        </span>
                        {isPaid && occ.actual_payment_date && (
                          <span className="occ-paid-meta">
                            • Paid on {occ.actual_payment_date}
                          </span>
                        )}
                      </div>

                      {isPaid && occ.linked_expense_id && (
                        <span className="occ-expense-ref">
                          Ledger Ref: #{occ.linked_expense_id.slice(0, 8)}
                        </span>
                      )}
                    </div>

                    {isPaid && (
                      <div className="occ-actions">
                        <button
                          type="button"
                          className="btn-revert-occ"
                          onClick={() => handleRevert(occ)}
                          disabled={revertingId === occ.id}
                          title="Revert payment (deletes linked ledger expense)"
                        >
                          <RotateCcw size={13} />
                          <span>{revertingId === occ.id ? 'Reverting...' : 'Undo'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
