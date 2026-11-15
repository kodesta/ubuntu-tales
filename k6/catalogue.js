import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Catalogue load test (production plan 09 §6). Run against staging sized like production:
 *   k6 run --env BASE=https://staging.ubuntutales.com k6/catalogue.js
 */
export const options = {
  scenarios: {
    readers: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '4m', target: 100 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200', 'p(99)<500'],
  },
};

const BASE = __ENV.BASE || 'http://localhost:4100';

export default function () {
  const paths = [
    '/api/v1/home',
    '/api/v1/tribes',
    '/api/v1/stories?limit=12',
    '/api/v1/stories/search-suggestions?q=baobab',
    '/api/v1/stories/when-the-chameleon-carried-the-word',
    '/api/v1/library/stories?limit=12',
  ];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const res = http.get(`${BASE}${path}`);
  check(res, {
    'status 200': (r) => r.status === 200,
    'json body': (r) => String(r.headers['Content-Type']).includes('application/json'),
  });
  sleep(0.5 + Math.random());
}
