import { sharePage, type ShareResult } from '@/lib/share';

/** Absolute URL for a tale — used by share sheets and the copy-link action. */
export function storyUrl(slug: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/stories/${slug}`;
}

export interface ShareStoryInput {
  slug: string;
  title: string;
  summary?: string;
}

/** Shares a tale via the Web Share API, falling back to the clipboard. */
export async function shareStory({ slug, title, summary }: ShareStoryInput): Promise<ShareResult> {
  return sharePage({
    title: `${title} — Ubuntu Tales`,
    text: summary,
    url: storyUrl(slug),
  });
}

/** Maps a share result to the editorial toast line, or `null` when nothing should be announced. */
export function shareResultMessage(result: ShareResult): string | null {
  switch (result) {
    case 'copied':
      return 'Link copied to your clipboard.';
    case 'failed':
      return 'Sharing is not available in this browser.';
    case 'cancelled':
    case 'shared':
      return null;
  }
}

/** Clipboard fallback for the "Copy link" action. Returns whether the copy succeeded. */
export async function copyStoryLink(slug: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(storyUrl(slug));
    return true;
  } catch {
    return false;
  }
}
