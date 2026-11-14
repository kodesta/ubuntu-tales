import { Controller, Get, Query } from '@nestjs/common';
import { CacheablePublic } from '../common/http/cacheable-public.decorator';
import { parseStoryListQuery, type RawQuery } from '../common/http/query-params';
import { StoriesService } from './stories.service';

@Controller('library')
@CacheablePublic()
export class LibraryController {
  constructor(private readonly stories: StoriesService) {}

  /** "Stories" tab of the archive — the catalogue sorted by title. */
  @Get('stories')
  listStories(@Query() query: RawQuery) {
    const params = parseStoryListQuery(query);
    return this.stories.listLibrary({
      q: params.q,
      tribe: params.tribe,
      category: params.category,
      limit: params.limit,
      cursor: params.cursor,
    });
  }

  /** "Audio" tab — empty until narrations arrive in Phase 3. */
  @Get('audio')
  listAudio() {
    return this.stories.listAudio();
  }
}
