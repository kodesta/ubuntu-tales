import { Prisma } from '@ubuntu-tales/db';
import { AppException } from '../../common/errors/app-exception';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Activity endpoints accept either the story UUID (what `StoryCard.id` carries) or its slug, per
 * plan 03 §1 ("stories also addressable by slug"). Only published stories are addressable.
 */
export function publishedStoryWhere(ref: string): Prisma.StoryWhereInput {
  return isUuid(ref) ? { id: ref, status: 'PUBLISHED' } : { slug: ref, status: 'PUBLISHED' };
}

/** Story fields the activity features need for stats + recommendations. */
export const ACTIVITY_STORY_SELECT = {
  id: true,
  slug: true,
  tribeId: true,
} satisfies Prisma.StorySelect;

export type ActivityStory = Prisma.StoryGetPayload<{ select: typeof ACTIVITY_STORY_SELECT }>;

export function assertStoryFound<T>(story: T | null, ref: string): T {
  if (!story) {
    throw AppException.notFound(`Story "${ref}"`);
  }
  return story;
}
