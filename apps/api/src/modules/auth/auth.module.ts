import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { HibpService } from './hibp.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

/**
 * Authentication + account lifecycle. `JwtModule` is registered globally so the global
 * `JwtAuthGuard` can verify bearer tokens from any module without re-importing this one.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, PasswordService, HibpService, EmailService],
  exports: [AuthService, TokenService, PasswordService, EmailService],
})
export class AuthModule {}
