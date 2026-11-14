import { Controller, Get, Param, Query } from '@nestjs/common';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import type { RawQuery } from '../common/http/query-params';
import { parseStoryListQuery } from '../common/http/query-params';
import { StoriesService } from './stories.service';

@Controller('stories')
@CacheablePublic()
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  /** Declared before `:slug` so the static segments win. */
  @Get('search-suggestions')
  suggestions(@Query('q') q?: string) {
    return this.stories.getSuggestions(q ?? '');
  }

  @Get('story-of-the-day')
  storyOfTheDay() {
    return this.stories.getStoryOfTheDay();
  }

  @Get()
  list(@Query() query: RawQuery) {
    return this.stories.list(parseStoryListQuery(query));
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.stories.getDetail(slug);
  }

  @Get(':slug/recommendations')
  recommendations(@Param('slug') slug: string) {
    return this.stories.getRecommendations(slug);
  }
}
