import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFontSizeStore } from '@/stores/fontSize';

import { FontSizeControl } from './FontSizeControl';

beforeEach(() => {
  window.localStorage.clear();
  useFontSizeStore.setState({ size: 'md' });
});

describe('FontSizeControl', () => {
  it('steps text size up and down, clamping at the ends', async () => {
    const user = userEvent.setup();
    render(<FontSizeControl />);

    const increase = screen.getByRole('button', { name: 'Increase text size' });
    const decrease = screen.getByRole('button', { name: 'Decrease text size' });

    expect(decrease).toBeEnabled();
    expect(increase).toBeEnabled();

    await user.click(increase);
    expect(useFontSizeStore.getState().size).toBe('lg');
    expect(increase).toBeDisabled();

    await user.click(decrease);
    await user.click(decrease);
    expect(useFontSizeStore.getState().size).toBe('sm');
    expect(decrease).toBeDisabled();
  });

  it('persists the chosen size under ut.fontSize', async () => {
    const user = userEvent.setup();
    render(<FontSizeControl />);

    await user.click(screen.getByRole('button', { name: 'Increase text size' }));
    expect(window.localStorage.getItem('ut.fontSize')).toContain('"size":"lg"');

    await user.click(screen.getByRole('button', { name: 'Decrease text size' }));
    expect(window.localStorage.getItem('ut.fontSize')).toContain('"size":"md"');
  });
});
