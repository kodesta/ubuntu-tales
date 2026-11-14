import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { CatalogueModule } from './catalogue/catalogue.module';
import { CacheControlInterceptor } from './common/http/cache-control.interceptor';
import { ProblemDetailsFilter } from './common/errors/problem-details.filter';
import { validateEnv } from './config/env.schema';
import { PrismaModule } from './infra/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { PublicConfigModule } from './modules/public-config/public-config.module';

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
    CatalogueModule,
    HealthModule,
    PublicConfigModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
  ],
})
export class AppModule {}
