/**
 * HisabSetu — File Delivery & Download Utility
 * Cross-platform file downloading and sharing for Desktop and Android Capacitor environments.
 */

/**
 * Downloads or shares a generated file (PDF, CSV, JSON) safely across desktop and mobile.
 * @param {Blob|string} content - File content as a Blob or text string
 * @param {string} filename - User-facing filename with extension
 * @param {string} mimeType - MIME type (e.g. 'application/pdf', 'text/csv', 'application/json')
 */
export async function downloadFile(content, filename, mimeType = 'application/octet-stream') {
  if (typeof window === 'undefined') return;

  const blob = content instanceof Blob
    ? content
    : new Blob([content], { type: `${mimeType};charset=utf-8;` });

  // Mobile Web Share API check (if supported and user is on a touch/mobile device)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile && navigator.canShare && typeof File !== 'undefined') {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: `HisabSetu Financial Export: ${filename}`
        });
        return { success: true, method: 'share' };
      }
    } catch (shareErr) {
      // AbortError indicates user cancelled share sheet, other errors fall back to direct download
      if (shareErr.name === 'AbortError') {
        return { success: true, method: 'share_cancelled' };
      }
      console.warn('Web Share failed, falling back to browser download:', shareErr);
    }
  }

  // Standard Blob Anchor download
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = filename;
    link.setAttribute('aria-hidden', 'true');
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, 1500);

    return { success: true, method: 'download' };
  } catch (err) {
    console.error('File download error:', err);
    throw new Error(`Failed to download ${filename}: ${err.message}`);
  }
}
