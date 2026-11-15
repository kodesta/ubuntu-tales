import type { SubmissionStatus } from '@ubuntu-tales/shared';

/**
 * The submission state machine (production plan 01 §4.5). Transitions are exhaustive and tested;
 * any other move is an invalid state change.
 */
const TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['IN_REVIEW', 'WITHDRAWN', 'REJECTED'],
  IN_REVIEW: ['CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
  CHANGES_REQUESTED: ['SUBMITTED', 'WITHDRAWN'],
  APPROVED: ['PUBLISHED', 'REJECTED'],
  PUBLISHED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function canTransition(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: SubmissionStatus, to: SubmissionStatus): string | null {
  if (canTransition(from, to)) return null;
  return `Cannot move a submission from ${from} to ${to}.`;
}

export function isEditable(status: SubmissionStatus): boolean {
  return status === 'DRAFT' || status === 'CHANGES_REQUESTED';
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const SUBMISSION_WORD_LIMITS = { min: 150, max: 5000 };

export function validateSubmissionText(text: string): string | null {
  const words = wordCount(text);
  if (words < SUBMISSION_WORD_LIMITS.min) return `The tale must be at least ${SUBMISSION_WORD_LIMITS.min} words (currently ${words}).`;
  if (words > SUBMISSION_WORD_LIMITS.max) return `The tale must be at most ${SUBMISSION_WORD_LIMITS.max} words (currently ${words}).`;
  return null;
}
