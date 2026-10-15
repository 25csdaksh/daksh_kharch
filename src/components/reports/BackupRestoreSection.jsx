import React, { useState } from 'react';
import {
  Database,
  Download,
  Upload,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileJson,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  createAndDownloadBackup,
  validateBackupFile,
  previewBackupData,
  executeRestore,
  BACKUP_SCHEMA_VERSION
} from '../../services/backupRestoreService.js';
import './BackupRestoreSection.css';

export default function BackupRestoreSection() {
  const { user } = useAuth();

  // Backup State
  const [isExporting, setIsExporting] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(null);
  const [backupError, setBackupError] = useState(null);

  // Restore State
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedBackup, setParsedBackup] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  const [restoreResults, setRestoreResults] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleCreateBackup = async () => {
    if (!user) {
      setBackupError('Please sign in to export your financial data.');
      return;
    }

    try {
      setIsExporting(true);
      setBackupError(null);
      setBackupSuccess(null);

      const res = await createAndDownloadBackup(user);
      setBackupSuccess(`Backup created successfully: ${res.totalRecords} records exported in ${res.filename}`);
    } catch (err) {
      console.error('Backup creation error:', err);
      setBackupError(err.message || 'Failed to generate backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setRestoreError(null);
    setRestoreResults(null);
    setConfirmRestore(false);
    setParsedBackup(null);
    setPreviewData(null);

    try {
      setIsValidating(true);
      const text = await file.text();
      const validation = validateBackupFile(text);

      if (!validation.isValid) {
        setRestoreError(validation.error);
        return;
      }

      setParsedBackup(validation.backup);

      // Generate preview against database
      if (user?.id) {
        const preview = await previewBackupData(validation.backup, user.id);
        setPreviewData(preview);
      }
    } catch (err) {
      console.error('File validation error:', err);
      setRestoreError(err.message || 'Failed to read backup file.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!parsedBackup || !user?.id) return;
    if (!confirmRestore) {
      setRestoreError('Please confirm the restoration by checking the confirmation box.');
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreError(null);

      const results = await executeRestore(parsedBackup, user.id, { skipDuplicates: true });
      setRestoreResults(results);
      setParsedBackup(null);
      setPreviewData(null);
      setSelectedFile(null);
      setConfirmRestore(false);
    } catch (err) {
      console.error('Restore error:', err);
      setRestoreError(err.message || 'Failed to restore financial data.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="backup-restore-container">
      <div className="backup-grid">
        {/* Export Card */}
        <section className="backup-card" aria-label="Export Data Backup">
          <div className="backup-card-header">
            <div className="backup-card-icon icon-export">
              <Download size={24} />
            </div>
            <div>
              <h3 className="backup-card-title">Full Financial Data Backup</h3>
              <p className="backup-card-desc">
                Export an encrypted, complete JSON archive of all your accounts, expenses, budgets, and goals.
              </p>
            </div>
          </div>

          <div className="backup-table-checklist">
            <div className="backup-check-item">
              <CheckCircle2 size={13} className="text-emerald" />
              <span>Accounts & Wallets</span>
            </div>
            <div className="backup-check-item">
              <CheckCircle2 size={13} className="text-emerald" />
              <span>Expense & Income Ledger</span>
            </div>
            <div className="backup-check-item">
              <CheckCircle2 size={13} className="text-emerald" />
              <span>Inter-Account Transfers</span>
            </div>
            <div className="backup-check-item">
              <CheckCircle2 size={13} className="text-emerald" />
              <span>Smart Monthly Budgets</span>
            </div>
            <div className="backup-check-item">
              <CheckCircle2 size={13} className="text-emerald" />
              <span>Recurring Bills & History</span>
            </div>
            <div className="backup-check-item">
              <CheckCircle2 size={13} className="text-emerald" />
              <span>Savings Goals & Velocity</span>
            </div>
            <div className="backup-check-item">
              <CheckCircle2 size={13} className="text-emerald" />
              <span>Split Bills & Friends</span>
            </div>
            <div className="backup-check-item">
              <CheckCircle2 size={13} className="text-emerald" />
              <span>Debt Settlements</span>
            </div>
          </div>

          {backupSuccess && (
            <div className="restore-results-box" role="status">
              <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              <span>{backupSuccess}</span>
            </div>
          )}

          {backupError && (
            <div className="modal-error-banner" role="alert">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{backupError}</span>
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCreateBackup}
            disabled={isExporting}
            style={{ alignSelf: 'flex-start', marginTop: 'auto' }}
          >
            <Download size={16} />
            <span>{isExporting ? 'Packaging Backup...' : 'Generate & Download Backup (.JSON)'}</span>
          </button>
        </section>

        {/* Restore Card */}
        <section className="backup-card" aria-label="Restore Data Backup">
          <div className="backup-card-header">
            <div className="backup-card-icon icon-import">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="backup-card-title">Safe Data Restoration</h3>
              <p className="backup-card-desc">
                Import and restore a previously saved HisabSetu backup file with strict validation and conflict prevention.
              </p>
            </div>
          </div>

          <label htmlFor="restore-file-input" className="restore-file-dropzone">
            <FileJson size={32} className="text-secondary" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              {selectedFile ? selectedFile.name : 'Select or drop HisabSetu JSON backup file'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #64748B)' }}>
              Supports schema version {BACKUP_SCHEMA_VERSION}
            </span>
            <input
              id="restore-file-input"
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={isRestoring || isValidating}
            />
          </label>

          {isValidating && (
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary, #64748B)' }}>
              <RefreshCw size={14} className="spinner-icon" style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              <span>Validating backup integrity and checking duplicates...</span>
            </div>
          )}

          {restoreError && (
            <div className="modal-error-banner" role="alert">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{restoreError}</span>
            </div>
          )}

          {/* Backup Preview Section */}
          {previewData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="restore-warning-box">
                <AlertTriangle size={16} className="flex-shrink-0" />
                <div>
                  <strong>Safety First:</strong> This backup contains {previewData.totalIncomingRecords} total records.
                  Existing records will be safely preserved to prevent duplicate transactions. All imported records will be associated with your account ({user?.email}).
                </div>
              </div>

              <table className="restore-preview-table">
                <thead>
                  <tr>
                    <th>Data Category</th>
                    <th>Records in Backup</th>
                    <th>New to Insert</th>
                    <th>Existing / Skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(previewData.tableCounts).map(([tbl, count]) => {
                    const dupes = previewData.duplicateCounts[tbl] || 0;
                    const newCount = previewData.newCounts[tbl] || 0;
                    return (
                      <tr key={tbl}>
                        <td style={{ textTransform: 'capitalize' }}>{tbl.replace(/_/g, ' ')}</td>
                        <td>{count}</td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>+{newCount}</td>
                        <td style={{ color: '#64748B' }}>{dupes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  checked={confirmRestore}
                  onChange={(e) => setConfirmRestore(e.target.checked)}
                />
                <span>I confirm that I want to merge these financial records into my active ledger.</span>
              </label>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteRestore}
                disabled={isRestoring || !confirmRestore}
                style={{ alignSelf: 'flex-start' }}
              >
                <Upload size={16} />
                <span>{isRestoring ? 'Restoring Ledger...' : 'Proceed with Safe Restore'}</span>
              </button>
            </div>
          )}

          {/* Restore Success Results */}
          {restoreResults && (
            <div className="restore-results-box" role="status">
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>Restoration Complete!</div>
              <div>
                Successfully inserted {restoreResults.totalInserted} record(s). Skipped {restoreResults.totalSkipped} duplicate record(s).
              </div>
              {restoreResults.errors.length > 0 && (
                <div style={{ color: '#DC2626', marginTop: '4px', fontSize: '12px' }}>
                  Warnings encountered on {restoreResults.errors.length} table(s).
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
