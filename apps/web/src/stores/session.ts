import type { AuthResponse, LoginInput, RegisterInput, UserMe } from '@ubuntu-tales/shared';
import { create } from 'zustand';

import { api } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { setAccessToken, setRefreshHandler } from '@/lib/session-token';

export type SessionStatus = 'unknown' | 'authenticated' | 'guest';

interface SessionState {
  user: UserMe | null;
  status: SessionStatus;
  accessToken: string | null;
  /** Resolves after the first boot refresh attempt (success or failure). */
  bootPromise: Promise<void> | null;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
  updateUser: (user: UserMe) => void;
  login: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  refresh: () => Promise<string | null>;
  boot: () => Promise<void>;
  logout: () => Promise<void>;
  /** Revokes every refresh token for the user (settings "sign out everywhere"). */
  logoutAll: () => Promise<void>;
}

let inFlightRefresh: Promise<string | null> | null = null;

/**
 * Client session state (Phase 2). The access token and user snapshot live in memory only; the
 * rotating refresh token is an httpOnly cookie, so a reload restores the session through `boot()`.
 */
export const useSessionStore = create<SessionState>()((set, get) => ({
  user: null,
  status: 'unknown',
  accessToken: null,
  bootPromise: null,

  setAuth: (auth) => {
    setAccessToken(auth.accessToken);
    set({ user: auth.user, accessToken: auth.accessToken, status: 'authenticated' });
    // Catalogue responses carry per-viewer overlays; drop guest-era cache entries.
    void queryClient.clear();
  },

  clearAuth: () => {
    setAccessToken(null);
    set({ user: null, accessToken: null, status: 'guest' });
    void queryClient.clear();
  },

  updateUser: (user) => set({ user }),

  login: async (input) => {
    const auth = await api.auth.login(input);
    get().setAuth(auth);
    return auth;
  },

  register: async (input) => {
    const auth = await api.auth.register(input);
    get().setAuth(auth);
    return auth;
  },

  refresh: async () => {
    if (inFlightRefresh) return inFlightRefresh;

    inFlightRefresh = (async () => {
      try {
        const auth = await api.auth.refresh();
        get().setAuth(auth);
        return auth.accessToken;
      } catch {
        get().clearAuth();
        return null;
      } finally {
        inFlightRefresh = null;
      }
    })();

    return inFlightRefresh;
  },

  boot: async () => {
    const existing = get().bootPromise;
    if (existing) return existing;

    const promise = (async () => {
      await get().refresh();
      if (get().status === 'unknown') set({ status: 'guest' });
    })();

    set({ bootPromise: promise });
    return promise;
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // A dead session is fine; clear locally regardless.
    } finally {
      get().clearAuth();
    }
  },

  logoutAll: async () => {
    try {
      await api.auth.logoutAll();
    } catch {
      // Even if the server call fails, the local session should not outlive the intent.
    } finally {
      get().clearAuth();
    }
  },
}));

// Wire the API client's 401 hook to the store's single-flight refresh.
setRefreshHandler(() => useSessionStore.getState().refresh());

export function useIsAuthenticated(): boolean {
  return useSessionStore((state) => state.status === 'authenticated');
}

export function useCurrentUser(): UserMe | null {
  return useSessionStore((state) => state.user);
}
