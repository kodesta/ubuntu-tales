import { Controller, Get } from '@nestjs/common';
import type { ExploreResponse } from '@ubuntu-tales/shared';
import { Public } from '../common/auth/auth.decorators';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { ExploreService } from './explore.service';

@Controller('explore')
@Public()
@CacheablePublic()
export class ExploreController {
  constructor(private readonly explore: ExploreService) {}

  /** `GET /explore` — publications placed on the map with a taste of their tales. */
  @Get()
  getMap(): Promise<ExploreResponse> {
    return this.explore.getMap();
  }
}
