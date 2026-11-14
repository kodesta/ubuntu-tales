export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

interface ShareInput {
  title: string;
  text?: string;
  url: string;
}

/**
 * Share a page via the Web Share API with a clipboard fallback (no crawler OG pages in Phase 1).
 * Returns a result so the caller can toast the right confirmation.
 */
export async function sharePage({ title, text, url }: ShareInput): Promise<ShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
