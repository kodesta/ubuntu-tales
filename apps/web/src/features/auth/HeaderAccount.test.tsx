import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/stores/session';
import { Header } from '@/ui/Header/Header';

import {
  makeUser,
  renderWithAuthRouter,
  resetSessionStore,
  seedAuthenticatedSession,
} from './test-utils';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  getTribes: vi.fn(),
  getConfig: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      auth: {
        ...actual.api.auth,
        login: mocks.login,
        register: mocks.register,
        refresh: mocks.refresh,
        logout: mocks.logout,
        logoutAll: mocks.logoutAll,
      },
      getTribes: mocks.getTribes,
      getConfig: mocks.getConfig,
    },
  };
});

function renderHeader() {
  return renderWithAuthRouter(
    <Header onOpenMenu={() => undefined} onOpenSearch={() => undefined} />,
  );
}

beforeEach(() => {
  resetSessionStore();
  mocks.login.mockReset();
  mocks.refresh.mockReset();
  mocks.logout.mockReset();
  mocks.logoutAll.mockReset();
  mocks.getTribes.mockReset();
  mocks.getConfig.mockReset();
  mocks.logout.mockResolvedValue({ ok: true });
  mocks.logoutAll.mockResolvedValue({ ok: true });
});

describe('session-aware Header', () => {
  it('shows a Sign in call to action for guests', async () => {
    useSessionStore.setState({ status: 'guest' });
    await renderHeader();

    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      expect.stringContaining('/login'),
    );
    expect(screen.getByRole('link', { name: 'Join' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument();
  });

  it('shows the reader’s initials avatar and name when signed in', async () => {
    seedAuthenticatedSession(makeUser({ displayName: 'Kwame Mensah' }));
    await renderHeader();

    const trigger = screen.getByRole('button', { name: /account menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('Kwame Mensah');
    // Initials monogram doubles as the avatar when there is no portrait.
    expect(trigger).toHaveTextContent('KM');
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('opens the account menu with profile, settings, saved and sign out', async () => {
    seedAuthenticatedSession();
    const user = userEvent.setup();
    await renderHeader();

    const trigger = screen.getByRole('button', { name: /account menu/i });
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: 'Your reading list' })).toHaveAttribute(
      'href',
      '/saved',
    );
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('signs out from the menu and returns the header to its guest state', async () => {
    seedAuthenticatedSession();
    const user = userEvent.setup();
    await renderHeader();

    await user.click(screen.getByRole('button', { name: /account menu/i }));
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useSessionStore.getState().status).toBe('guest'));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('closes the account menu on Escape', async () => {
    seedAuthenticatedSession();
    const user = userEvent.setup();
    await renderHeader();

    await user.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();

    await act(async () => {
      await user.keyboard('{Escape}');
    });

    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
  });

  it('links guests back to where they were after signing in', async () => {
    useSessionStore.setState({ status: 'guest' });
    await renderHeader();

    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toContain(
      'redirect=%2F',
    );
  });
});
