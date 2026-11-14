import { Body, Controller, Get, HttpCode, Patch, Post, Put, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OkResponse, UserMe } from '@ubuntu-tales/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/auth/auth.decorators';
import type { AuthenticatedUser, RequestMeta } from '../../common/auth/auth.types';
import { TokenService } from '../auth/token.service';
import { writeRefreshCookie } from '../auth/cookies';
import { ChangePasswordDto, UpdateMeDto } from './users.dto';
import { UsersService } from './users.service';

/** `/me` (production plan 03 §2.3) — all routes require a valid access token. */
@Controller('me')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserMe> {
    return this.users.getMe(user.id);
  }

  @Patch()
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeDto,
  ): Promise<UserMe> {
    return this.users.updateMe(user.id, dto);
  }

  @Post('onboarding/complete')
  @HttpCode(200)
  completeOnboarding(@CurrentUser() user: AuthenticatedUser): Promise<UserMe> {
    return this.users.completeOnboarding(user.id);
  }

  /**
   * Changing the password signs out every other device and rotates this device's refresh cookie, so
   * the caller stays signed in (the old access token is invalidated by the `sv` bump).
   */
  @Put('password')
  @HttpCode(200)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<OkResponse> {
    const session = await this.users.changePassword(user.id, dto, this.meta(request));
    writeRefreshCookie(reply, session.refreshToken, {
      secure: this.config.get<boolean>('COOKIE_SECURE') === true,
      maxAgeSeconds: this.tokens.refreshTtlSeconds,
    });
    return { ok: true };
  }

  private meta(request: FastifyRequest): RequestMeta {
    const rawAgent = request.headers['user-agent'];
    const userAgent = Array.isArray(rawAgent) ? rawAgent[0] : rawAgent;
    return {
      ...(userAgent ? { userAgent } : {}),
      ...(request.ip ? { ip: request.ip } : {}),
    };
  }
}
