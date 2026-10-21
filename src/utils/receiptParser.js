/**
 * HisabSetu — Smart Receipt Text Parsing Engine
 * Extracts structured financial transaction fields from raw OCR text.
 * Robust against Indian currency formats, GST/tax subtotals, dates, and noise.
 */

import { ALLOWED_CATEGORIES, ALLOWED_PAYMENT_METHODS } from './dateUtils.js';

// Noise words to skip when detecting merchant name
const HEADER_NOISE_WORDS = [
  'tax invoice',
  'retail invoice',
  'tax receipt',
  'cash memo',
  'bill of supply',
  'receipt',
  'invoice',
  'original for recipient',
  'duplicate for supplier',
  'welcome',
  'thank you',
  'thanks visit again',
  'customer copy',
  'merchant copy',
  'date',
  'time',
  'phone',
  'tel',
  'gstin',
  'gst',
  'fssai',
  'cin'
];

// Keywords indicating a total payable amount
const TOTAL_KEYWORDS = [
  'grand total',
  'net payable',
  'net amount',
  'total payable',
  'total amount',
  'total due',
  'balance due',
  'amount paid',
  'total paid',
  'final total',
  'bill total',
  'total'
];

// Keywords indicating subtotal (not final total)
const SUBTOTAL_KEYWORDS = [
  'sub total',
  'subtotal',
  'sub-total',
  'taxable value',
  'taxable amount',
  'item total'
];

// Keywords indicating tax / GST
const TAX_KEYWORDS = [
  'cgst',
  'sgst',
  'igst',
  'vat',
  'service tax',
  'tax',
  'gst'
];

// Keywords indicating discount
const DISCOUNT_KEYWORDS = [
  'discount',
  'disc',
  'less',
  'coupon',
  'saving',
  'cashback'
];

// Category heuristic keywords
const CATEGORY_RULES = [
  {
    category: 'Food',
    keywords: [
      'restaurant', 'cafe', 'coffee', 'tea', 'bakery', 'sweets', 'swiggy', 'zomato',
      'mcdonald', 'domino', 'pizza', 'burger', 'kitchen', 'bhojanalay', 'dhaba',
      'hotel', 'dining', 'food', 'snacks', 'grocery', 'supermarket', 'mart', 'dmart',
      'kirana', 'milk', 'dairy', 'fruits', 'vegetables', 'beverages'
    ]
  },
  {
    category: 'Transport',
    keywords: [
      'petrol', 'diesel', 'fuel', 'cng', 'hpcl', 'iocl', 'bpcl', 'shell',
      'uber', 'ola', 'rapido', 'taxi', 'cab', 'auto', 'metro', 'railway', 'irctc',
      'bus', 'toll', 'fastag', 'parking', 'transport', 'airline', 'flight', 'indigo'
    ]
  },
  {
    category: 'Shopping',
    keywords: [
      'clothing', 'apparel', 'garments', 'fashion', 'trends', 'zara', 'h&m',
      'pantaloons', 'westside', 'lifestyle', 'electronics', 'croma', 'reliance digital',
      'amazon', 'flipkart', 'myntra', 'shoes', 'footwear', 'mall', 'retail', 'store'
    ]
  },
  {
    category: 'Healthcare',
    keywords: [
      'pharmacy', 'chemist', 'medicos', 'medical', 'hospital', 'clinic', 'diagnostics',
      'pathology', 'lab', 'doctor', 'apollo', 'pharmeasy', 'medplus', 'tablet', 'health'
    ]
  },
  {
    category: 'Entertainment',
    keywords: [
      'cinema', 'movie', 'pvr', 'inox', 'cinepolis', 'theatre', 'bookmyshow',
      'gaming', 'bowling', 'amusement', 'entertainment', 'show', 'concert'
    ]
  },
  {
    category: 'Bills',
    keywords: [
      'electricity', 'power', 'water', 'gas', 'broadband', 'wifi', 'internet',
      'airtel', 'jio', 'vi', 'vodafone', 'bescom', 'tneb', 'mgvcl', 'torrent power',
      'utility', 'recharge', 'dth', 'postpaid'
    ]
  },
  {
    category: 'Personal Care',
    keywords: [
      'salon', 'parlour', 'barber', 'spa', 'haircut', 'beauty', 'wellness',
      'grooming', 'skincare', 'cosmetics'
    ]
  },
  {
    category: 'Education',
    keywords: [
      'school', 'college', 'university', 'tuition', 'coaching', 'classes', 'books',
      'stationery', 'library', 'course', 'academy', 'institute'
    ]
  }
];

// Payment method heuristic keywords
const PAYMENT_METHOD_RULES = [
  { method: 'UPI', keywords: ['upi', 'gpay', 'google pay', 'phonepe', 'paytm', 'bhim', 'scan & pay', 'qr code'] },
  { method: 'Card', keywords: ['visa', 'mastercard', 'rupay', 'credit card', 'debit card', 'card', 'pos', 'chip'] },
  { method: 'Bank Transfer', keywords: ['neft', 'rtgs', 'imps', 'net banking', 'bank transfer', 'wire'] },
  { method: 'Cash', keywords: ['cash', 'cash tendered', 'cash payment', 'currency'] }
];

/**
 * Sanitizes and cleans a single line of OCR text.
 */
function cleanLine(line) {
  return line ? line.trim().replace(/\s+/g, ' ') : '';
}

/**
 * Normalizes Indian currency string to float amount.
 * Example: '1,250.50' -> 1250.50, '₹450' -> 450.00
 */
export function parseCurrencyAmount(str) {
  if (!str) return null;
  // Remove currency signs, whitespace, and 'INR'/'Rs'/'Rupees'
  let cleaned = str.replace(/[₹$€£]/g, '')
    .replace(/(?:inr|rs\.?|rupees)/gi, '')
    .trim();

  // Handle Indian thousand commas: e.g. 1,00,000.50 or 1,250.50
  cleaned = cleaned.replace(/,/g, '');

  const num = parseFloat(cleaned);
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    return null;
  }
  return parseFloat(num.toFixed(2));
}

/**
 * Detects whether a string is a phone number, pin code, or GST number to avoid mistaking it as an amount.
 */
function isDisallowedNumber(numberStr, line) {
  const digitsOnly = numberStr.replace(/\D/g, '');
  // 10-digit phone number
  if (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly)) {
    return true;
  }
  // 6-digit pin code
  if (digitsOnly.length === 6 && /(pin|code|postal)/i.test(line)) {
    return true;
  }
  // GST number pattern: 2 digits + 10 alphanumeric + 1 digit/char + Z + 1 digit/char
  if (/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/i.test(line)) {
    return true;
  }
  // 4-digit year like 2024, 2025, 2026
  if (/^20\d{2}$/.test(digitsOnly) && /(date|year|dt)/i.test(line)) {
    return true;
  }
  return false;
}

/**
 * Parses merchant name from the header lines.
 */
export function extractMerchantName(lines) {
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const line = lines[i];
    if (!line || line.length < 3 || line.length > 80) continue;

    const lower = line.toLowerCase();

    // Check if line is noise
    const isNoise = HEADER_NOISE_WORDS.some((w) => lower.includes(w));
    if (isNoise) continue;

    // Check if line contains GSTIN, Phone, Address indicators
    if (/\b(gstin|phone|tel|email|www\.|http|address|pincode|fssai)\b/i.test(lower)) {
      continue;
    }

    // Line shouldn't be mostly numbers or symbols
    const letterCount = (line.match(/[a-zA-Z]/g) || []).length;
    if (letterCount >= 3) {
      // Clean off leading symbols
      const clean = line.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9]+$/, '').trim();
      if (clean.length >= 3) {
        return { name: clean, confidence: 'high' };
      }
    }
  }

  return { name: '', confidence: 'low' };
}

/**
 * Extracts receipt date in multiple common formats.
 */
export function extractReceiptDate(text, lines) {
  // Regex 1: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD.MM.YYYY
  const datePatterns = [
    /\b(20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/, // YYYY-MM-DD
    /\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})\b/, // DD/MM/YYYY
    /\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.]([12]\d)\b/,   // DD/MM/YY
    /\b(0[1-9]|[12]\d|3[01])[-/\s]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-/\s]+(20\d{2})\b/i // DD Mon YYYY / DD-Mon-YYYY
  ];

  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  for (const line of lines) {
    // Priority: check lines with 'date' or 'dt'
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        let y, m, d;
        if (pattern === datePatterns[0]) {
          // YYYY-MM-DD
          [, y, m, d] = match;
        } else if (pattern === datePatterns[1]) {
          // DD/MM/YYYY
          [, d, m, y] = match;
        } else if (pattern === datePatterns[2]) {
          // DD/MM/YY
          [, d, m, y] = match;
          y = `20${y}`;
        } else if (pattern === datePatterns[3]) {
          // DD Mon YYYY
          [, d, m, y] = match;
          m = monthMap[m.toLowerCase().slice(0, 3)] || '01';
        }

        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        if (!isNaN(dateObj.getTime()) && dateObj.getDate() === Number(d)) {
          const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          return { date: iso, confidence: 'high' };
        }
      }
    }
  }

  // Default fallback: today's date with low confidence
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return { date: `${y}-${m}-${d}`, confidence: 'low' };
}

/**
 * Extracts receipt time (HH:MM:SS or HH:MM AM/PM).
 */
export function extractReceiptTime(lines) {
  const timeRegex = /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*(am|pm)?\b/i;
  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

/**
 * Extracts invoice or receipt number.
 */
export function extractInvoiceNumber(lines) {
  const invRegex = /\b(inv(?:oice)?|bill|rcpt|receipt|order|txn)(?:\s*(?:no|num|#|\.))?[:\s]*([a-z0-9\-_/]+)/i;
  for (const line of lines) {
    const match = line.match(invRegex);
    if (match && match[2] && match[2].length >= 2 && !/^(date|time|cash)$/i.test(match[2])) {
      return match[2].trim();
    }
  }
  return null;
}

/**
 * Extracts and disambiguates amounts:
 * Separates subtotal, taxes, discounts, and total payable amount.
 */
export function extractAmounts(lines) {
  // Regex to extract monetary numbers: with or without symbol
  const amountPattern = /(?:[₹$€£]|(?:rs\.?|inr)\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/gi;

  const candidateTotals = [];
  let detectedSubtotal = null;
  let detectedTax = null;
  let detectedDiscount = null;

  lines.forEach((line, index) => {
    const lower = line.toLowerCase();

    // Check for subtotal first
    const isSubtotal = SUBTOTAL_KEYWORDS.some((k) => lower.includes(k));
    // Check for tax (excluding taxable value)
    const isTax = !isSubtotal && (
      /\b(cgst|sgst|igst|vat|service tax|sales tax|gst)\b/i.test(lower) ||
      (/\btax\b/i.test(lower) && !lower.includes('taxable'))
    );
    // Check for discount
    const isDiscount = DISCOUNT_KEYWORDS.some((k) => lower.includes(k));
    // Check for total (excluding subtotal)
    const isTotal = !isSubtotal && !isTax && TOTAL_KEYWORDS.some((k) => lower.includes(k));

    // Find all amounts in this line
    let match;
    const lineAmounts = [];
    while ((match = amountPattern.exec(line)) !== null) {
      const raw = match[1];
      const parsed = parseCurrencyAmount(raw);
      if (parsed !== null && !isDisallowedNumber(raw, line)) {
        lineAmounts.push(parsed);
      }
    }

    if (lineAmounts.length === 0) return;

    const lineAmount = lineAmounts[lineAmounts.length - 1]; // Right-most amount is usually the line sum

    if (isTax && !detectedTax) {
      detectedTax = lineAmount;
    } else if (isDiscount && !detectedDiscount) {
      detectedDiscount = lineAmount;
    } else if (isSubtotal && !detectedSubtotal) {
      detectedSubtotal = lineAmount;
    } else if (isTotal) {
      candidateTotals.push({
        amount: lineAmount,
        lineIndex: index,
        keyword: TOTAL_KEYWORDS.find((k) => lower.includes(k)) || 'total',
        confidence: lower.includes('grand') || lower.includes('net') ? 'high' : 'medium'
      });
    }
  });

  // If candidate totals were found, choose the best one
  if (candidateTotals.length > 0) {
    // Prefer "grand total" or "net payable", or the last total on the receipt
    const preferred = candidateTotals.find((c) =>
      c.keyword.includes('grand') || c.keyword.includes('net payable') || c.keyword.includes('net amount')
    ) || candidateTotals[candidateTotals.length - 1];

    return {
      total: preferred.amount,
      confidence: preferred.confidence,
      candidateTotals: candidateTotals.map((c) => c.amount),
      subtotal: detectedSubtotal,
      tax: detectedTax,
      discount: detectedDiscount
    };
  }

  // Fallback: If no explicit total keyword found, look for largest realistic amount at bottom half
  const allAmounts = [];
  lines.forEach((line) => {
    let match;
    while ((match = amountPattern.exec(line)) !== null) {
      const raw = match[1];
      const parsed = parseCurrencyAmount(raw);
      if (parsed !== null && !isDisallowedNumber(raw, line)) {
        allAmounts.push(parsed);
      }
    }
  });

  if (allAmounts.length > 0) {
    // Sort descending
    const unique = Array.from(new Set(allAmounts)).sort((a, b) => b - a);
    return {
      total: unique[0],
      confidence: 'low',
      candidateTotals: unique.slice(0, 4),
      subtotal: detectedSubtotal,
      tax: detectedTax,
      discount: detectedDiscount
    };
  }

  return {
    total: null,
    confidence: 'none',
    candidateTotals: [],
    subtotal: null,
    tax: null,
    discount: null
  };
}

/**
 * Suggests an expense category based on merchant name and full receipt text.
 */
export function suggestCategory(text, merchantName) {
  const combined = `${merchantName || ''} ${text || ''}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (combined.includes(kw)) {
        return { category: rule.category, confidence: 'high' };
      }
    }
  }

  return { category: 'Other', confidence: 'low' };
}

/**
 * Detects payment method from text.
 */
export function suggestPaymentMethod(text) {
  const lower = (text || '').toLowerCase();
  for (const rule of PAYMENT_METHOD_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        return { paymentMethod: rule.method, confidence: 'high' };
      }
    }
  }
  return { paymentMethod: 'UPI', confidence: 'low' };
}

/**
 * Optionally parses line items from receipt lines.
 */
export function extractLineItems(lines) {
  const items = [];
  const itemPattern = /^(.{3,40}?)\s+(\d+)?\s*(?:x\s*)?(?:[₹$€£]|rs\.?)?\s*(\d+(?:\.\d{2})?)$/i;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k)) ||
        SUBTOTAL_KEYWORDS.some((k) => lower.includes(k)) ||
        TAX_KEYWORDS.some((k) => lower.includes(k)) ||
        HEADER_NOISE_WORDS.some((k) => lower.includes(k))) {
      continue;
    }

    const match = line.match(itemPattern);
    if (match) {
      const name = match[1].trim();
      const qty = match[2] ? parseInt(match[2], 10) : 1;
      const price = parseFloat(match[3]);
      if (name.length >= 2 && !isNaN(price) && price > 0) {
        items.push({ name, quantity: qty, price });
      }
    }
  }

  return items;
}

/**
 * Main smart parser entrypoint: Takes raw OCR text and returns structured candidate expense draft.
 */
export function parseReceiptText(rawText) {
  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return {
      isValidReceipt: false,
      rawText: rawText || '',
      merchant: '',
      amount: '',
      candidateTotals: [],
      date: new Date().toISOString().slice(0, 10),
      time: null,
      category: 'Other',
      paymentMethod: 'UPI',
      invoiceNumber: null,
      subtotal: null,
      tax: null,
      discount: null,
      lineItems: [],
      confidence: {
        merchant: 'none',
        amount: 'none',
        date: 'none',
        category: 'none',
        paymentMethod: 'none'
      }
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((l) => l.length > 0);

  const merchantRes = extractMerchantName(lines);
  const dateRes = extractReceiptDate(rawText, lines);
  const time = extractReceiptTime(lines);
  const invoiceNumber = extractInvoiceNumber(lines);
  const amountsRes = extractAmounts(lines);
  const categoryRes = suggestCategory(rawText, merchantRes.name);
  const paymentMethodRes = suggestPaymentMethod(rawText);
  const lineItems = extractLineItems(lines);

  const hasUsefulData = Boolean(merchantRes.name || amountsRes.total);

  return {
    isValidReceipt: hasUsefulData,
    rawText,
    merchant: merchantRes.name,
    amount: amountsRes.total !== null ? String(amountsRes.total) : '',
    candidateTotals: amountsRes.candidateTotals,
    date: dateRes.date,
    time,
    category: categoryRes.category,
    paymentMethod: paymentMethodRes.paymentMethod,
    invoiceNumber,
    subtotal: amountsRes.subtotal,
    tax: amountsRes.tax,
    discount: amountsRes.discount,
    lineItems,
    confidence: {
      merchant: merchantRes.confidence,
      amount: amountsRes.confidence,
      date: dateRes.confidence,
      category: categoryRes.confidence,
      paymentMethod: paymentMethodRes.confidence
    }
  };
}
