import { describe, expect, it } from 'vitest';

import {
  assertTransition,
  canTransition,
  isEditable,
  SUBMISSION_WORD_LIMITS,
  validateSubmissionText,
  wordCount,
} from './submission.machine';

describe('submission state machine', () => {
  it('allows the documented happy path', () => {
    expect(canTransition('DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('SUBMITTED', 'IN_REVIEW')).toBe(true);
    expect(canTransition('IN_REVIEW', 'APPROVED')).toBe(true);
    expect(canTransition('APPROVED', 'PUBLISHED')).toBe(true);
  });

  it('allows changes-requested loops', () => {
    expect(canTransition('IN_REVIEW', 'CHANGES_REQUESTED')).toBe(true);
    expect(canTransition('CHANGES_REQUESTED', 'SUBMITTED')).toBe(true);
  });

  it('rejects illegal transitions with a readable reason', () => {
    expect(canTransition('DRAFT', 'PUBLISHED')).toBe(false);
    expect(canTransition('PUBLISHED', 'DRAFT')).toBe(false);
    expect(canTransition('REJECTED', 'SUBMITTED')).toBe(false);
    expect(assertTransition('DRAFT', 'APPROVED')).toContain('Cannot move a submission');
    expect(assertTransition('DRAFT', 'SUBMITTED')).toBeNull();
  });

  it('only allows editing drafts and changes-requested tales', () => {
    expect(isEditable('DRAFT')).toBe(true);
    expect(isEditable('CHANGES_REQUESTED')).toBe(true);
    expect(isEditable('SUBMITTED')).toBe(false);
    expect(isEditable('PUBLISHED')).toBe(false);
  });
});

describe('submission text validation', () => {
  it('counts words robustly', () => {
    expect(wordCount('one two  three\nfour')).toBe(4);
    expect(wordCount('   ')).toBe(0);
  });

  it('enforces the 150–5,000 word window', () => {
    expect(validateSubmissionText('short tale')).toContain('at least 150');
    const long = Array.from({ length: SUBMISSION_WORD_LIMITS.max + 1 }, () => 'word').join(' ');
    expect(validateSubmissionText(long)).toContain('at most 5000');
    const good = Array.from({ length: 200 }, () => 'word').join(' ');
    expect(validateSubmissionText(good)).toBeNull();
  });
});
