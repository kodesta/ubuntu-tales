import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSavedStore } from '@/stores/saved';
import { renderWithRouter } from '@/test/render';
import { sampleStory } from '@/test/fixtures';

import { StoryCard } from './StoryCard';

function reset() {
  window.localStorage.clear();
  useSavedStore.setState({ entries: [] });
}

describe('StoryCard', () => {
  beforeEach(reset);

  it('renders the feed row with publication meta, category badge and a story link', async () => {
    await renderWithRouter(<StoryCard story={sampleStory} variant="row" />);

    expect(screen.getByRole('heading', { name: sampleStory.title })).toBeInTheDocument();
    expect(screen.getByText(sampleStory.tribe.name)).toBeInTheDocument();
    expect(screen.getByText(sampleStory.category.badge)).toBeInTheDocument();
    expect(screen.getByText('6 min read')).toBeInTheDocument();

    const storyLink = screen
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === `/stories/${sampleStory.slug}`);
    expect(storyLink).toBeTruthy();
  });

  it('renders the hero variant with the narrator byline and read CTA', async () => {
    await renderWithRouter(<StoryCard story={sampleStory} variant="hero" />);

    expect(
      screen.getByRole('link', { name: `Read the tale: ${sampleStory.title}` }),
    ).toHaveAttribute('href', `/stories/${sampleStory.slug}`);
    expect(screen.getByText(`Narrated by ${sampleStory.narrator?.name}`)).toBeInTheDocument();
  });

  it('saves the tale from the row footer without following the card link', async () => {
    const user = userEvent.setup();
    await renderWithRouter(<StoryCard story={sampleStory} variant="row" />);

    await user.click(screen.getByRole('button', { name: 'Save to your reading list' }));

    expect(useSavedStore.getState().entries[0]?.story.slug).toBe(sampleStory.slug);
    expect(window.localStorage.getItem('ut.saved')).toContain(sampleStory.slug);
  });
});
