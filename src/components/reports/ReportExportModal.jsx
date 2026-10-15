import React, { useState } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Calendar,
  Layers,
  Landmark,
  CheckCircle2
} from 'lucide-react';
import {
  REPORT_TYPES,
  exportReport
} from '../../services/reportExportService.js';
import { ALLOWED_CATEGORIES, getTodayLocalDateString } from '../../utils/dateUtils.js';
import { useAuth } from '../../context/AuthContext.jsx';
import './ReportExportModal.css';

export default function ReportExportModal({
  isOpen,
  onClose,
  accounts = [],
  initialReportType = 'monthly_expense',
  defaultStartDate = null,
  defaultEndDate = null
}) {
  const { user } = useAuth();
  const todayStr = getTodayLocalDateString();

  const [reportType, setReportType] = useState(initialReportType);
  const [format, setFormat] = useState('pdf'); // 'pdf' | 'csv'
  const [startDate, setStartDate] = useState(defaultStartDate || todayStr.slice(0, 8) + '01');
  const [endDate, setEndDate] = useState(defaultEndDate || todayStr);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleExport = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage('');

    if (startDate && endDate && startDate > endDate) {
      setError('Start date cannot be later than end date.');
      return;
    }

    try {
      setIsExporting(true);
      const userName = user?.user_metadata?.full_name || user?.email || 'Authenticated User';

      await exportReport({
        reportType,
        startDate,
        endDate,
        accountId: selectedAccountId || null,
        category: selectedCategory || null,
        format,
        userName
      });

      setSuccessMessage(`Successfully generated ${format.toUpperCase()} report.`);
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to generate financial report.');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedReport = REPORT_TYPES.find((r) => r.id === reportType) || REPORT_TYPES[0];

  return (
    <div className="report-export-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
      <div className="report-export-modal-container">
        <div className="report-export-header">
          <h2 id="export-modal-title" className="report-export-title">
            <Download size={20} className="text-emerald" />
            <span>Generate Financial Export</span>
          </h2>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close export dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleExport} className="report-export-body">
          {error && (
            <div className="modal-error-banner" role="alert">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="modal-error-banner" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderColor: '#10B981' }} role="status">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Report Type Selector */}
          <div>
            <label htmlFor="report-type-select" className="goal-form-label">
              Select Report Type
            </label>
            <select
              id="report-type-select"
              className="goal-form-select"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              {REPORT_TYPES.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.label} ({rep.category})
                </option>
              ))}
            </select>
          </div>

          {/* Format Selector: PDF vs CSV */}
          <div>
            <label className="goal-form-label">Export Document Format</label>
            <div className="export-format-selector">
              <div
                className={`export-format-card ${format === 'pdf' ? 'selected' : ''}`}
                onClick={() => setFormat('pdf')}
              >
                <div className="export-format-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626' }}>
                  <FileText size={20} />
                </div>
                <div className="export-format-info">
                  <span className="export-format-name">Printable PDF</span>
                  <span className="export-format-desc">Vector A4, HisabSetu branded with tables & KPIs</span>
                </div>
              </div>

              <div
                className={`export-format-card ${format === 'csv' ? 'selected' : ''}`}
                onClick={() => setFormat('csv')}
              >
                <div className="export-format-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div className="export-format-info">
                  <span className="export-format-name">Excel / CSV</span>
                  <span className="export-format-desc">RFC-4180 spreadsheet with UTF-8 BOM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="goal-form-grid">
            <div>
              <label htmlFor="export-start-date" className="goal-form-label">
                From Date
              </label>
              <input
                id="export-start-date"
                type="date"
                className="goal-form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="export-end-date" className="goal-form-label">
                To Date
              </label>
              <input
                id="export-end-date"
                type="date"
                className="goal-form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Conditional Filters: Category filter for expense reports */}
          {(reportType === 'monthly_expense' || reportType === 'category_spending') && (
            <div>
              <label htmlFor="export-category-select" className="goal-form-label">
                Filter by Category (Optional)
              </label>
              <select
                id="export-category-select"
                className="goal-form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Spending Categories</option>
                {ALLOWED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {/* Conditional Filters: Account filter for account/expense/income reports */}
          {(reportType === 'monthly_expense' || reportType === 'income' || reportType === 'account_statement') && (
            <div>
              <label htmlFor="export-account-select" className="goal-form-label">
                Filter by Wallet / Account (Optional)
              </label>
              <select
                id="export-account-select"
                className="goal-form-select"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
              >
                <option value="">All Accounts Combined</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="report-export-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-export-download"
              disabled={isExporting}
            >
              <Download size={15} />
              <span>{isExporting ? 'Generating...' : `Download ${format.toUpperCase()}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
