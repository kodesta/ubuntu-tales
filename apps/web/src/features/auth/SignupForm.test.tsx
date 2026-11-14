import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@ubuntu-tales/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sampleTribe, sampleTribeTwo } from '@/test/fixtures';
import { useSessionStore } from '@/stores/session';

import { SignupForm } from './SignupForm';
import {
  makeAuthResponse,
  renderWithAuthRouter,
  resetSessionStore,
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

const PUBLIC_CONFIG = {
  appName: 'Ubuntu Tales',
  tagline: 'Stories your grandmother knew.',
  lowStoryThreshold: 5,
  supportedLocales: ['en'],
  reactions: [],
  communityRoles: [
    { value: 'STORYTELLER', label: 'Storyteller', description: 'Keeps the tales.' },
    { value: 'SEEKER', label: 'Seeker', description: 'Comes to listen.' },
  ],
} as const;

beforeEach(() => {
  resetSessionStore();
  useSessionStore.setState({ status: 'guest' });
  mocks.login.mockReset();
  mocks.register.mockReset();
  mocks.refresh.mockReset();
  mocks.getTribes.mockReset();
  mocks.getConfig.mockReset();
  mocks.getTribes.mockResolvedValue([sampleTribe, sampleTribeTwo]);
  mocks.getConfig.mockResolvedValue(PUBLIC_CONFIG);
});

/** Fills everything the happy path requires. */
async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Your name'), 'Thandiwe Nkosi');
  await user.type(screen.getByLabelText('Email'), 'Thandiwe@UbuntuTales.local');
  await user.type(screen.getByLabelText('Password'), 'ubuntu-tales-dev');
  await user.click(screen.getByLabelText('I am 13 or older.'));
  await user.click(screen.getByLabelText('I accept the terms of reading.'));
  await user.click(screen.getByLabelText('I accept the privacy policy.'));
}

describe('SignupForm', () => {
  it('requires name, email, password and every consent before calling the API', async () => {
    const user = userEvent.setup();
    await renderWithAuthRouter(<SignupForm />);

    await user.click(screen.getByRole('button', { name: 'Open my account' }));

    expect(await screen.findByText('Tell us the name the fire should call you.')).toBeInTheDocument();
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument();
    expect(screen.getByText('Choose a password.')).toBeInTheDocument();
    expect(screen.getByText('You need to be 13 or older to keep an account.')).toBeInTheDocument();
    expect(screen.getByText('Please accept the terms of reading.')).toBeInTheDocument();
    expect(screen.getByText('Please accept the privacy policy.')).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('submits a minimal, consented account without any lineage fields', async () => {
    mocks.register.mockResolvedValue(makeAuthResponse());
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    await renderWithAuthRouter(<SignupForm onSuccess={onSuccess} />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Open my account' }));

    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
    expect(mocks.register).toHaveBeenCalledWith({
      displayName: 'Thandiwe Nkosi',
      email: 'thandiwe@ubuntutales.local',
      password: 'ubuntu-tales-dev',
      acceptTerms: true,
      acceptPrivacy: true,
      confirmAge13Plus: true,
    });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(useSessionStore.getState().status).toBe('authenticated');
  });

  it('sends the chosen publication with explicit lineage consent', async () => {
    mocks.register.mockResolvedValue(makeAuthResponse());
    const user = userEvent.setup();
    await renderWithAuthRouter(<SignupForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByLabelText(/Share your roots to personalise stories/));

    const publication = await screen.findByLabelText(/Your publication/);
    await user.selectOptions(publication, sampleTribe.id);
    await user.click(screen.getByRole('button', { name: 'Open my account' }));

    await waitFor(() =>
      expect(mocks.register).toHaveBeenCalledWith(
        expect.objectContaining({
          consentLineagePersonalisation: true,
          tribeId: sampleTribe.id,
        }),
      ),
    );
    expect(mocks.register.mock.calls[0]?.[0]).not.toHaveProperty('customLineage');
  });

  it('uses a written lineage instead of the publication', async () => {
    mocks.register.mockResolvedValue(makeAuthResponse());
    const user = userEvent.setup();
    await renderWithAuthRouter(<SignupForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByLabelText(/Share your roots to personalise stories/));
    const publication = await screen.findByLabelText(/Your publication/);
    await user.selectOptions(publication, sampleTribe.id);
    await user.type(screen.getByLabelText(/Or name your lineage/), 'Maasai, Kajiado');
    await user.click(screen.getByRole('button', { name: 'Open my account' }));

    await waitFor(() =>
      expect(mocks.register).toHaveBeenCalledWith(
        expect.objectContaining({
          consentLineagePersonalisation: true,
          customLineage: 'Maasai, Kajiado',
        }),
      ),
    );
    expect(mocks.register.mock.calls[0]?.[0]).not.toHaveProperty('tribeId');
  });

  it('surfaces an email that already has an account', async () => {
    mocks.register.mockRejectedValue(
      new ApiError(409, {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        detail: 'Email already registered',
        code: 'AUTH_EMAIL_TAKEN',
      }),
    );
    const user = userEvent.setup();
    await renderWithAuthRouter(<SignupForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Open my account' }));

    await waitFor(() => expect(screen.getAllByText(/already uses this email/i).length).toBeGreaterThan(0));
    expect(useSessionStore.getState().status).toBe('guest');
  });

  it('maps API field errors back onto the form', async () => {
    mocks.register.mockRejectedValue(
      new ApiError(400, {
        type: 'about:blank',
        title: 'Validation failed',
        status: 400,
        detail: 'Validation failed',
        code: 'VALIDATION_FAILED',
        errors: [{ field: 'displayName', message: 'That name is already taken by a griot.' }],
      }),
    );
    const user = userEvent.setup();
    await renderWithAuthRouter(<SignupForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Open my account' }));

    expect(await screen.findByText('That name is already taken by a griot.')).toBeInTheDocument();
  });
});
