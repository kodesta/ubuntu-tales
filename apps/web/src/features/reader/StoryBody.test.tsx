import { render, screen } from '@testing-library/react';
import type { StoryBody as StoryBodyModel } from '@ubuntu-tales/shared';
import { describe, expect, it } from 'vitest';

import { StoryBody } from './StoryBody';

const body: StoryBodyModel = {
  version: 1,
  paragraphs: [
    {
      id: 'p_01',
      sentences: [
        { id: 's_0001', text: 'In the beginning the sky was close.' },
        { id: 's_0002', text: 'The people listened.' },
      ],
    },
    {
      id: 'p_02',
      sentences: [{ id: 's_0003', text: 'And the tale began.' }],
    },
  ],
};

describe('StoryBody', () => {
  it('renders one <p> per API paragraph', () => {
    const { container } = render(<StoryBody body={body} />);

    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(container.querySelectorAll('[data-paragraph-id]')).toHaveLength(2);
  });

  it('renders exactly one sentence span per API sentence with its stable id', () => {
    const { container } = render(<StoryBody body={body} />);

    const spans = [...container.querySelectorAll('[data-sentence-id]')];
    expect(spans).toHaveLength(3);
    expect(spans.map((span) => span.getAttribute('data-sentence-id'))).toEqual([
      's_0001',
      's_0002',
      's_0003',
    ]);
  });

  it('keeps the API sentence text and joins sentences with a single space', () => {
    const { container } = render(<StoryBody body={body} />);

    expect(screen.getByText('In the beginning the sky was close.')).toBeInTheDocument();
    const firstParagraph = container.querySelector('[data-paragraph-id="p_01"]');
    expect(firstParagraph?.textContent).toBe(
      'In the beginning the sky was close. The people listened.',
    );
  });
});
