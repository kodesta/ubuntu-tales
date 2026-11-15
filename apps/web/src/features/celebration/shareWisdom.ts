export type WisdomShareResult = 'shared' | 'copied' | 'mailto' | 'cancelled';

export interface ShareWisdomInput {
  /** The moral/proverb being shared. */
  wisdom: string;
  /** The tale it came from. */
  title: string;
  slug: string;
}

function wisdomUrl(slug: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/stories/${slug}`;
}

/** The editorial share text: the wisdom line first, then provenance. */
export function wisdomShareText({ wisdom, title, slug }: ShareWisdomInput): string {
  return `“${wisdom}”\n\nFrom “${title}” on Ubuntu Tales.\n${wisdomUrl(slug)}`;
}

/**
 * Shares a tale's wisdom. Order: Web Share API → clipboard → `mailto:` composition.
 * No crawler OG pages exist in Phase 1, so the text carries the provenance itself.
 */
export async function shareWisdom(input: ShareWisdomInput): Promise<WisdomShareResult> {
  const text = wisdomShareText(input);
  const url = wisdomUrl(input.slug);

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'A wisdom from Ubuntu Tales', text, url });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      // fall through to mailto
    }
  }

  if (typeof window !== 'undefined') {
    const subject = encodeURIComponent('A wisdom from Ubuntu Tales');
    const body = encodeURIComponent(text);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    return 'mailto';
  }

  return 'cancelled';
}

/** Toast line for a wisdom share result, or `null` when nothing should be announced. */
export function wisdomShareMessage(result: WisdomShareResult): string | null {
  switch (result) {
    case 'copied':
      return 'The wisdom is copied to your clipboard.';
    case 'mailto':
      return 'Opening your mail app to pass the wisdom on.';
    case 'shared':
    case 'cancelled':
      return null;
  }
}
