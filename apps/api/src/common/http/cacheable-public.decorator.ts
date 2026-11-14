import { SetMetadata } from '@nestjs/common';

export const CACHEABLE_PUBLIC_KEY = 'cacheable:public';

/**
 * Marks a controller (or route) as a public catalogue response. The global
 * `CacheControlInterceptor` adds the CDN-friendly `Cache-Control` header from production plan 03 §1.
 */
export const CacheablePublic = (): MethodDecorator & ClassDecorator =>
  SetMetadata(CACHEABLE_PUBLIC_KEY, true);
