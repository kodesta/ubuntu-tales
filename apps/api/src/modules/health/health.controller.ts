import { Controller, Get, Logger, Res } from '@nestjs/common';
import { Public } from '../../common/auth/auth.decorators';
import { Prisma } from '@ubuntu-tales/db';
import type { FastifyReply } from 'fastify';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Controller('health')
@Public()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up. No dependencies are checked. */
  @Get('live')
  live() {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness: the API can serve catalogue traffic (database reachable). */
  @Get('ready')
  async ready(@Res({ passthrough: true }) reply: FastifyReply) {
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
      return {
        status: 'ok',
        checks: { database: 'up' },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        'Readiness check failed: database unreachable',
        error instanceof Error ? error.stack : String(error),
      );
      reply.status(503);
      return {
        status: 'error',
        checks: { database: 'down' },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
