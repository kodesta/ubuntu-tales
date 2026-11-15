import type {
  AdminStorySummary,
  SubmissionDetail,
  SubmissionSummary,
} from '@ubuntu-tales/shared';

export function toAdminStorySummary(row: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  accessLevel: 'FREE' | 'PREMIUM';
  isFeatured: boolean;
  wordCount: number;
  coverUrl: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  tribe: { id: string; slug: string; name: string };
  category: { id: string; slug: string; name: string; badge: string };
  narrator: { id: string; name: string } | null;
  narrations?: { id: string }[];
}): AdminStorySummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: row.status,
    accessLevel: row.accessLevel,
    isFeatured: row.isFeatured,
    tribe: { id: row.tribe.id, slug: row.tribe.slug, name: row.tribe.name },
    category: { id: row.category.id, slug: row.category.slug, name: row.category.name, badge: row.category.badge },
    ...(row.narrator ? { narrator: { id: row.narrator.id, name: row.narrator.name } } : {}),
    ...(row.publishedAt ? { publishedAt: row.publishedAt.toISOString() } : {}),
    updatedAt: row.updatedAt.toISOString(),
    wordCount: row.wordCount,
    hasCover: Boolean(row.coverUrl),
    hasAudio: (row.narrations?.length ?? 0) > 0,
  };
}

export function toSubmissionSummary(
  row: {
    id: string;
    status: SubmissionSummary['status'];
    title: string;
    bodyText: string;
    customTribe: string | null;
    submittedAt: Date | null;
    updatedAt: Date;
    reviewerNote: string | null;
    author: { id: string; displayName: string };
    tribe: { name: string } | null;
    category: { name: string } | null;
    story: { slug: string } | null;
  },
): SubmissionSummary {
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    author: { id: row.author.id, displayName: row.author.displayName },
    ...(row.tribe?.name ? { tribeName: row.tribe.name } : {}),
    ...(row.customTribe ? { customTribe: row.customTribe } : {}),
    ...(row.category?.name ? { categoryName: row.category.name } : {}),
    wordCount: row.bodyText.trim().split(/\s+/).filter(Boolean).length,
    ...(row.submittedAt ? { submittedAt: row.submittedAt.toISOString() } : {}),
    updatedAt: row.updatedAt.toISOString(),
    ...(row.reviewerNote ? { reviewerNote: row.reviewerNote } : {}),
    ...(row.story?.slug ? { storySlug: row.story.slug } : {}),
  };
}

export function toSubmissionDetail(
  row: Parameters<typeof toSubmissionSummary>[0] & {
    moral: string | null;
    attribution: string | null;
    rightsConfirmed: boolean;
    licence: string;
    coverUrl: string | null;
    audioUrl: string | null;
    events: { fromStatus: SubmissionSummary['status'] | null; toStatus: SubmissionSummary['status']; note: string | null; createdAt: Date; actor?: { displayName: string } | null }[];
  },
): SubmissionDetail {
  return {
    ...toSubmissionSummary(row),
    bodyText: row.bodyText,
    ...(row.moral ? { moral: row.moral } : {}),
    ...(row.attribution ? { attribution: row.attribution } : {}),
    rightsConfirmed: row.rightsConfirmed,
    licence: row.licence,
    ...(row.coverUrl ? { coverUrl: row.coverUrl } : {}),
    ...(row.audioUrl ? { audioUrl: row.audioUrl } : {}),
    events: row.events.map((event) => ({
      ...(event.fromStatus ? { fromStatus: event.fromStatus } : {}),
      toStatus: event.toStatus,
      ...(event.note ? { note: event.note } : {}),
      at: event.createdAt.toISOString(),
      ...(event.actor?.displayName ? { actor: event.actor.displayName } : {}),
    })),
  };
}
