import { describe, expect, it } from 'vitest';
import {
  extractBearerToken,
  hasRequiredRole,
  isAccessTokenPayload,
  isSessionCurrent,
  isTokenExpiredError,
  roleRank,
} from './auth.logic';

describe('role hierarchy', () => {
  it('ranks roles READER < CONTRIBUTOR < EDITOR < ADMIN', () => {
    expect(roleRank('READER')).toBe(1);
    expect(roleRank('CONTRIBUTOR')).toBe(2);
    expect(roleRank('EDITOR')).toBe(3);
    expect(roleRank('ADMIN')).toBe(4);
    expect(roleRank('UNKNOWN')).toBe(0);
    expect(roleRank(null)).toBe(0);
  });

  it('grants access when the user role meets any required role', () => {
    expect(hasRequiredRole('ADMIN', ['EDITOR'])).toBe(true);
    expect(hasRequiredRole('EDITOR', ['EDITOR'])).toBe(true);
    expect(hasRequiredRole('CONTRIBUTOR', ['EDITOR'])).toBe(false);
    expect(hasRequiredRole('READER', ['CONTRIBUTOR', 'EDITOR'])).toBe(false);
    expect(hasRequiredRole(undefined, [])).toBe(true);
  });
});

describe('extractBearerToken', () => {
  it('accepts a well-formed bearer header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('bearer abcdef')).toBe('abcdef');
  });

  it('rejects missing, empty and malformed headers', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('Bearer')).toBeNull();
    expect(extractBearerToken('Bearer   ')).toBeNull();
    expect(extractBearerToken('Bearer token with spaces')).toBeNull();
  });
});

describe('isAccessTokenPayload', () => {
  it('accepts a valid payload', () => {
    expect(isAccessTokenPayload({ sub: 'user-1', sv: 0, role: 'READER' })).toBe(true);
  });

  it('rejects payloads missing claims or with a bad role', () => {
    expect(isAccessTokenPayload(null)).toBe(false);
    expect(isAccessTokenPayload({ sub: 'user-1', role: 'READER' })).toBe(false);
    expect(isAccessTokenPayload({ sub: '', sv: 0, role: 'READER' })).toBe(false);
    expect(isAccessTokenPayload({ sub: 'user-1', sv: 0, role: 'SUPERUSER' })).toBe(false);
    expect(isAccessTokenPayload({ sub: 'user-1', sv: 1.5, role: 'READER' })).toBe(false);
  });
});

describe('isSessionCurrent', () => {
  it('requires ACTIVE status and a matching session version', () => {
    expect(isSessionCurrent({ sessionVersion: 2, status: 'ACTIVE' }, { sv: 2 })).toBe(true);
    expect(isSessionCurrent({ sessionVersion: 2, status: 'ACTIVE' }, { sv: 1 })).toBe(false);
    expect(isSessionCurrent({ sessionVersion: 2, status: 'SUSPENDED' }, { sv: 2 })).toBe(false);
    expect(isSessionCurrent({ sessionVersion: 2, status: 'DELETED' }, { sv: 2 })).toBe(false);
  });
});

describe('isTokenExpiredError', () => {
  it('detects jsonwebtoken TokenExpiredError by name only', () => {
    const expired = new Error('jwt expired');
    expired.name = 'TokenExpiredError';
    expect(isTokenExpiredError(expired)).toBe(true);
    expect(isTokenExpiredError(new Error('invalid signature'))).toBe(false);
    expect(isTokenExpiredError('jwt expired')).toBe(false);
  });
});
