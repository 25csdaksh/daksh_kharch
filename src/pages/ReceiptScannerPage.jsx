import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Upload,
  RotateCw,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Receipt,
  ArrowRight,
  RefreshCw,
  Wallet,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAccounts } from '../services/accountService';
import { createExpense } from '../services/expenseService';
import { recognizeReceiptText, preprocessImage, SUPPORTED_OCR_LANGUAGES } from '../services/ocrService';
import { parseReceiptText } from '../utils/receiptParser';
import { validateReceiptFile, uploadReceiptImage } from '../services/receiptStorageService';
import {
  ALLOWED_CATEGORIES,
  ALLOWED_PAYMENT_METHODS,
  formatCurrencyINR,
  getTodayLocalDateString
} from '../utils/dateUtils';
import './ReceiptScannerPage.css';

export default function ReceiptScannerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // References
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Input & Preview State
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [retainCloudPhoto, setRetainCloudPhoto] = useState(false);

  // Accounts
  const [accounts, setAccounts] = useState([]);

  // OCR Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Structured Draft Form State
  const [extractedData, setExtractedData] = useState(null);
  const [formData, setFormData] = useState({
    merchant: '',
    amount: '',
    expense_date: getTodayLocalDateString(),
    category: 'Food',
    payment_method: 'UPI',
    account_id: '',
    description: ''
  });

  // UI Accordions & Flags
  const [showRawText, setShowRawText] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedExpense, setSavedExpense] = useState(null);

  // Load active accounts on mount
  useEffect(() => {
    getAccounts({ includeArchived: false })
      .then((data) => {
        setAccounts(data || []);
        if (data && data.length > 0 && !formData.account_id) {
          setFormData((prev) => ({ ...prev, account_id: data[0].id }));
        }
      })
      .catch((err) => console.warn('Could not load accounts in ReceiptScannerPage:', err));
  }, []);

  // Cleanup object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle incoming file
  const handleFileSelect = async (file) => {
    if (!file) return;

    setErrorMessage('');
    setSavedExpense(null);
    setExtractedData(null);

    const validation = await validateReceiptFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.error);
      return;
    }

    setSelectedFile(file);
    setRotationAngle(0);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Automatically trigger OCR extraction
    runOCR(objectUrl, file, 0, selectedLanguage);
  };

  // Run OCR pipeline
  const runOCR = async (imgUrl, file, rotation = 0, lang = 'eng') => {
    setIsProcessing(true);
    setErrorMessage('');
    setProgressStatus('Preparing receipt image...');
    setProgressPercent(10);

    try {
      // 1. Preprocess rotation & contrast
      let sourceToScan = imgUrl;
      let preprocessedBlob = null;

      if (rotation !== 0) {
        const prep = await preprocessImage(imgUrl, { rotation, enhanceContrast: true });
        sourceToScan = prep.processedUrl;
        preprocessedBlob = prep.blob;
      }

      // 2. Perform client-side recognition
      const ocrResult = await recognizeReceiptText(sourceToScan, {
        language: lang,
        onProgress: ({ status, progress }) => {
          setProgressStatus(status);
          setProgressPercent(Math.round(progress * 100));
        }
      });

      if (!ocrResult.success) {
        setErrorMessage(ocrResult.error || 'Failed to extract readable text.');
        setIsProcessing(false);
        return;
      }

      // 3. Smart Parse raw OCR text into structured fields
      const parsed = parseReceiptText(ocrResult.text);
      setExtractedData(parsed);

      // 4. Hydrate editable draft form
      setFormData((prev) => ({
        ...prev,
        merchant: parsed.merchant || prev.merchant || 'Store Purchase',
        amount: parsed.amount || prev.amount || '',
        expense_date: parsed.date || prev.expense_date || getTodayLocalDateString(),
        category: parsed.category && ALLOWED_CATEGORIES.includes(parsed.category) ? parsed.category : prev.category,
        payment_method: parsed.paymentMethod && ALLOWED_PAYMENT_METHODS.includes(parsed.paymentMethod) ? parsed.paymentMethod : prev.payment_method,
        description: parsed.merchant
          ? `${parsed.merchant}${parsed.invoiceNumber ? ` (Inv: ${parsed.invoiceNumber})` : ''}`
          : prev.description
      }));
    } catch (err) {
      console.error('Receipt recognition error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during OCR recognition.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Rotate image clockwise by 90 degrees
  const handleRotate = () => {
    const nextAngle = (rotationAngle + 90) % 360;
    setRotationAngle(nextAngle);
    if (previewUrl && selectedFile) {
      runOCR(previewUrl, selectedFile, nextAngle, selectedLanguage);
    }
  };

  // Clear current receipt
  const handleClear = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setRotationAngle(0);
    setErrorMessage('');
    setSavedExpense(null);
  };

  // Copy raw OCR text to clipboard
  const handleCopyRaw = async () => {
    if (!extractedData?.rawText) return;
    try {
      await navigator.clipboard.writeText(extractedData.rawText);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  // Form field change handler
  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Save Transaction as Expense
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage('');

    // Pre-validation
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid expense amount greater than zero.');
      return;
    }

    if (!formData.category) {
      setErrorMessage('Please select a valid expense category.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        amount: numAmount,
        category: formData.category,
        description: formData.description.trim() || formData.merchant.trim() || 'Scanned Receipt',
        expense_date: formData.expense_date,
        payment_method: formData.payment_method,
        account_id: formData.account_id || null
      };

      const created = await createExpense(payload);

      // Optional receipt cloud storage upload if requested and user is authenticated
      if (retainCloudPhoto && selectedFile && user?.id && created?.id) {
        try {
          await uploadReceiptImage(selectedFile, created.id, user.id);
        } catch (uploadErr) {
          console.warn('Optional receipt image storage failed:', uploadErr);
        }
      }

      setSavedExpense(created);
    } catch (err) {
      console.error('Failed to save receipt expense:', err);
      setErrorMessage(err.message || 'Failed to save transaction. Please check your network and account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="scanner-container">
      {/* Header Banner */}
      <div className="scanner-header-card card">
        <div className="scanner-header-info">
          <div className="scanner-header-icon" aria-hidden="true">
            <Receipt size={26} />
          </div>
          <div>
            <h1 className="scanner-title">AI Receipt Scanner & OCR</h1>
            <p className="scanner-subtitle">
              Instantly extract merchant, totals, GST, and dates from paper and digital bills
            </p>
          </div>
        </div>

        {/* OCR Language Selector */}
        <div className="scanner-lang-selector">
          <label htmlFor="ocr-lang-select" className="field-label" style={{ margin: 0 }}>
            Language:
          </label>
          <select
            id="ocr-lang-select"
            className="scanner-lang-select"
            value={selectedLanguage}
            onChange={(e) => {
              const newLang = e.target.value;
              setSelectedLanguage(newLang);
              if (previewUrl && selectedFile && !isProcessing) {
                runOCR(previewUrl, selectedFile, rotationAngle, newLang);
              }
            }}
            disabled={isProcessing}
          >
            {SUPPORTED_OCR_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="scanner-alert scanner-alert-danger" role="alert">
          <AlertCircle size={20} className="flex-shrink-0" style={{ marginTop: '2px' }} />
          <div>
            <strong>Extraction Notice:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Hidden File Inputs for Native Camera & Gallery Picking */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Post-Save Confirmation View */}
      {savedExpense ? (
        <div className="scanner-success-card card" role="status">
          <div className="scanner-success-icon" aria-hidden="true">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="scanner-success-title">Expense Successfully Created!</h2>
          <p style={{ color: 'var(--color-muted)', maxWidth: '420px' }}>
            The transaction has been posted to your ledger, updated your account balance, and linked to monthly reports.
          </p>

          <div className="scanner-success-details">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Amount:</span>
              <strong style={{ fontSize: '1.1rem', color: 'var(--color-heading)' }}>
                {formatCurrencyINR(savedExpense.amount)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Category:</span>
              <strong>{savedExpense.category}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Date:</span>
              <span>{savedExpense.expense_date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Payment Method:</span>
              <span>{savedExpense.payment_method}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" onClick={handleClear}>
              <RefreshCw size={16} />
              <span>Scan Another Receipt</span>
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/expenses')}>
              <Receipt size={16} />
              <span>View in Expenses</span>
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              <span>Go to Dashboard</span>
            </button>
          </div>
        </div>
      ) : (
        /* Main Workspace: Capture/Preview on Left, Structured Review on Right */
        <div className="scanner-layout-grid">
          {/* Left Column: Image Capture & Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!previewUrl ? (
              <div className="scanner-upload-card">
                <div
                  className="scanner-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload or capture receipt"
                >
                  <div className="scanner-drop-icon">
                    <Upload size={28} />
                  </div>
                  <div>
                    <p className="scanner-drop-text">Upload or Drop Receipt Image</p>
                    <p className="scanner-drop-subtext">Supports JPEG, PNG, WebP up to 10MB</p>
                  </div>
                </div>

                <div className="scanner-buttons-row">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera size={18} />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={18} />
                    <span>Choose File</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="scanner-preview-card">
                <div className="scanner-preview-header">
                  <span className="scanner-preview-title">Receipt Photo Preview</span>
                  <div className="scanner-preview-toolbar">
                    <button
                      type="button"
                      className="scanner-tool-btn"
                      onClick={handleRotate}
                      title="Rotate 90° Clockwise"
                      disabled={isProcessing}
                    >
                      <RotateCw size={14} />
                      <span>Rotate</span>
                    </button>
                    <button
                      type="button"
                      className="scanner-tool-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Replace Image"
                      disabled={isProcessing}
                    >
                      <RefreshCw size={14} />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      className="scanner-tool-btn scanner-tool-btn-danger"
                      onClick={handleClear}
                      title="Remove Image"
                      disabled={isProcessing}
                    >
                      <Trash2 size={14} />
                      <span>Discard</span>
                    </button>
                  </div>
                </div>

                <div className="scanner-image-wrapper">
                  <img
                    src={previewUrl}
                    alt="Receipt for OCR processing"
                    className="scanner-img"
                    style={{ transform: `rotate(${rotationAngle}deg)` }}
                  />
                </div>
              </div>
            )}

            {/* OCR Live Progress State */}
            {isProcessing && (
              <div className="ocr-progress-box" role="status" aria-live="polite">
                <div className="ocr-progress-header">
                  <span>{progressStatus || 'Processing...'}</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="ocr-progress-bar-track">
                  <div
                    className="ocr-progress-bar-fill"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Expandable Raw OCR Inspector */}
            {extractedData?.rawText && (
              <div className="raw-ocr-accordion">
                <div
                  className="raw-ocr-header"
                  onClick={() => setShowRawText(!showRawText)}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={16} />
                    <span>Raw OCR Extracted Text</span>
                  </div>
                  {showRawText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {showRawText && (
                  <div className="raw-ocr-content">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
                      <button
                        type="button"
                        className="scanner-tool-btn"
                        onClick={handleCopyRaw}
                        title="Copy raw text to clipboard"
                      >
                        <Copy size={13} />
                        <span>{copiedRaw ? 'Copied!' : 'Copy Text'}</span>
                      </button>
                    </div>
                    <pre className="raw-ocr-pre">{extractedData.rawText}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Structured Review & Save Form */}
          <form onSubmit={handleSaveExpense} className="scanner-review-card">
            <div className="review-section-header">
              <h2 className="review-title">Review Extracted Transaction</h2>
              {extractedData && (
                <span
                  className={`confidence-tag ${
                    extractedData.confidence.amount === 'high' ? 'confidence-high' : 'confidence-low'
                  }`}
                >
                  <Sparkles size={13} />
                  {extractedData.confidence.amount === 'high' ? 'High Confidence' : 'Review Suggested'}
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--color-muted)' }}>
              Verify and adjust the details before saving. HisabSetu never records a transaction without your explicit confirmation.
            </p>

            {/* Merchant / Description */}
            <div className="form-field-scanner">
              <div className="form-label-row">
                <label className="field-label" htmlFor="scanner-merchant">
                  Merchant / Store Name
                </label>
                {extractedData && (
                  <span
                    className={`field-confidence-pill ${
                      extractedData.confidence.merchant === 'high' ? 'confidence-high' : 'confidence-low'
                    }`}
                  >
                    {extractedData.confidence.merchant === 'high' ? 'Auto-detected' : 'Manual'}
                  </span>
                )}
              </div>
              <input
                id="scanner-merchant"
                type="text"
                className="form-text-input"
                placeholder="e.g. D-Mart, Shell Petrol, Star Cafe"
                value={formData.merchant}
                onChange={(e) => handleFieldChange('merchant', e.target.value)}
                required
              />
            </div>

            {/* Amount Field & Candidates */}
            <div className="form-field-scanner">
              <div className="form-label-row">
                <label className="field-label" htmlFor="scanner-amount">
                  Total Payable Amount (₹)
                </label>
                {extractedData && (
                  <span
                    className={`field-confidence-pill ${
                      extractedData.confidence.amount === 'high' ? 'confidence-high' : 'confidence-low'
                    }`}
                  >
                    {extractedData.confidence.amount === 'high' ? 'Auto-detected' : 'Verify Amount'}
                  </span>
                )}
              </div>
              <input
                id="scanner-amount"
                type="number"
                step="0.01"
                min="0.01"
                max="9999999999.99"
                className="form-text-input"
                placeholder="e.g. 450.00"
                value={formData.amount}
                onChange={(e) => handleFieldChange('amount', e.target.value)}
                required
                style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-heading)' }}
              />

              {/* Multiple Candidate Totals Chips */}
              {extractedData?.candidateTotals && extractedData.candidateTotals.length > 1 && (
                <div className="candidate-chips-row">
                  <span className="candidate-chip-label">Did you mean:</span>
                  {extractedData.candidateTotals.map((cand) => (
                    <button
                      key={cand}
                      type="button"
                      className={`candidate-chip ${String(cand) === String(formData.amount) ? 'active' : ''}`}
                      onClick={() => handleFieldChange('amount', String(cand))}
                    >
                      {formatCurrencyINR(cand)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Category Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-field-scanner">
                <label className="field-label" htmlFor="scanner-date">
                  Transaction Date
                </label>
                <input
                  id="scanner-date"
                  type="date"
                  className="form-text-input"
                  value={formData.expense_date}
                  onChange={(e) => handleFieldChange('expense_date', e.target.value)}
                  required
                />
              </div>

              <div className="form-field-scanner">
                <label className="field-label" htmlFor="scanner-category">
                  Expense Category
                </label>
                <select
                  id="scanner-category"
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  required
                >
                  {ALLOWED_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payment Method & Wallet / Account Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-field-scanner">
                <label className="field-label" htmlFor="scanner-payment">
                  Payment Method
                </label>
                <select
                  id="scanner-payment"
                  className="form-select"
                  value={formData.payment_method}
                  onChange={(e) => handleFieldChange('payment_method', e.target.value)}
                  required
                >
                  {ALLOWED_PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field-scanner">
                <label className="field-label" htmlFor="scanner-account">
                  Deduct from Account
                </label>
                <select
                  id="scanner-account"
                  className="form-select"
                  value={formData.account_id}
                  onChange={(e) => handleFieldChange('account_id', e.target.value)}
                >
                  <option value="">None / Unlinked</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrencyINR(acc.current_balance ?? acc.opening_balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description / Notes */}
            <div className="form-field-scanner">
              <label className="field-label" htmlFor="scanner-desc">
                Notes & Description
              </label>
              <input
                id="scanner-desc"
                type="text"
                maxLength="500"
                className="form-text-input"
                placeholder="Optional notes or item highlights"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
              />
            </div>

            {/* Detected Line Items (Optional) */}
            {extractedData?.lineItems && extractedData.lineItems.length > 0 && (
              <div className="line-items-box">
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-heading)' }}>
                  Detected Line Items ({extractedData.lineItems.length}):
                </span>
                {extractedData.lineItems.map((item, idx) => (
                  <div key={idx} className="line-item-row">
                    <span>
                      {item.name} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                    </span>
                    <strong>{formatCurrencyINR(item.price)}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Cloud Storage Opt-In */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <input
                type="checkbox"
                id="scanner-cloud-retain"
                checked={retainCloudPhoto}
                onChange={(e) => setRetainCloudPhoto(e.target.checked)}
              />
              <label
                htmlFor="scanner-cloud-retain"
                style={{ fontSize: '0.825rem', color: 'var(--color-text)', cursor: 'pointer' }}
              >
                Save encrypted receipt photo to private storage (optional)
              </label>
            </div>

            {/* Action Footer */}
            <div className="scanner-action-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleClear}
                disabled={isSubmitting || isProcessing}
              >
                <span>Discard Draft</span>
              </button>

              <button
                type="submit"
                className="btn btn-primary scanner-btn-save"
                disabled={isSubmitting || isProcessing || !formData.amount}
              >
                {isSubmitting ? (
                  <span>Posting Transaction...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Save as Expense</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
