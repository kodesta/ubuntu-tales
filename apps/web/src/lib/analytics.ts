/**
 * Consent-gated product analytics (production plan 06 §11, 08 §3.5).
 *
 * No provider is bundled yet. The wrapper guarantees that nothing leaves the browser until the
 * reader opts in, and that events never carry personal data. Wiring PostHog later means filling in
 * `provider` in `configureAnalytics` — the call sites do not change.
 */

const CONSENT_KEY = 'ut.analyticsConsent';

export type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_completed'
  | 'tribe_selected'
  | 'story_opened'
  | 'story_listen_started'
  | 'story_completed'
  | 'reaction_set'
  | 'story_saved'
  | 'story_downloaded'
  | 'share_clicked'
  | 'submission_submitted'
  | 'signup_completed';

export type AnalyticsProperties = Record<string, string | number | boolean | null>;

interface AnalyticsProvider {
  capture: (event: AnalyticsEvent, properties: AnalyticsProperties) => void;
}

let provider: AnalyticsProvider | null = null;
let consent = false;

export function configureAnalytics(next: AnalyticsProvider): void {
  provider = next;
}

function readStoredConsent(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function initAnalytics(): void {
  consent = readStoredConsent();
}

export function setAnalyticsConsent(granted: boolean): void {
  consent = granted;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CONSENT_KEY, granted ? 'true' : 'false');
  }
  if (!granted) provider = null;
}

export function hasAnalyticsConsent(): boolean {
  return consent;
}

/** Tracks an event only after explicit consent; silently drops everything else. */
export function track(event: AnalyticsEvent, properties: AnalyticsProperties = {}): void {
  if (!consent || !provider) return;
  try {
    provider.capture(event, properties);
  } catch {
    // Analytics must never break the reading experience.
  }
}

initAnalytics();
