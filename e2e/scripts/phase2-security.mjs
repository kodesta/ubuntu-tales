/**
 * Phase 2 security / session contract probe.
 *
 * Exercises the auth and personal-feature APIs the way an attacker (or a broken client) would:
 * cookie attributes, CSRF header requirement, refresh rotation + reuse detection, generic login
 * errors, protected endpoints, password-change/sign-out-everywhere invalidation, progress caps and
 * last-write-wins, completion idempotency, reaction totals, save idempotency, resend rate limit and
 * login lockout. Prints PASS/FAIL lines and exits non-zero on failure.
 *
 * Usage (from the repo root, API :4100 running and seeded):
 *   node e2e/scripts/phase2-security.mjs | tee docs/qa/phase2-security.log
 */

const API = process.env.API_URL ?? 'http://localhost:4100/api/v1';
const DEV_PASSWORD = 'ubuntu-tales-dev';
const SEED_EMAIL = 'kwame@ubuntutales.local';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ubuntutales.local`;
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  store(setCookies = []) {
    for (const cookie of setCookies) {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      if (index < 0) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      const maxAge = /Max-Age=(-?\d+)/i.exec(cookie);
      if (maxAge && Number(maxAge[1]) <= 0) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  header() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  has(name) {
    return this.cookies.has(name);
  }
}

async function request(path, { method = 'GET', body, token, jar, headers } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(jar && jar.header() ? { Cookie: jar.header() } : {}),
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : response.headers.get('set-cookie')
        ? [response.headers.get('set-cookie')]
        : [];
  jar?.store(setCookies);
  return { status: response.status, body: parsed, setCookies };
}

function refreshCookieAttributes(setCookies) {
  const cookie = setCookies.find((entry) => entry.startsWith('refresh_token='));
  if (!cookie) return {};
  return {
    raw: cookie,
    httpOnly: /HttpOnly/i.test(cookie),
    sameSite: /SameSite=Lax/i.test(cookie),
    path: /Path=\/api\/v1\/auth/i.test(cookie),
    maxAge: /Max-Age=(\d+)/i.exec(cookie)?.[1] ?? null,
    secure: /;\s*Secure/i.test(cookie),
  };
}

function decodeJwtPayload(token) {
  const part = token.split('.')[1];
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function registerUser({ verify = true } = {}) {
  const email = uniqueEmail('qa-security');
  const jar = new CookieJar();
  const response = await request('/auth/register', {
    method: 'POST',
    body: {
      displayName: 'Security QA',
      email,
      password: DEV_PASSWORD,
      acceptTerms: true,
      acceptPrivacy: true,
      confirmAge13Plus: true,
    },
    jar,
  });

  const account = {
    email,
    password: DEV_PASSWORD,
    jar,
    accessToken: response.body?.accessToken,
    refreshToken: response.setCookies.find((cookie) => cookie.startsWith('refresh_token=')),
    userId: response.body?.user?.id,
    devEmailToken: response.body?.devEmailToken,
    registerStatus: response.status,
    registerSetCookies: response.setCookies,
    registerResponseBody: response.body,
  };

  if (verify && account.devEmailToken) {
    const verified = await request('/auth/verify-email', {
      method: 'POST',
      body: { token: account.devEmailToken },
    });
    account.emailVerified = verified.status === 200;
  }

  return account;
}

async function loginSession(email, password = DEV_PASSWORD) {
  const jar = new CookieJar();
  const response = await request('/auth/login', { method: 'POST', body: { email, password }, jar });
  return {
    status: response.status,
    body: response.body,
    jar,
    accessToken: response.body?.accessToken,
    setCookies: response.setCookies,
    refreshCookie: response.setCookies.find((cookie) => cookie.startsWith('refresh_token=')),
  };
}

async function main() {
  console.log(`Ubuntu Tales Phase 2 security probe — ${API}`);
  console.log('--------------------------------------------------------------------');

  /* 1. Registration + cookie attributes ------------------------------------------------------- */
  const account = await registerUser();
  check('register returns 201', account.registerStatus === 201, `got ${account.registerStatus}`);
  check('register returns a devEmailToken outside production', Boolean(account.devEmailToken));
  check(
    'register response never contains a refresh token in the body',
    account.registerResponseBody &&
      !('refreshToken' in account.registerResponseBody) &&
      !('refresh_token' in account.registerResponseBody),
  );

  const attributes = refreshCookieAttributes(account.registerSetCookies);
  check('refresh cookie is httpOnly', attributes.httpOnly === true);
  check('refresh cookie is SameSite=Lax', attributes.sameSite === true);
  check('refresh cookie Path=/api/v1/auth', attributes.path === true);
  check(
    'refresh cookie Max-Age is 30 days',
    attributes.maxAge === '2592000',
    String(attributes.maxAge),
  );
  check(
    'refresh cookie Secure is off in local dev (COOKIE_SECURE=false)',
    attributes.secure === false,
  );

  /* 2. Duplicate registration + validation ---------------------------------------------------- */
  const duplicate = await request('/auth/register', {
    method: 'POST',
    body: {
      displayName: 'Security QA',
      email: account.email,
      password: DEV_PASSWORD,
      acceptTerms: true,
      acceptPrivacy: true,
      confirmAge13Plus: true,
    },
  });
  check(
    'duplicate email registration is 409 AUTH_EMAIL_TAKEN',
    duplicate.status === 409 && duplicate.body?.code === 'AUTH_EMAIL_TAKEN',
    `${duplicate.status} ${duplicate.body?.code}`,
  );

  const weakPassword = await request('/auth/register', {
    method: 'POST',
    body: {
      displayName: 'Security QA',
      email: uniqueEmail('qa-weak'),
      password: 'short',
      acceptTerms: true,
      acceptPrivacy: true,
      confirmAge13Plus: true,
    },
  });
  check(
    'weak password is rejected with VALIDATION_FAILED',
    weakPassword.status === 400 && weakPassword.body?.code === 'VALIDATION_FAILED',
    `${weakPassword.status} ${weakPassword.body?.code}`,
  );

  const noConsent = await request('/auth/register', {
    method: 'POST',
    body: {
      displayName: 'Security QA',
      email: uniqueEmail('qa-consent'),
      password: DEV_PASSWORD,
      acceptTerms: false,
      acceptPrivacy: false,
      confirmAge13Plus: false,
    },
  });
  check('missing consents are rejected', noConsent.status === 400, String(noConsent.status));

  /* 3. Login + tokens ------------------------------------------------------------------------- */
  const login = await loginSession(SEED_EMAIL);
  check('seeded dev login returns 200', login.status === 200);
  check(
    'login sets an httpOnly refresh cookie',
    refreshCookieAttributes(login.setCookies).httpOnly === true,
  );
  check(
    'login body contains only accessToken + user',
    login.body && Object.keys(login.body).sort().join(',') === 'accessToken,user',
    JSON.stringify(Object.keys(login.body ?? {})),
  );
  const payload = decodeJwtPayload(login.accessToken);
  check(
    'access token is an HS256 JWT with sub/sv/role claims',
    Boolean(payload?.sub && 'sv' in payload && payload.role),
    JSON.stringify(payload),
  );
  check(
    'access token is short-lived (15 min)',
    payload?.exp - payload?.iat === 900,
    String(payload?.exp - payload?.iat),
  );

  /* 4. Protected endpoints -------------------------------------------------------------------- */
  const me = await request('/me', { token: login.accessToken });
  check(
    'GET /me with bearer token is 200',
    me.status === 200 && typeof me.body?.email === 'string',
  );
  for (const [name, path, method] of [
    ['GET /me', '/me', 'GET'],
    ['GET /me/saved', '/me/saved', 'GET'],
    ['GET /me/progress', '/me/progress', 'GET'],
    ['PUT /me/saved/:id', '/me/saved/anything', 'PUT'],
    ['PUT reactions', '/stories/anything/reactions', 'PUT'],
    ['POST /auth/logout-all', '/auth/logout-all', 'POST'],
  ]) {
    const response = await request(path, { method });
    check(`${name} without a token is 401`, response.status === 401, String(response.status));
  }
  const cookieOnly = new CookieJar();
  cookieOnly.store(login.setCookies);
  const meByCookie = await request('/me', { jar: cookieOnly });
  check(
    'GET /me cannot use the refresh cookie as a bearer token',
    meByCookie.status === 401,
    String(meByCookie.status),
  );

  /* 5. Refresh: CSRF header + rotation + reuse detection -------------------------------------- */
  const noHeader = await request('/auth/refresh', { method: 'POST', jar: login.jar });
  check(
    'refresh without X-Requested-With is 403',
    noHeader.status === 403,
    String(noHeader.status),
  );
  const wrongHeader = await request('/auth/refresh', {
    method: 'POST',
    jar: login.jar,
    headers: { 'X-Requested-With': 'nope' },
  });
  check(
    'refresh with a wrong X-Requested-With is 403',
    wrongHeader.status === 403,
    String(wrongHeader.status),
  );

  const rotated = await request('/auth/refresh', {
    method: 'POST',
    jar: login.jar,
    headers: { 'X-Requested-With': 'ubuntu-tales' },
  });
  check(
    'refresh with the CSRF header rotates successfully',
    rotated.status === 200 && typeof rotated.body?.accessToken === 'string',
    String(rotated.status),
  );
  const rotatedCookie = rotated.setCookies.find((cookie) => cookie.startsWith('refresh_token='));
  check(
    'refresh rotates the cookie value',
    Boolean(rotatedCookie) && rotatedCookie !== login.refreshCookie,
  );

  // Replay the *old* cookie: the server must revoke the whole family.
  const replayJar = new CookieJar();
  replayJar.store([login.refreshCookie]);
  const replay = await request('/auth/refresh', {
    method: 'POST',
    jar: replayJar,
    headers: { 'X-Requested-With': 'ubuntu-tales' },
  });
  check(
    'reusing a rotated refresh token is 401 AUTH_REFRESH_REUSED',
    replay.status === 401 && replay.body?.code === 'AUTH_REFRESH_REUSED',
    `${replay.status} ${replay.body?.code}`,
  );
  const familyCheck = await request('/auth/refresh', {
    method: 'POST',
    jar: (() => {
      const jar = new CookieJar();
      jar.store([rotatedCookie]);
      return jar;
    })(),
    headers: { 'X-Requested-With': 'ubuntu-tales' },
  });
  check(
    'reuse detection revokes the rest of the token family',
    familyCheck.status === 401,
    String(familyCheck.status),
  );

  /* 6. Generic login errors ------------------------------------------------------------------- */
  const unknownEmail = await request('/auth/login', {
    method: 'POST',
    body: { email: uniqueEmail('qa-unknown'), password: DEV_PASSWORD },
  });
  const wrongPassword = await request('/auth/login', {
    method: 'POST',
    body: { email: SEED_EMAIL, password: 'definitely-wrong-password' },
  });
  check('unknown email login is 401', unknownEmail.status === 401);
  check('wrong password login is 401', wrongPassword.status === 401);
  check(
    'unknown email and wrong password are indistinguishable',
    unknownEmail.status === wrongPassword.status &&
      unknownEmail.body?.code === wrongPassword.body?.code &&
      unknownEmail.body?.detail === wrongPassword.body?.detail,
    `${unknownEmail.body?.detail} vs ${wrongPassword.body?.detail}`,
  );

  /* 7. Forgot/reset + verification tokens ----------------------------------------------------- */
  const knownForgot = await request('/auth/password/forgot', {
    method: 'POST',
    body: { email: account.email },
  });
  const unknownForgot = await request('/auth/password/forgot', {
    method: 'POST',
    body: { email: uniqueEmail('qa-forgot-unknown') },
  });
  check(
    'forgot password is always 202',
    knownForgot.status === 202 && unknownForgot.status === 202,
  );
  check(
    'forgot password for a known account returns a devResetToken',
    Boolean(knownForgot.body?.devResetToken),
  );
  check(
    'forgot password does not leak account existence in the body (ok only)',
    knownForgot.body?.ok === true && unknownForgot.body?.ok === true,
  );

  const badVerify = await request('/auth/verify-email', {
    method: 'POST',
    body: { token: 'not-a-real-token' },
  });
  check(
    'invalid verification token is 400 AUTH_INVALID_TOKEN',
    badVerify.status === 400 && badVerify.body?.code === 'AUTH_INVALID_TOKEN',
    `${badVerify.status} ${badVerify.body?.code}`,
  );

  /* 8. Password change + other-session invalidation ------------------------------------------- */
  const passwordAccount = await registerUser();
  const deviceA = await loginSession(passwordAccount.email);
  const deviceB = await loginSession(passwordAccount.email);
  const newPassword = 'qa-security-password-123';
  const change = await request('/me/password', {
    method: 'PUT',
    token: deviceA.accessToken,
    body: { currentPassword: DEV_PASSWORD, newPassword },
    jar: deviceA.jar,
  });
  check(
    'password change is 200',
    change.status === 200,
    `${change.status} ${JSON.stringify(change.body)}`,
  );
  const oldToken = await request('/me', { token: deviceA.accessToken });
  check(
    'password change invalidates the old access token (sv bump)',
    oldToken.status === 401,
    String(oldToken.status),
  );
  const deviceBRefresh = await request('/auth/refresh', {
    method: 'POST',
    jar: deviceB.jar,
    headers: { 'X-Requested-With': 'ubuntu-tales' },
  });
  check(
    'password change revokes other refresh families',
    deviceBRefresh.status === 401,
    String(deviceBRefresh.status),
  );
  const deviceARefresh = await request('/auth/refresh', {
    method: 'POST',
    jar: deviceA.jar,
    headers: { 'X-Requested-With': 'ubuntu-tales' },
  });
  check(
    'password change keeps the current device signed in with a fresh cookie',
    deviceARefresh.status === 200,
    String(deviceARefresh.status),
  );

  const wrongCurrent = await request('/me/password', {
    method: 'PUT',
    token: deviceARefresh.body?.accessToken,
    body: { currentPassword: 'wrong-current-password', newPassword: 'another-password-123' },
  });
  check(
    'wrong current password is rejected with a field error',
    wrongCurrent.status === 400 && wrongCurrent.body?.errors?.[0]?.field === 'currentPassword',
    `${wrongCurrent.status} ${JSON.stringify(wrongCurrent.body?.errors)}`,
  );

  const logoutAll = await request('/auth/logout-all', {
    method: 'POST',
    token: deviceARefresh.body?.accessToken,
    jar: deviceA.jar,
  });
  check('sign-out-everywhere is 200', logoutAll.status === 200);
  const afterLogoutAll = await request('/auth/refresh', {
    method: 'POST',
    jar: deviceA.jar,
    headers: { 'X-Requested-With': 'ubuntu-tales' },
  });
  check(
    'sign-out-everywhere revokes the current session too',
    afterLogoutAll.status === 401,
    String(afterLogoutAll.status),
  );

  /* 9. Progress: caps, LWW, auto-completion --------------------------------------------------- */
  const personal = await registerUser();
  const stories = await request('/stories?limit=3');
  const [storyOne, storyTwo] = stories.body.items;

  const putProgress = (storyId, percent, clientUpdatedAt) =>
    request(`/me/progress/${storyId}`, {
      method: 'PUT',
      token: personal.accessToken,
      body: { percent, audioPositionMs: 0, listenedDeltaSec: 0, clientUpdatedAt },
    });

  const firstWrite = await putProgress(storyOne.id, 25, '2026-11-15T00:00:00.000Z');
  check(
    'progress write is 200 with percent',
    firstWrite.status === 200 && firstWrite.body?.progress?.percent === 25,
    `${firstWrite.status} ${firstWrite.body?.progress?.percent}`,
  );
  const olderWrite = await putProgress(storyOne.id, 5, '2026-11-14T00:00:00.000Z');
  check(
    'older clientUpdatedAt is ignored (last-write-wins)',
    olderWrite.body?.progress?.percent === 25,
    String(olderWrite.body?.progress?.percent),
  );
  const overCap = await putProgress(storyOne.id, 130, new Date().toISOString());
  check(
    'percent above 100 is rejected',
    overCap.status === 400 && overCap.body?.code === 'VALIDATION_FAILED',
    String(overCap.status),
  );
  const underCap = await putProgress(storyOne.id, -4, new Date().toISOString());
  check(
    'negative percent is rejected',
    underCap.status === 400 && underCap.body?.code === 'VALIDATION_FAILED',
    String(underCap.status),
  );

  const autoComplete = await putProgress(storyTwo.id, 96, new Date().toISOString());
  check(
    'progress ≥95% auto-completes the tale',
    autoComplete.status === 200 && autoComplete.body?.progress?.completed === true,
    JSON.stringify(autoComplete.body?.progress),
  );
  check(
    'auto-completion increments talesRead once',
    autoComplete.body?.stats?.talesRead === 1,
    JSON.stringify(autoComplete.body?.stats),
  );

  const completeAgain = await request(`/me/progress/${storyTwo.id}/complete`, {
    method: 'POST',
    token: personal.accessToken,
  });
  check(
    'explicit complete is idempotent (stats unchanged)',
    completeAgain.status === 200 && completeAgain.body?.stats?.talesRead === 1,
    JSON.stringify(completeAgain.body?.stats),
  );
  check(
    'completion returns recommendations',
    Array.isArray(completeAgain.body?.recommendations) &&
      completeAgain.body.recommendations.length > 0,
  );

  /* 10. Reactions: totals and validation ------------------------------------------------------ */
  const summaryBefore = await request(`/stories/${storyOne.id}/reactions/summary`);
  const beforeTotal = summaryBefore.body?.total ?? 0;
  const setReaction = await request(`/stories/${storyOne.id}/reactions`, {
    method: 'PUT',
    token: personal.accessToken,
    body: { type: 'JOY' },
  });
  check('reaction write is 200', setReaction.status === 200);
  check('reaction increases total by one', setReaction.body?.summary?.total === beforeTotal + 1);
  const switched = await request(`/stories/${storyOne.id}/reactions`, {
    method: 'PUT',
    token: personal.accessToken,
    body: { type: 'GREAT' },
  });
  check(
    'switching reactions keeps total stable',
    switched.body?.summary?.total === beforeTotal + 1,
    String(switched.body?.summary?.total),
  );
  check('reaction counts move to the new emotion', switched.body?.summary?.counts?.GREAT >= 1);
  const invalidReaction = await request(`/stories/${storyOne.id}/reactions`, {
    method: 'PUT',
    token: personal.accessToken,
    body: { type: 'LOVE' },
  });
  check(
    'invalid reaction type is 400',
    invalidReaction.status === 400,
    String(invalidReaction.status),
  );
  const publicSummary = await request(`/stories/${storyOne.id}/reactions/summary`);
  check(
    'public reaction summary exposes counts but no viewer identity',
    publicSummary.body?.total != null && !('viewer' in (publicSummary.body ?? {})),
    JSON.stringify(publicSummary.body),
  );

  /* 11. Saved idempotency --------------------------------------------------------------------- */
  const saveOne = await request(`/me/saved/${storyOne.id}`, {
    method: 'PUT',
    token: personal.accessToken,
  });
  const saveTwo = await request(`/me/saved/${storyOne.id}`, {
    method: 'PUT',
    token: personal.accessToken,
  });
  check('saving a tale is idempotent', saveOne.status === 200 && saveTwo.status === 200);
  const savedList = await request('/me/saved?limit=50', { token: personal.accessToken });
  check(
    'saved list returns the tale with account progress fields',
    savedList.body?.items?.some((item) => item.id === storyOne.id && 'progressPercent' in item),
  );
  const unsave = await request(`/me/saved/${storyOne.id}`, {
    method: 'DELETE',
    token: personal.accessToken,
  });
  const savedAfter = await request('/me/saved?limit=50', { token: personal.accessToken });
  check(
    'unsave removes the tale from the account list',
    unsave.status === 200 && !savedAfter.body?.items?.some((item) => item.id === storyOne.id),
  );

  /* 12. Resend rate limit (3/hour) ------------------------------------------------------------ */
  const unverified = await registerUser({ verify: false });
  const resendStatuses = [];
  for (let index = 0; index < 4; index += 1) {
    const resend = await request('/auth/verify-email/resend', {
      method: 'POST',
      token: unverified.accessToken,
    });
    resendStatuses.push(resend.status);
  }
  check(
    'resend allows three letters then rate-limits',
    resendStatuses.slice(0, 3).every((status) => status === 200) && resendStatuses[3] === 429,
    `statuses ${resendStatuses.join(',')}`,
  );

  /* 13. Login lockout (10 failures / 15 min) -------------------------------------------------- */
  const lockEmail = uniqueEmail('qa-lockout');
  let lockedStatus = 0;
  let lockedCode = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await request('/auth/login', {
      method: 'POST',
      body: { email: lockEmail, password: 'wrong-password' },
    });
    if (response.status === 429) {
      lockedStatus = response.status;
      lockedCode = response.body?.code;
      break;
    }
  }
  check(
    'repeated failed logins trigger the lockout (429 AUTH_ACCOUNT_LOCKED)',
    lockedStatus === 429 && lockedCode === 'AUTH_ACCOUNT_LOCKED',
    `${lockedStatus} ${lockedCode}`,
  );

  console.log('--------------------------------------------------------------------');
  console.log(`PASS=${passed} FAIL=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

await main();
