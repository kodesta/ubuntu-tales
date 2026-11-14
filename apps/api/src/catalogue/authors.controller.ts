import { Controller, Get, Param, Query } from '@nestjs/common';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { parseAuthorListQuery, type RawQuery } from '../common/http/query-params';
import { AuthorsService } from './authors.service';

@Controller('authors')
@CacheablePublic()
export class AuthorsController {
  constructor(private readonly authors: AuthorsService) {}

  @Get()
  list(@Query() query: RawQuery) {
    return this.authors.list(parseAuthorListQuery(query));
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.authors.getDetail(slug);
  }
}
