import { Controller, Get, Query } from '@nestjs/common';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { readString } from '../common/http/query-params';
import { HomeService } from './home.service';

@Controller('home')
@CacheablePublic()
export class HomeController {
  constructor(private readonly home: HomeService) {}

  /** `?tribe=<slug>` personalises the feed for a guest's chosen roots (Phase 1 local storage). */
  @Get()
  getHome(@Query('tribe') tribe?: string) {
    return this.home.getHome(readString(tribe));
  }
}
