const STORAGE_KEY = 'ut.deviceId';

/** Stable per-browser id used for per-device downloads (production plan 02 §3 `Download.deviceId`). */
export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'server';
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing && existing.length <= 64) return existing;

  const random = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const id = `web-${random}`.slice(0, 64);
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}
