import type { StoryBody } from '@ubuntu-tales/shared';
import { buildStoryBody, splitSentences } from '@ubuntu-tales/shared';

/**
 * Builds a story body from plain paragraphs. On update, unchanged sentences keep their existing ids
 * so narration timings stay valid (ADR-011); new sentences receive fresh, body-unique ids.
 */
export function mergeStoryBody(paragraphTexts: string[], previous?: StoryBody): StoryBody {
  const previousSentences = new Map<string, string>();
  const previousIds: string[] = [];
  for (const paragraph of previous?.paragraphs ?? []) {
    for (const sentence of paragraph.sentences) {
      previousSentences.set(sentence.text.trim(), sentence.id);
      previousIds.push(sentence.id);
    }
  }

  let nextNumber = previousIds.reduce((max, id) => {
    const numeric = Number(id.replace(/^s_/, ''));
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);

  const used = new Set<string>();
  return {
    version: 1,
    paragraphs: paragraphTexts.map((text, paragraphIndex) => ({
      id: previous?.paragraphs[paragraphIndex]?.id ?? `p_${String(paragraphIndex + 1).padStart(2, '0')}`,
      sentences: splitSentences(text).map((sentenceText) => {
        const existing = previousSentences.get(sentenceText.trim());
        if (existing && !used.has(existing)) {
          used.add(existing);
          return { id: existing, text: sentenceText };
        }
        nextNumber += 1;
        return { id: `s_${String(nextNumber).padStart(4, '0')}`, text: sentenceText };
      }),
    })),
  };
}

export function bodyFromParagraphs(paragraphTexts: string[]): StoryBody {
  return buildStoryBody(paragraphTexts);
}

export function validateTimings(
  timings: { sentenceId: string; startMs: number; endMs: number }[],
  sentenceIds: Set<string>,
): string[] {
  const errors: string[] = [];
  let previousEnd = -1;
  let previousStart = -1;

  timings.forEach((timing, index) => {
    if (!sentenceIds.has(timing.sentenceId)) {
      errors.push(`timings[${index}].sentenceId: unknown sentence "${timing.sentenceId}".`);
    }
    if (!Number.isFinite(timing.startMs) || !Number.isFinite(timing.endMs)) {
      errors.push(`timings[${index}]: startMs and endMs must be numbers.`);
      return;
    }
    if (timing.startMs < 0) errors.push(`timings[${index}].startMs: must be >= 0.`);
    if (timing.endMs <= timing.startMs) {
      errors.push(`timings[${index}]: endMs must be greater than startMs.`);
    }
    if (timing.startMs < previousStart) {
      errors.push(`timings[${index}]: timings must be ordered by startMs.`);
    }
    if (timing.startMs < previousEnd) {
      errors.push(`timings[${index}]: timings must not overlap.`);
    }
    previousStart = timing.startMs;
    previousEnd = timing.endMs;
  });

  return errors;
}
