import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CatalogueModule } from './catalogue/catalogue.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { CacheControlInterceptor } from './common/http/cache-control.interceptor';
import { ProblemDetailsFilter } from './common/errors/problem-details.filter';
import { validateEnv } from './config/env.schema';
import { PrismaModule } from './infra/prisma/prisma.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { PublicConfigModule } from './modules/public-config/public-config.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Works from `apps/api` (pnpm dev/start) and from the repository root.
      envFilePath: ['../../.env', '.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    // AuthModule registers JwtModule globally; keep it before the global guards resolve.
    AuthModule,
    UsersModule,
    CatalogueModule,
    ActivityModule,
    HealthModule,
    PublicConfigModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
    // Global guards run in registration order: authenticate first, then authorise by role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
