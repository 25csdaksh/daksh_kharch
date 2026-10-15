/**
 * HisabSetu — Receipt Image Storage & Validation Service
 * Provides privacy-first receipt handling with client-side MIME/magic-number validation
 * and optional user-scoped Supabase Storage bucket integration.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

export const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates a file using its size, declared MIME type, and binary magic bytes.
 */
export async function validateReceiptFile(file) {
  if (!file) {
    return { isValid: false, error: 'No file selected.' };
  }

  // 1. Check size limit
  if (file.size > MAX_RECEIPT_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File is too large (${sizeMb} MB). Maximum permitted receipt size is 10 MB.`
    };
  }

  // 2. Check declared MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Supported formats are JPEG, PNG, and WebP.`
    };
  }

  // 3. Binary Magic Byte Validation (Never trust client MIME alone)
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let isMagicValid = false;
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      isMagicValid = true;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      isMagicValid = true;
    }
    // WEBP: RIFF .... WEBP
    else if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      isMagicValid = true;
    }

    if (!isMagicValid) {
      return {
        isValid: false,
        error: 'File content does not match genuine JPEG, PNG, or WebP image signature.'
      };
    }
  } catch (err) {
    console.warn('Magic byte inspection skipped:', err);
  }

  return { isValid: true, error: null };
}

/**
 * Uploads receipt image to private Supabase storage bucket under authenticated user path:
 * receipts/{userId}/{expenseId}.jpg
 *
 * If Supabase storage is not configured or user opts out, returns null without breaking.
 */
export async function uploadReceiptImage(fileOrBlob, expenseId, userId) {
  if (!isSupabaseConfigured || !supabase || !userId || !expenseId || !fileOrBlob) {
    return null;
  }

  try {
    const extension = fileOrBlob.type === 'image/png' ? 'png' : fileOrBlob.type === 'image/webp' ? 'webp' : 'jpg';
    const filePath = `${userId}/${expenseId}.${extension}`;

    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, fileOrBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn('Receipt image upload to Supabase storage skipped or failed:', error.message);
      return null;
    }

    return filePath;
  } catch (err) {
    console.warn('Could not store receipt image:', err);
    return null;
  }
}

/**
 * Creates a signed private URL for an uploaded receipt path.
 */
export async function getReceiptSignedUrl(filePath, expiresIn = 3600) {
  if (!isSupabaseConfigured || !supabase || !filePath) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.warn('Failed to generate signed receipt URL:', error.message);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.warn('Signed URL error:', err);
    return null;
  }
}
