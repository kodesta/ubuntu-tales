import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/stores/session';

import { AuthModalHost } from './AuthModal';
import { useAuthModalStore } from './authModalStore';
import { requireAuth } from './requireAuth';
import {
  makeAuthResponse,
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

function resetAuthModal(): void {
  useAuthModalStore.setState({ mode: null, pendingAction: null, redirectTo: null });
}

beforeEach(() => {
  resetSessionStore();
  resetAuthModal();
  mocks.login.mockReset();
  mocks.register.mockReset();
  mocks.refresh.mockReset();
  mocks.getTribes.mockReset();
  mocks.getConfig.mockReset();
  mocks.getTribes.mockResolvedValue([]);
  mocks.getConfig.mockResolvedValue({ communityRoles: [] });
});

describe('requireAuth', () => {
  it('runs the action immediately for a signed-in reader', () => {
    seedAuthenticatedSession();
    const action = vi.fn();

    expect(requireAuth(action)).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(useAuthModalStore.getState().mode).toBeNull();
  });

  it('opens the auth modal for a guest and remembers the action', () => {
    useSessionStore.setState({ status: 'guest' });
    const action = vi.fn();

    expect(requireAuth(action)).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(useAuthModalStore.getState().mode).toBe('login');
    expect(useAuthModalStore.getState().pendingAction).toBe(action);
  });

  it('waits for the session boot before deciding', async () => {
    mocks.refresh.mockResolvedValue(makeAuthResponse());
    const action = vi.fn();

    expect(requireAuth(action)).toBe(false);
    expect(action).not.toHaveBeenCalled();

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(useAuthModalStore.getState().mode).toBeNull();
  });

  it('opens the modal when the boot refresh finds no session', async () => {
    mocks.refresh.mockRejectedValue(new Error('no cookie'));
    const action = vi.fn();

    expect(requireAuth(action)).toBe(false);
    await waitFor(() => expect(useAuthModalStore.getState().mode).toBe('login'));
    expect(useAuthModalStore.getState().pendingAction).toBe(action);
    expect(action).not.toHaveBeenCalled();
  });

  it('can open the signup form directly', () => {
    useSessionStore.setState({ status: 'guest' });

    requireAuth(undefined, { mode: 'signup', redirectTo: '/saved' });

    expect(useAuthModalStore.getState().mode).toBe('signup');
    expect(useAuthModalStore.getState().redirectTo).toBe('/saved');
  });
});

describe('AuthModalHost', () => {
  it('resumes the original action after a successful sign-in', async () => {
    mocks.login.mockResolvedValue(makeAuthResponse());
    useSessionStore.setState({ status: 'guest' });
    const action = vi.fn();
    const user = userEvent.setup();

    await renderWithAuthRouter(<AuthModalHost />);

    act(() => {
      requireAuth(action);
    });

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Welcome back.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'kwame@ubuntutales.local');
    await user.type(screen.getByLabelText('Password'), 'ubuntu-tales-dev');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(useAuthModalStore.getState().mode).toBeNull());
    expect(useSessionStore.getState().status).toBe('authenticated');
  });

  it('can switch from sign-in to opening an account without losing the pending action', async () => {
    useSessionStore.setState({ status: 'guest' });
    const action = vi.fn();
    const user = userEvent.setup();

    await renderWithAuthRouter(<AuthModalHost />);

    act(() => {
      requireAuth(action);
    });

    await user.click(await screen.findByRole('button', { name: 'Open an account' }));

    expect(useAuthModalStore.getState().mode).toBe('signup');
    expect(useAuthModalStore.getState().pendingAction).toBe(action);
    expect(await screen.findByRole('button', { name: 'Open my account' })).toBeInTheDocument();
  });
});
