import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Public entry point for the database package.
 *
 * The generated Prisma client is re-exported so applications can extend it (the API's
 * `PrismaService` does) and `createPrismaClient` centralises the client options we use.
 */

export { Prisma, PrismaClient };
export type {
  AccessLevel,
  Category,
  Narrator,
  ReactionType,
  Region,
  Story,
  StoryOfTheDay,
  StoryStatus,
  Tribe,
} from '@prisma/client';

export interface CreatePrismaClientOptions {
  /** Overrides `DATABASE_URL` (used by tests and scripts). */
  datasourceUrl?: string;
  /** Emit every SQL query to stdout — development only. */
  logQueries?: boolean;
}

/**
 * Create a Prisma client with Ubuntu Tales' defaults. Callers own the lifecycle and should
 * call `$connect()` / `$disconnect()` (the Nest PrismaService does this for the API).
 */
export function createPrismaClient(options: CreatePrismaClientOptions = {}): PrismaClient {
  const log: Prisma.LogLevel[] = options.logQueries
    ? ['query', 'warn', 'error']
    : ['warn', 'error'];

  return new PrismaClient({
    log,
    ...(options.datasourceUrl ? { datasourceUrl: options.datasourceUrl } : {}),
  });
}
