import { describe, expect, it } from 'vitest';
import { hibpRangePrefix, hibpRangeSuffix, parseHibpRangeResponse, sha1Hex } from './hibp';

describe('sha1Hex', () => {
  it('matches the well-known SHA-1 for "password"', () => {
    expect(sha1Hex('password')).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });

  it('splits into the k-anonymity prefix (5 chars) and suffix', () => {
    const sha1 = sha1Hex('password');
    expect(hibpRangePrefix(sha1)).toBe('5BAA6');
    expect(hibpRangeSuffix(sha1)).toBe('1E4C9B93F3F0682250B6CF8331B7EE68FD8');
    expect(hibpRangePrefix(sha1).length + hibpRangeSuffix(sha1).length).toBe(sha1.length);
  });
});

describe('parseHibpRangeResponse', () => {
  const suffix = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

  it('detects a breached password suffix (case-insensitive)', () => {
    const body = [
      '0018A45C4D1DEF81644B54AB7F969B88D65:1',
      `${suffix}:3303003`,
      '00D4F6E8FA6EECAD2A3AA415EEC418D38EC:2',
      'PADDING:0',
    ].join('\r\n');
    expect(parseHibpRangeResponse(body, suffix)).toBe(true);
    expect(parseHibpRangeResponse(body, suffix.toLowerCase())).toBe(true);
  });

  it('returns false for padding/zero-count or absent suffixes', () => {
    expect(parseHibpRangeResponse('AAAA:0', 'AAAA')).toBe(false);
    expect(parseHibpRangeResponse('BBBB:12', 'AAAA')).toBe(false);
    expect(parseHibpRangeResponse('', suffix)).toBe(false);
    expect(parseHibpRangeResponse('garbage-without-colon', 'GARBAGE-WITHOUT-COLON')).toBe(false);
  });
});
