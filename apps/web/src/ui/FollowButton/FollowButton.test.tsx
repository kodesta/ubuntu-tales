import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFollowsStore } from '@/stores/follows';
import { useToastStore } from '@/stores/toast';
import { sampleTribe } from '@/test/fixtures';

import { FollowButton } from './FollowButton';

function reset() {
  window.localStorage.clear();
  useFollowsStore.setState({ slugs: [] });
  useToastStore.setState({ toasts: [] });
}

describe('FollowButton', () => {
  beforeEach(reset);

  it('toggles following state, persists it and confirms with a toast', async () => {
    const user = userEvent.setup();
    render(<FollowButton tribe={sampleTribe} />);

    const button = screen.getByRole('button', { name: `Follow ${sampleTribe.name}` });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('Follow');

    await user.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('Following');
    expect(useFollowsStore.getState().slugs).toContain(sampleTribe.slug);
    expect(window.localStorage.getItem('ut.follows')).toContain(sampleTribe.slug);
    expect(useToastStore.getState().toasts.at(0)?.message).toContain('Following on this device');

    await user.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(useFollowsStore.getState().slugs).not.toContain(sampleTribe.slug);
  });

  it('supports publication-page Subscribe labels', () => {
    render(<FollowButton tribe={sampleTribe} labels={{ idle: 'Subscribe', active: 'Subscribed ✓' }} />);
    expect(screen.getByRole('button', { name: `Follow ${sampleTribe.name}` })).toHaveTextContent(
      'Subscribe',
    );
  });
});
