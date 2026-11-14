import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, OptionalAuth } from '../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../common/auth/auth.types';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { readString } from '../common/http/query-params';
import { HomeService } from './home.service';

@Controller('home')
@CacheablePublic()
@OptionalAuth()
export class HomeController {
  constructor(private readonly home: HomeService) {}

  /**
   * `?tribe=<slug>` personalises the feed for a guest's chosen roots (Phase 1 local storage). When a
   * bearer token is present the account's tribe wins over the query parameter.
   */
  @Get()
  getHome(@Query('tribe') tribe?: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.home.getHome({
      tribeSlug: readString(tribe),
      accountTribeId: user?.tribeId ?? null,
      viewerId: user?.id,
    });
  }
}
