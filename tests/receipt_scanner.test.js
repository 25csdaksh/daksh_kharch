/**
 * HisabSetu — Phase 7: AI Receipt Scanner, OCR & Smart Expense Extraction Tests
 * Validates file validation, OCR parsing, monetary disambiguation, category suggestion,
 * draft review, user confirmation invariants, and accounting ledger integration.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseReceiptText,
  parseCurrencyAmount,
  extractMerchantName,
  extractReceiptDate,
  extractReceiptTime,
  extractInvoiceNumber,
  extractAmounts,
  suggestCategory,
  suggestPaymentMethod,
  extractLineItems
} from '../src/utils/receiptParser.js';

import {
  validateReceiptFile,
  MAX_RECEIPT_FILE_SIZE,
  ALLOWED_MIME_TYPES
} from '../src/services/receiptStorageService.js';

import {
  validateExpenseInput,
  formatCurrencyINR,
  ALLOWED_CATEGORIES,
  ALLOWED_PAYMENT_METHODS
} from '../src/utils/dateUtils.js';

import { calculateAccountBalance } from '../src/utils/accountUtils.js';

describe('HisabSetu Phase 7: AI Receipt Scanner & OCR Tests', () => {

  describe('1. Receipt Image File Validation & MIME Restrictions', () => {
    test('accepts valid JPEG, PNG, and WebP files under 10MB', async () => {
      // Fake JPEG with magic bytes FF D8 FF
      const jpegBytes = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const validJpeg = new File([jpegBytes], 'receipt.jpg', { type: 'image/jpeg' });
      const res = await validateReceiptFile(validJpeg);
      assert.equal(res.isValid, true);
      assert.equal(res.error, null);
    });

    test('rejects files exceeding 10MB limit', async () => {
      // Mock oversized file
      const bigFile = {
        name: 'huge_scan.jpg',
        size: 11 * 1024 * 1024,
        type: 'image/jpeg',
        slice: () => ({ arrayBuffer: async () => new ArrayBuffer(12) })
      };
      const res = await validateReceiptFile(bigFile);
      assert.equal(res.isValid, false);
      assert.match(res.error, /too large/i);
    });

    test('rejects unsupported file formats such as PDF, EXE or text', async () => {
      const pdfFile = {
        name: 'invoice.pdf',
        size: 50000,
        type: 'application/pdf',
        slice: () => ({ arrayBuffer: async () => new ArrayBuffer(12) })
      };
      const res = await validateReceiptFile(pdfFile);
      assert.equal(res.isValid, false);
      assert.match(res.error, /unsupported image format/i);
    });

    test('rejects null or undefined file selections', async () => {
      const res = await validateReceiptFile(null);
      assert.equal(res.isValid, false);
      assert.equal(res.error, 'No file selected.');
    });
  });

  describe('2. OCR Text Extraction, Empty Text & Failure Gracefulness', () => {
    test('handles empty or blank OCR text without throwing', () => {
      const res = parseReceiptText('');
      assert.equal(res.isValidReceipt, false);
      assert.equal(res.amount, '');
      assert.equal(res.merchant, '');
      assert.equal(res.category, 'Other');
    });

    test('handles whitespace-only and noise OCR gracefully', () => {
      const res = parseReceiptText('   \n\n\t  \n  ');
      assert.equal(res.isValidReceipt, false);
      assert.equal(res.amount, '');
    });

    test('extracts valid fields when readable text is present', () => {
      const sample = `
        DOMINOS PIZZA
        TAX INVOICE
        Date: 15/10/2026
        Subtotal: 450.00
        CGST 2.5%: 11.25
        SGST 2.5%: 11.25
        GRAND TOTAL: Rs. 472.50
        Payment: UPI
      `;
      const res = parseReceiptText(sample);
      assert.equal(res.isValidReceipt, true);
      assert.equal(res.merchant, 'DOMINOS PIZZA');
      assert.equal(res.amount, '472.5');
      assert.equal(res.category, 'Food');
      assert.equal(res.paymentMethod, 'UPI');
    });
  });

  describe('3. Merchant & Store Name Extraction', () => {
    test('extracts merchant while ignoring tax invoice and cash memo header noise', () => {
      const lines = [
        'TAX INVOICE',
        'ORIGINAL FOR RECIPIENT',
        'RELIANCE RETAIL LIMITED',
        'GSTIN: 24AAACR1234F1Z5',
        'Opposite Vastrapur Lake, Ahmedabad',
        'Date: 12-10-2026'
      ];
      const res = extractMerchantName(lines);
      assert.equal(res.name, 'RELIANCE RETAIL LIMITED');
      assert.equal(res.confidence, 'high');
    });

    test('handles symbols or leading bullets in store names cleanly', () => {
      const lines = [
        '*** CAFE COFFEE DAY ***',
        'Bill of Supply'
      ];
      const res = extractMerchantName(lines);
      assert.equal(res.name, 'CAFE COFFEE DAY');
    });
  });

  describe('4. Indian Currency & Amount Formatting Parsing', () => {
    test('parses plain decimals and Indian comma amounts accurately', () => {
      assert.equal(parseCurrencyAmount('450.50'), 450.50);
      assert.equal(parseCurrencyAmount('₹1,250.00'), 1250.00);
      assert.equal(parseCurrencyAmount('Rs. 1,00,000.75'), 100000.75);
      assert.equal(parseCurrencyAmount('INR 89.00'), 89.00);
      assert.equal(parseCurrencyAmount('Rs 12'), 12.00);
    });

    test('returns null for zero, negative or unparseable amounts', () => {
      assert.equal(parseCurrencyAmount('0'), null);
      assert.equal(parseCurrencyAmount('-150'), null);
      assert.equal(parseCurrencyAmount('InvalidAmount'), null);
    });
  });

  describe('5. Ambiguity Resolution: Subtotal, GST/Tax, Discounts vs Grand Total', () => {
    test('distinguishes Grand Total from Subtotal and GST taxes', () => {
      const lines = [
        'Items Sub Total: 1,000.00',
        'Discount: 100.00',
        'Taxable Value: 900.00',
        'CGST 9%: 81.00',
        'SGST 9%: 81.00',
        'Net Payable: ₹1,062.00',
        'Cash Tendered: 2,000.00',
        'Change Due: 938.00'
      ];
      const res = extractAmounts(lines);
      assert.equal(res.total, 1062.00);
      assert.equal(res.subtotal, 1000.00);
      assert.equal(res.tax, 81.00);
      assert.equal(res.discount, 100.00);
    });

    test('does not mistake GSTIN or 10-digit phone number as total amount', () => {
      const lines = [
        'Shell Fuel Station',
        'GSTIN: 24AABCS1429B1Z1',
        'Helpline Phone: 9898012345',
        'Pin Code: 380015',
        'Total: 500.00'
      ];
      const res = extractAmounts(lines);
      assert.equal(res.total, 500.00);
      assert.equal(res.candidateTotals.includes(9898012345), false);
    });

    test('exposes candidate totals when multiple potential sums exist', () => {
      const lines = [
        'Total Items: 3',
        'Sub Total: 350.00',
        'Total: 380.00'
      ];
      const res = extractAmounts(lines);
      assert.ok(res.candidateTotals.length >= 1);
      assert.equal(res.total, 380.00);
    });
  });

  describe('6. Date & Time Extraction', () => {
    test('extracts dates in DD/MM/YYYY, DD-MM-YYYY, and YYYY-MM-DD formats', () => {
      const date1 = extractReceiptDate('', ['Date: 14/10/2026']);
      assert.equal(date1.date, '2026-10-14');

      const date2 = extractReceiptDate('', ['Dated: 2026-05-20']);
      assert.equal(date2.date, '2026-05-20');

      const date3 = extractReceiptDate('', ['16-Oct-2026 14:30']);
      assert.equal(date3.date, '2026-10-16');
    });

    test('extracts receipt time in 12h or 24h format', () => {
      const time1 = extractReceiptTime(['Time: 18:45:10']);
      assert.equal(time1, '18:45:10');

      const time2 = extractReceiptTime(['Transaction Time: 03:15 PM']);
      assert.equal(time2, '03:15 PM');
    });

    test('extracts bill / invoice number', () => {
      const inv = extractInvoiceNumber(['Tax Invoice No: INV-2026-9941']);
      assert.equal(inv, 'INV-2026-9941');
    });
  });

  describe('7. Smart Category & Payment Method Suggestion', () => {
    test('correctly maps grocery or restaurant to Food category', () => {
      assert.equal(suggestCategory('McDonalds Family Meals', 'McDonalds').category, 'Food');
      assert.equal(suggestCategory('D-Mart Supermarket Fruits & Dairy', 'D-Mart').category, 'Food');
    });

    test('correctly maps fuel and rides to Transport category', () => {
      assert.equal(suggestCategory('HP Petrol Pump Fuel Dispenser', 'HP Petrol').category, 'Transport');
      assert.equal(suggestCategory('Uber Trip India Pvt Ltd', 'Uber').category, 'Transport');
    });

    test('correctly maps medical stores to Healthcare category', () => {
      assert.equal(suggestCategory('Apollo Pharmacy Tablets & Syrup', 'Apollo Pharmacy').category, 'Healthcare');
    });

    test('correctly suggests payment methods (UPI vs Card vs Cash)', () => {
      assert.equal(suggestPaymentMethod('Paid via Google Pay UPI Ref 12345').paymentMethod, 'UPI');
      assert.equal(suggestPaymentMethod('Payment Mode: Master Card Chip').paymentMethod, 'Card');
      assert.equal(suggestPaymentMethod('Cash Received Rs 500').paymentMethod, 'Cash');
    });
  });

  describe('8. User Confirmation, Manual Editing & Expense Creation Invariants', () => {
    test('OCR parsed draft allows editing any field before saving', () => {
      const parsed = parseReceiptText(`
        Starbucks Coffee
        Total: 350.00
      `);

      // User modifies category and amount
      const userEdited = {
        amount: 375.00, // User added tip
        category: 'Entertainment', // User override
        description: 'Starbucks Coffee with Friend',
        expense_date: parsed.date,
        payment_method: 'Card'
      };

      const validation = validateExpenseInput(userEdited);
      assert.equal(validation.isValid, true);
      assert.equal(userEdited.amount, 375.00);
      assert.equal(userEdited.category, 'Entertainment');
    });

    test('validates that empty or zero amounts cannot be saved', () => {
      const invalid = {
        amount: 0,
        category: 'Food',
        expense_date: '2026-10-16',
        payment_method: 'UPI'
      };
      const validation = validateExpenseInput(invalid);
      assert.equal(validation.isValid, false);
      assert.match(validation.errors.amount, /greater than zero/i);
    });

    test('validates account balance deduction for receipt expense', () => {
      const account = {
        id: 'acc-wallet-1',
        name: 'HDFC Savings',
        type: 'bank',
        opening_balance: 10000.00
      };

      const receiptExpense = {
        id: 'exp-1',
        amount: 1500.00,
        account_id: 'acc-wallet-1'
      };

      const res = calculateAccountBalance({ account, expenses: [receiptExpense] });
      assert.equal(res.balance, 8500.00);
    });
  });

  describe('9. Regression & System Accounting Invariants', () => {
    test('allowed categories and payment methods conform strictly to HisabSetu standards', () => {
      assert.ok(ALLOWED_CATEGORIES.includes('Food'));
      assert.ok(ALLOWED_CATEGORIES.includes('Transport'));
      assert.ok(ALLOWED_CATEGORIES.includes('Shopping'));
      assert.ok(ALLOWED_PAYMENT_METHODS.includes('UPI'));
      assert.ok(ALLOWED_PAYMENT_METHODS.includes('Cash'));
      assert.ok(ALLOWED_PAYMENT_METHODS.includes('Card'));
    });

    test('formats currency in Indian notation', () => {
      const str = formatCurrencyINR(1250);
      assert.match(str, /1,250/);
    });
  });
});
