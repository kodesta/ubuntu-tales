import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser, OptionalAuth } from '../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../common/auth/auth.types';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { parseAuthorListQuery, type RawQuery } from '../common/http/query-params';
import { AuthorsService } from './authors.service';

@Controller('authors')
@CacheablePublic()
@OptionalAuth()
export class AuthorsController {
  constructor(private readonly authors: AuthorsService) {}

  @Get()
  list(@Query() query: RawQuery) {
    return this.authors.list(parseAuthorListQuery(query));
  }

  @Get(':slug')
  detail(@Param('slug') slug: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.authors.getDetail(slug, user?.id);
  }
}
