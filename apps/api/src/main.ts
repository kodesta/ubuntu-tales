import 'reflect-metadata';
import fastifyCookie from '@fastify/cookie';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation/validation.pipe';

/**
 * CORS without an extra runtime dependency: the Fastify adapter does not enable CORS on its own
 * (that would require @fastify/cors). Public GETs are credential-less, so a simple origin echo plus
 * preflight handling is sufficient for this read-path slice.
 */
function configureCors(fastify: FastifyInstance, allowedOrigins: string[]): void {
  fastify.addHook('onRequest', (request, reply, done) => {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
      // Cookies are httpOnly and scoped to /api/v1/auth; only allowlisted origins get credentials.
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header('Vary', 'Origin');
    }

    if (request.method === 'OPTIONS') {
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      reply.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, Authorization, X-Requested-With',
      );
      reply.header('Access-Control-Max-Age', '86400');
      reply.code(204).send();
      return;
    }

    done();
  });
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
  );

  const config = app.get(ConfigService);
  const host = config.getOrThrow<string>('API_HOST');
  const port = config.getOrThrow<number>('API_PORT');
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN');
  const allowedOrigins = webOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.setGlobalPrefix('api/v1');

  // Public media (processed renditions, seeded demo narration audio, soundscapes) is served
  // read-only from MEDIA_ROOT with HTTP Range support so audio seeking works (plan 04 §6).
  const repoRoot = path.resolve(__dirname, '../../..');
  const configuredRoot = process.env.MEDIA_ROOT ?? 'var/media';
  const mediaRoot = path.isAbsolute(configuredRoot)
    ? configuredRoot
    : path.resolve(repoRoot, configuredRoot);
  await app.register(fastifyStatic, {
    root: path.join(mediaRoot),
    prefix: '/media/',
    decorateReply: false,
    cacheControl: true,
    maxAge: '1d',
    immutable: false,
    acceptRanges: true,
  });
  // Uploads arrive as raw bytes with the file's real Content-Type. Fastify rejects unknown media
  // types by default (415), so register a buffering parser for the allowed upload types. The
  // controller still validates size and magic bytes before anything is persisted.
  const fastify = app.getHttpAdapter().getInstance() as FastifyInstance;
  fastify.addContentTypeParser(
    [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'audio/mpeg',
      'audio/mp4',
      'audio/aac',
      'audio/wav',
      'audio/x-wav',
      'audio/ogg',
      'audio/flac',
      'audio/x-flac',
      'application/octet-stream',
    ],
    { parseAs: 'buffer', bodyLimit: 320 * 1024 * 1024 },
    (_request, body, done) => done(null, body),
  );

  // Refresh-token cookies (httpOnly) — Fastify needs the cookie plugin to read/set them.
  await app.register(fastifyCookie);
  app.useGlobalPipes(createValidationPipe());
  configureCors(app.getHttpAdapter().getInstance() as FastifyInstance, allowedOrigins);
  app.enableShutdownHooks();

  await app.listen(port, host);
  logger.log(`Ubuntu Tales API listening on http://${host}:${port}/api/v1`);
  logger.log(`CORS origins: ${allowedOrigins.join(', ') || '(none)'}`);
}

bootstrap().catch((error: unknown) => {
  new Logger('Bootstrap').error(
    'API failed to start',
    error instanceof Error ? error.stack : String(error),
  );
  process.exitCode = 1;
});
