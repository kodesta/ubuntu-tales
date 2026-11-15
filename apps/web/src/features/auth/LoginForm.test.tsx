import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@ubuntu-tales/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore } from '@/stores/session';

import { DEV_SEED_PASSWORD, DEV_SEED_USERS } from './dev';
import { LoginForm } from './LoginForm';
import { makeAuthResponse, renderWithAuthRouter, resetSessionStore } from './test-utils';

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

function invalidCredentials(): ApiError {
  return new ApiError(401, {
    type: 'about:blank',
    title: 'Unauthorized',
    status: 401,
    detail: 'Invalid email or password',
    code: 'AUTH_INVALID_CREDENTIALS',
  });
}

beforeEach(() => {
  resetSessionStore();
  useSessionStore.setState({ status: 'guest' });
  mocks.login.mockReset();
  mocks.register.mockReset();
  mocks.refresh.mockReset();
  mocks.logout.mockReset();
  mocks.logoutAll.mockReset();
  mocks.getTribes.mockReset();
  mocks.getConfig.mockReset();
  mocks.getTribes.mockResolvedValue([]);
  mocks.getConfig.mockResolvedValue({ communityRoles: [] });
});

describe('LoginForm', () => {
  it('shows inline validation and never calls the API for empty fields', async () => {
    const user = userEvent.setup();
    await renderWithAuthRouter(<LoginForm />);

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('flags an incomplete email before submitting', async () => {
    const user = userEvent.setup();
    await renderWithAuthRouter(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'kwame@');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('That email address does not look complete.')).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('signs in, stores the session and calls onSuccess', async () => {
    mocks.login.mockResolvedValue(makeAuthResponse());
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    await renderWithAuthRouter(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText('Email'), '  Kwame@UbuntuTales.local ');
    await user.type(screen.getByLabelText('Password'), 'ubuntu-tales-dev');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith({
        email: 'kwame@ubuntutales.local',
        password: 'ubuntu-tales-dev',
      }),
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(useSessionStore.getState().user?.email).toBe('kwame@ubuntutales.local');
  });

  it('maps invalid credentials to one calm sentence, not field noise', async () => {
    mocks.login.mockRejectedValue(invalidCredentials());
    const user = userEvent.setup();
    await renderWithAuthRouter(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'kwame@ubuntutales.local');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/email and password don't match/i);
    expect(useSessionStore.getState().status).toBe('guest');
  });

  it('disables the form while a sign-in is in flight', async () => {
    let resolveLogin: (value: ReturnType<typeof makeAuthResponse>) => void = () => undefined;
    mocks.login.mockImplementation(
      () => new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    const user = userEvent.setup();
    await renderWithAuthRouter(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'kwame@ubuntutales.local');
    await user.type(screen.getByLabelText('Password'), 'ubuntu-tales-dev');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const pendingButton = await screen.findByRole('button', { name: 'Signing in…' });
    expect(pendingButton).toBeDisabled();

    resolveLogin(makeAuthResponse());
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Signing in…' })).not.toBeInTheDocument());
  });

  it('offers one-click seeded accounts in DEV', async () => {
    mocks.login.mockResolvedValue(makeAuthResponse());
    const user = userEvent.setup();
    await renderWithAuthRouter(<LoginForm />);

    const seed = DEV_SEED_USERS[0];
    if (!seed) throw new Error('DEV seed users are only defined in development');
    await user.click(screen.getByRole('button', { name: seed.label }));

    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith({
        email: seed.email,
        password: DEV_SEED_PASSWORD,
      }),
    );
  });
});
