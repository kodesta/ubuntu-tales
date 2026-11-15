import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type {
  CompleteResponse,
  ContinueReadingItem,
  Paginated,
  ProgressPutResponse,
} from '@ubuntu-tales/shared';
import { CurrentUser } from '../../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { parseCursor, parseLimit, type RawQuery } from '../../common/http/query-params';
import { ProgressInputDto, readTimezoneHeader } from './activity.dto';
import { ProgressService } from './progress.service';

/** `GET/PUT /me/progress` + `POST /me/progress/:storyId/complete` (plan 03 §2.7). */
@Controller('me/progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RawQuery,
  ): Promise<Paginated<ContinueReadingItem>> {
    return this.progress.list(user.id, {
      limit: parseLimit(query.limit),
      cursor: parseCursor(query.cursor),
    });
  }

  @Put(':storyId')
  @HttpCode(200)
  put(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storyId') storyId: string,
    @Body() body: ProgressInputDto,
    @Headers('x-timezone') timezone?: string,
  ): Promise<ProgressPutResponse> {
    return this.progress.put(user.id, storyId, body, readTimezoneHeader(timezone));
  }

  @Post(':storyId/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storyId') storyId: string,
    @Headers('x-timezone') timezone?: string,
  ): Promise<CompleteResponse> {
    return this.progress.complete(user.id, storyId, readTimezoneHeader(timezone));
  }
}
