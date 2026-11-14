import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccessToken } from '@/lib/session-token';

import { makeAuthResponse, makeUser, resetSessionStore } from '@/features/auth/test-utils';

import { useSessionStore } from './session';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
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
    },
  };
});

beforeEach(() => {
  resetSessionStore();
  mocks.login.mockReset();
  mocks.register.mockReset();
  mocks.refresh.mockReset();
  mocks.logout.mockReset();
  mocks.logoutAll.mockReset();
});

describe('session store transitions', () => {
  it('starts in the unknown state so callers can show a boot skeleton', () => {
    expect(useSessionStore.getState().status).toBe('unknown');
    expect(useSessionStore.getState().user).toBeNull();
  });

  it('boots into a guest session when the refresh cookie is absent', async () => {
    mocks.refresh.mockRejectedValue(new Error('no refresh cookie'));

    await useSessionStore.getState().boot();

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe('guest');
    expect(useSessionStore.getState().user).toBeNull();
  });

  it('boots into an authenticated session and keeps the access token in memory', async () => {
    mocks.refresh.mockResolvedValue(makeAuthResponse());

    await useSessionStore.getState().boot();

    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(useSessionStore.getState().user?.displayName).toBe('Kwame Mensah');
    expect(getAccessToken()).toBe('test-access-token');
  });

  it('only runs one boot/refresh at a time', async () => {
    let resolveRefresh: (value: ReturnType<typeof makeAuthResponse>) => void = () => undefined;
    mocks.refresh.mockImplementation(
      () => new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const first = useSessionStore.getState().boot();
    const second = useSessionStore.getState().boot();
    resolveRefresh(makeAuthResponse());
    await Promise.all([first, second]);

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe('authenticated');
  });

  it('logs in through the API and stores the session', async () => {
    mocks.login.mockResolvedValue(makeAuthResponse());

    const auth = await useSessionStore.getState().login({
      email: 'kwame@ubuntutales.local',
      password: 'ubuntu-tales-dev',
    });

    expect(mocks.login).toHaveBeenCalledWith({
      email: 'kwame@ubuntutales.local',
      password: 'ubuntu-tales-dev',
    });
    expect(auth.user.email).toBe('kwame@ubuntutales.local');
    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(useSessionStore.getState().accessToken).toBe('test-access-token');
    expect(getAccessToken()).toBe('test-access-token');
  });

  it('registers and stores the new session', async () => {
    mocks.register.mockResolvedValue(
      makeAuthResponse({ user: makeUser({ displayName: 'Amina Diallo', emailVerified: false }) }),
    );

    await useSessionStore.getState().register({
      displayName: 'Amina Diallo',
      email: 'amina@ubuntutales.local',
      password: 'ubuntu-tales-dev',
      acceptTerms: true,
      acceptPrivacy: true,
      confirmAge13Plus: true,
    });

    expect(useSessionStore.getState().status).toBe('authenticated');
    expect(useSessionStore.getState().user?.emailVerified).toBe(false);
  });

  it('clears the session on logout even when the network call fails', async () => {
    mocks.refresh.mockResolvedValue(makeAuthResponse());
    await useSessionStore.getState().boot();
    mocks.logout.mockRejectedValue(new Error('offline'));

    await useSessionStore.getState().logout();

    expect(useSessionStore.getState().status).toBe('guest');
    expect(useSessionStore.getState().user).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('clears the session on sign-out-everywhere', async () => {
    mocks.refresh.mockResolvedValue(makeAuthResponse());
    await useSessionStore.getState().boot();
    mocks.logoutAll.mockResolvedValue({ ok: true });

    await useSessionStore.getState().logoutAll();

    expect(mocks.logoutAll).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe('guest');
    expect(getAccessToken()).toBeNull();
  });

  it('refreshes the user snapshot after profile edits', () => {
    const updated = makeUser({ displayName: 'Kwame Kofi Mensah' });

    useSessionStore.getState().updateUser(updated);

    expect(useSessionStore.getState().user).toBe(updated);
  });
});
