import { z } from 'zod';
import { WORDS_PER_MINUTE } from './constants';

export const storySentenceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const storyParagraphSchema = z.object({
  id: z.string().min(1),
  sentences: z.array(storySentenceSchema).min(1),
});

export const storyBodySchema = z.object({
  version: z.literal(1),
  paragraphs: z.array(storyParagraphSchema).min(1),
});

export type StorySentence = z.infer<typeof storySentenceSchema>;
export type StoryParagraph = z.infer<typeof storyParagraphSchema>;
export type StoryBody = z.infer<typeof storyBodySchema>;

export interface FlatSentence {
  /** Global monotonic index across the whole body, 0-based. */
  index: number;
  paragraphIndex: number;
  sentence: StorySentence;
}

export function flattenSentences(body: StoryBody): FlatSentence[] {
  const out: FlatSentence[] = [];
  body.paragraphs.forEach((paragraph, paragraphIndex) => {
    paragraph.sentences.forEach((sentence) => {
      out.push({ index: out.length, paragraphIndex, sentence });
    });
  });
  return out;
}

export function countWords(body: StoryBody): number {
  return body.paragraphs.reduce(
    (total, paragraph) =>
      total +
      paragraph.sentences.reduce(
        (sum, sentence) => sum + sentence.text.trim().split(/\s+/).filter(Boolean).length,
        0,
      ),
    0,
  );
}

export function readTimeMinutes(body: StoryBody): number {
  return Math.max(1, Math.ceil(countWords(body) / WORDS_PER_MINUTE));
}

export function bodyToPlainText(body: StoryBody): string {
  return body.paragraphs
    .map((paragraph) => paragraph.sentences.map((sentence) => sentence.text).join(' '))
    .join('\n\n');
}

/**
 * Split a paragraph into sentences using Intl.Segmenter where available, falling back to a
 * conservative regex. Used by the admin editor and seed import (ADR-011).
 */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    return Array.from(segmenter.segment(trimmed))
      .map((part) => part.segment.trim())
      .filter(Boolean);
  }

  return trimmed
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Build a StoryBody from plain paragraph strings with stable, deterministic IDs.
 * Pass `sentenceOffset` when appending paragraphs so sentence IDs stay unique.
 */
export function buildStoryBody(paragraphTexts: string[], sentenceOffset = 0): StoryBody {
  let sentenceNumber = sentenceOffset;

  return {
    version: 1,
    paragraphs: paragraphTexts.map((text, paragraphIndex) => ({
      id: `p_${pad2(paragraphIndex + 1)}`,
      sentences: splitSentences(text).map((sentenceText) => {
        sentenceNumber += 1;
        return {
          id: `s_${String(sentenceNumber).padStart(4, '0')}`,
          text: sentenceText,
        };
      }),
    })),
  };
}
