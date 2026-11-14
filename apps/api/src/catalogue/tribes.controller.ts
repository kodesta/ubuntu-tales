import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser, OptionalAuth } from '../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../common/auth/auth.types';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { parseRegion, readString, type RawQuery } from '../common/http/query-params';
import { TribesService } from './tribes.service';

@Controller('tribes')
@CacheablePublic()
@OptionalAuth()
export class TribesController {
  constructor(private readonly tribes: TribesService) {}

  @Get()
  list(@Query() query: RawQuery) {
    return this.tribes.list({
      q: readString(query.q),
      region: parseRegion(query.region),
    });
  }

  @Get(':slug')
  detail(@Param('slug') slug: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.tribes.getDetail(slug, user?.id);
  }
}
