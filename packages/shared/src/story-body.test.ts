import { describe, expect, it } from 'vitest';
import {
  bodyToPlainText,
  buildStoryBody,
  countWords,
  flattenSentences,
  readTimeMinutes,
  splitSentences,
} from './story-body';

const BODY = buildStoryBody([
  'Long ago, the sky was close to the earth. The people could touch it with their hands.',
  'One day, a child reached up and pulled the sky high above them.',
]);

describe('story body helpers', () => {
  it('assigns stable paragraph and sentence IDs', () => {
    expect(BODY.paragraphs[0]?.id).toBe('p_01');
    expect(BODY.paragraphs[0]?.sentences[0]?.id).toBe('s_0001');
    expect(BODY.paragraphs[1]?.sentences[0]?.id).toBe('s_0003');
  });

  it('flattens sentences in reading order', () => {
    const flat = flattenSentences(BODY);
    expect(flat).toHaveLength(3);
    expect(flat.map((entry) => entry.sentence.id)).toEqual(['s_0001', 's_0002', 's_0003']);
  });

  it('counts words and estimates read time', () => {
    expect(countWords(BODY)).toBe(30);
    expect(readTimeMinutes(BODY)).toBe(1);
  });

  it('renders plain text with paragraph breaks', () => {
    expect(bodyToPlainText(BODY)).toContain('\n\nOne day');
  });

  it('splits sentences without dropping punctuation', () => {
    expect(splitSentences('Hello there. How are you? I am well!')).toEqual([
      'Hello there.',
      'How are you?',
      'I am well!',
    ]);
  });
});
