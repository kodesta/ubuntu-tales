import { Controller, Delete, Get, HttpCode, Param, Put, Query } from '@nestjs/common';
import type { OkResponse, Paginated, SavedStoryItem } from '@ubuntu-tales/shared';
import { CurrentUser } from '../../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { parseCursor, parseLimit, type RawQuery } from '../../common/http/query-params';
import { parseSavedFilter } from './activity.dto';
import { SavedService } from './saved.service';

/** `GET/PUT/DELETE /me/saved` — the personal reading list (production plan 03 §2.7). */
@Controller('me/saved')
export class SavedController {
  constructor(private readonly saved: SavedService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RawQuery,
  ): Promise<Paginated<SavedStoryItem>> {
    return this.saved.list(user.id, {
      filter: parseSavedFilter(query.filter),
      limit: parseLimit(query.limit),
      cursor: parseCursor(query.cursor),
      ...(typeof query.deviceId === 'string' ? { deviceId: query.deviceId } : {}),
    });
  }

  @Put(':storyId')
  @HttpCode(200)
  save(@CurrentUser() user: AuthenticatedUser, @Param('storyId') storyId: string): Promise<OkResponse> {
    return this.saved.save(user.id, storyId);
  }

  @Delete(':storyId')
  @HttpCode(200)
  unsave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storyId') storyId: string,
  ): Promise<OkResponse> {
    return this.saved.unsave(user.id, storyId);
  }
}
