/**
 * ShareService — Download and Web Share API integration.
 *
 * Pure DOM utility module (no Phaser dependency). Provides three functions:
 * - canNativeShare(): detect Web Share API with file support
 * - downloadImage(): save a data URL as PNG (with iOS Safari fallback)
 * - nativeShare(): share via Web Share API, falls back to download on failure
 */

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the browser supports Web Share API with file sharing.
 * Checks navigator.share + navigator.canShare + actual file sharing ability.
 */
export function canNativeShare(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.share || !navigator.canShare) return false;

  try {
    const testFile = new File([''], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Download a data URL as a PNG file.
 *
 * Uses the <a download> trick on most browsers. Falls back to window.open()
 * on iOS Safari where the download attribute is not supported (user can
 * long-press to save).
 */
export async function downloadImage(
  dataUrl: string,
  filename?: string,
): Promise<void> {
  const name = filename ?? `honk-for-democracy-${Date.now()}.png`;

  // Check if download attribute is supported
  const supportsDownload = 'download' in document.createElement('a');

  if (supportsDownload) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    // iOS Safari fallback — open in new tab for long-press save
    window.open(dataUrl);
  }
}

// ---------------------------------------------------------------------------
// Native Share
// ---------------------------------------------------------------------------

/**
 * Share an image via the Web Share API.
 *
 * Returns true on success, false on user cancel (AbortError).
 * Falls back to downloadImage() if share fails entirely.
 */
export async function nativeShare(
  dataUrl: string,
  title?: string,
  text?: string,
): Promise<boolean> {
  const shareTitle = title ?? 'My Protest Sign';
  const shareText = text ?? 'I stood my ground at HonkForDemocracy.org';

  try {
    // Convert data URL to Blob, then to File
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'honk-for-democracy.png', { type: 'image/png' });

    await navigator.share({
      title: shareTitle,
      text: shareText,
      files: [file],
    });

    return true;
  } catch (err: unknown) {
    // User cancelled — not an error
    if (err instanceof DOMException && err.name === 'AbortError') {
      return false;
    }

    // Share failed entirely — fall back to download
    console.warn('[ShareService] Native share failed, falling back to download:', err);
    await downloadImage(dataUrl);
    return false;
  }
}
