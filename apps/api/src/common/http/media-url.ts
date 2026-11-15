/**
 * Resolves a stored media path to the URL the browser should request.
 *
 * Media (`/media/**`) is served by the API host, which may be a different subdomain from the web app
 * (e.g. talesapi.fabapi.xyz vs tales.fabapi.xyz). When `MEDIA_PUBLIC_BASE_URL` is set, root-relative
 * media paths become absolute so `<img>`, `<audio>` and offline caching work across origins. Other
 * root-relative assets (story covers under `/covers/`) stay relative because they belong to the web
 * origin.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (!url.startsWith('/media/')) return url;
  const base = process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, '');
  return base ? `${base}${url}` : url;
}
