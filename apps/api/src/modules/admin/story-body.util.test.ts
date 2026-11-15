import { describe, expect, it } from 'vitest';

import { bodyFromParagraphs, mergeStoryBody, validateTimings } from './story-body.util';

describe('story body editing', () => {
  it('splits paragraphs into stable sentence ids', () => {
    const body = bodyFromParagraphs(['First sentence. Second sentence.', 'Third one.']);
    expect(body.paragraphs[0]?.sentences.map((sentence) => sentence.id)).toEqual(['s_0001', 's_0002']);
    expect(body.paragraphs[1]?.sentences[0]?.id).toBe('s_0003');
  });

  it('keeps ids of unchanged sentences and gives new ones fresh ids', () => {
    const original = bodyFromParagraphs(['The moon rose. The drums spoke.']);
    const edited = mergeStoryBody(['The moon rose. The drums spoke. A new line arrives.'], original);
    const sentences = edited.paragraphs[0]?.sentences ?? [];
    expect(sentences[0]?.id).toBe('s_0001');
    expect(sentences[1]?.id).toBe('s_0002');
    expect(sentences[2]?.id).toBe('s_0003');
    expect(sentences[2]?.text).toBe('A new line arrives.');
  });

  it('reuses ids even when sentence order changes', () => {
    const original = bodyFromParagraphs(['Alpha beta. Gamma delta.']);
    const edited = mergeStoryBody(['Gamma delta. Alpha beta.'], original);
    expect(edited.paragraphs[0]?.sentences.map((sentence) => sentence.text)).toEqual([
      'Gamma delta.',
      'Alpha beta.',
    ]);
    expect(new Set(edited.paragraphs[0]?.sentences.map((sentence) => sentence.id)).size).toBe(2);
  });
});

describe('narration timing validation', () => {
  const ids = new Set(['s_0001', 's_0002']);

  it('accepts ordered, non-overlapping timings covering known sentences', () => {
    expect(
      validateTimings(
        [
          { sentenceId: 's_0001', startMs: 0, endMs: 2000 },
          { sentenceId: 's_0002', startMs: 2000, endMs: 4000 },
        ],
        ids,
      ),
    ).toEqual([]);
  });

  it('rejects unknown ids, overlaps, bad ranges and negative starts', () => {
    const errors = validateTimings(
      [
        { sentenceId: 's_9999', startMs: 0, endMs: 1000 },
        { sentenceId: 's_0001', startMs: 900, endMs: 1500 },
        { sentenceId: 's_0002', startMs: 1500, endMs: 1400 },
      ],
      ids,
    );
    expect(errors.join(' ')).toMatch(/unknown sentence/);
    expect(errors.join(' ')).toMatch(/must not overlap/);
    expect(errors.join(' ')).toMatch(/endMs must be greater/);
  });
});
