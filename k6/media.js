import http from 'k6/http';
import { check } from 'k6';

/**
 * Media delivery test: range requests for narration audio (production plan 09 §6).
 *   k6 run --env BASE=https://staging.ubuntutales.com k6/media.js
 */
export const options = {
  vus: 30,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400'],
  },
};

const BASE = __ENV.BASE || 'http://localhost:4100';
const AUDIO = '/media/narrations/when-the-chameleon-carried-the-word/aac_64k.m4a';

export default function () {
  const full = http.get(`${BASE}${AUDIO}`);
  check(full, { 'audio 200': (r) => r.status === 200 });

  const range = http.get(`${BASE}${AUDIO}`, { headers: { Range: 'bytes=0-16999' } });
  check(range, {
    'range 206': (r) => r.status === 206,
    'partial length': (r) => r.body.length === 17000,
  });
}
