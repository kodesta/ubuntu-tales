import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply } from 'fastify';
import { Observable } from 'rxjs';
import { CACHEABLE_PUBLIC_KEY } from './cacheable-public.decorator';

export const PUBLIC_CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300';

/**
 * Adds the public catalogue cache header so Caddy/Cloudflare can serve repeated reads from the
 * edge for 60 seconds while revalidating in the background (production plan 03 §1).
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const cacheable = this.reflector.getAllAndOverride<boolean>(CACHEABLE_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      const request = context.switchToHttp().getRequest<{ method: string }>();
      if (cacheable && request.method === 'GET') {
        const reply = context.switchToHttp().getResponse<FastifyReply>();
        reply.header('Cache-Control', PUBLIC_CACHE_CONTROL);
      }
    }

    return next.handle();
  }
}
