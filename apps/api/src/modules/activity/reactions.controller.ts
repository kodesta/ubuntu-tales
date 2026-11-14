import { Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import type { ReactionSetResponse, ReactionSummary } from '@ubuntu-tales/shared';
import { CurrentUser, OptionalAuth } from '../../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { ReactionInputDto } from './activity.dto';
import { ReactionsService } from './reactions.service';

/** `PUT/DELETE /stories/:storyId/reactions` + public `GET .../summary` (plan 03 §2.7). */
@Controller('stories/:storyId/reactions')
export class ReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

  @Get('summary')
  @OptionalAuth()
  summary(
    @Param('storyId') storyId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ): Promise<ReactionSummary> {
    return this.reactions.summaryByRef(storyId, user?.id);
  }

  @Put()
  @HttpCode(200)
  set(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storyId') storyId: string,
    @Body() body: ReactionInputDto,
  ): Promise<ReactionSetResponse> {
    return this.reactions.set(user.id, storyId, body.type);
  }

  @Delete()
  @HttpCode(200)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storyId') storyId: string,
  ): Promise<ReactionSetResponse> {
    return this.reactions.remove(user.id, storyId);
  }
}
