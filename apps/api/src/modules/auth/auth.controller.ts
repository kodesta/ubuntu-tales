import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES, type AuthResponse, type OkResponse, type VerifyEmailResponse } from '@ubuntu-tales/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser, Public } from '../../common/auth/auth.decorators';
import type { AuthenticatedUser, RequestMeta } from '../../common/auth/auth.types';
import { AppException } from '../../common/errors/app-exception';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '../users/users.dto';
import { AuthService, type AuthSession } from './auth.service';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_HEADER_NAME,
  REFRESH_HEADER_VALUE,
  buildClearRefreshCookieOptions,
  readRefreshCookie,
  writeRefreshCookie,
} from './cookies';
import { TokenService } from './token.service';

/** `POST /auth/*` — see production plan 03 §2.2 and the frozen `packages/api-client` contract. */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  async register(
    @Body() dto: RegisterDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponse> {
    const session = await this.auth.register(dto, this.meta(request));
    this.writeRefreshCookie(reply, session);
    return {
      accessToken: session.accessToken,
      user: session.user,
      ...(session.devEmailToken ? { devEmailToken: session.devEmailToken } : {}),
    };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponse> {
    const session = await this.auth.login(dto, this.meta(request));
    this.writeRefreshCookie(reply, session);
    return { accessToken: session.accessToken, user: session.user };
  }

  /** Rotates the refresh cookie. Requires `X-Requested-With: ubuntu-tales` (CSRF mitigation). */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthResponse> {
    const requestedWith = request.headers[REFRESH_HEADER_NAME];
    if (requestedWith !== REFRESH_HEADER_VALUE) {
      throw new AppException(
        ERROR_CODES.FORBIDDEN,
        403,
        `Refreshing a session requires the ${REFRESH_HEADER_NAME}: ${REFRESH_HEADER_VALUE} header.`,
      );
    }

    const session = await this.auth.refresh(readRefreshCookie(request), this.meta(request));
    this.writeRefreshCookie(reply, session);
    return { accessToken: session.accessToken, user: session.user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<OkResponse> {
    await this.auth.logout(readRefreshCookie(request));
    this.clearRefreshCookie(reply);
    return { ok: true };
  }

  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<OkResponse> {
    await this.auth.logoutAll(user.id);
    this.clearRefreshCookie(reply);
    return { ok: true };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<VerifyEmailResponse> {
    return this.auth.verifyEmail(dto);
  }

  /** Authenticated so the rate limit is attributable; 3 emails per hour per account. */
  @Post('verify-email/resend')
  @HttpCode(200)
  async resendVerification(@CurrentUser() user: AuthenticatedUser): Promise<OkResponse> {
    await this.auth.resendVerification(user.id);
    return { ok: true };
  }

  /** Always `202 Accepted` with `{ ok: true }` so the endpoint cannot enumerate accounts. */
  @Public()
  @Post('password/forgot')
  @HttpCode(202)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<OkResponse> {
    await this.auth.resetPassword(dto);
    return { ok: true };
  }

  // ───────────── Helpers ─────────────

  private meta(request: FastifyRequest): RequestMeta {
    const rawAgent = request.headers['user-agent'];
    const userAgent = Array.isArray(rawAgent) ? rawAgent[0] : rawAgent;
    return {
      ...(userAgent ? { userAgent } : {}),
      ...(request.ip ? { ip: request.ip } : {}),
    };
  }

  private writeRefreshCookie(reply: FastifyReply, session: AuthSession): void {
    writeRefreshCookie(reply, session.refreshToken, {
      secure: this.config.get<boolean>('COOKIE_SECURE') === true,
      maxAgeSeconds: this.tokens.refreshTtlSeconds,
    });
  }

  private clearRefreshCookie(reply: FastifyReply): void {
    reply.clearCookie(
      REFRESH_COOKIE_NAME,
      buildClearRefreshCookieOptions({
        secure: this.config.get<boolean>('COOKIE_SECURE') === true,
      }),
    );
  }
}
