import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, OptionalAuth } from '../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../common/auth/auth.types';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { parseStoryListQuery, type RawQuery } from '../common/http/query-params';
import { StoriesService } from './stories.service';

@Controller('library')
@CacheablePublic()
@OptionalAuth()
export class LibraryController {
  constructor(private readonly stories: StoriesService) {}

  /** "Stories" tab of the archive — the catalogue sorted by title. */
  @Get('stories')
  listStories(@Query() query: RawQuery, @CurrentUser() user?: AuthenticatedUser) {
    const params = parseStoryListQuery(query);
    return this.stories.listLibrary(
      {
        q: params.q,
        tribe: params.tribe,
        category: params.category,
        limit: params.limit,
        cursor: params.cursor,
      },
      user?.id,
    );
  }

  /** "Audio" tab — every tale with a published narration (Phase 3). */
  @Get('audio')
  listAudio(@Query() query: RawQuery, @CurrentUser() user?: AuthenticatedUser) {
    const params = parseStoryListQuery(query);
    return this.stories.listAudio(
      {
        q: params.q,
        tribe: params.tribe,
        category: params.category,
        limit: params.limit,
        cursor: params.cursor,
      },
      user?.id,
    );
  }
}
