import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser, OptionalAuth } from '../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../common/auth/auth.types';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import type { RawQuery } from '../common/http/query-params';
import { parseStoryListQuery } from '../common/http/query-params';
import { StoriesService } from './stories.service';

@Controller('stories')
@CacheablePublic()
@OptionalAuth()
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  /** Declared before `:slug` so the static segments win. */
  @Get('search-suggestions')
  suggestions(@Query('q') q?: string) {
    return this.stories.getSuggestions(q ?? '');
  }

  @Get('story-of-the-day')
  storyOfTheDay(@CurrentUser() user?: AuthenticatedUser) {
    return this.stories.getStoryOfTheDay(user?.id);
  }

  @Get()
  list(@Query() query: RawQuery, @CurrentUser() user?: AuthenticatedUser) {
    return this.stories.list(parseStoryListQuery(query), user?.id);
  }

  @Get(':slug')
  detail(@Param('slug') slug: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.stories.getDetail(slug, user?.id);
  }

  @Get(':slug/recommendations')
  recommendations(@Param('slug') slug: string, @CurrentUser() user?: AuthenticatedUser) {
    return this.stories.getRecommendations(slug, { viewerId: user?.id });
  }
}
