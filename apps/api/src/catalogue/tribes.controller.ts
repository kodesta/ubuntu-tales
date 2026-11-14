import { Controller, Get, Param, Query } from '@nestjs/common';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { parseRegion, readString, type RawQuery } from '../common/http/query-params';
import { TribesService } from './tribes.service';

@Controller('tribes')
@CacheablePublic()
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
  detail(@Param('slug') slug: string) {
    return this.tribes.getDetail(slug);
  }
}
