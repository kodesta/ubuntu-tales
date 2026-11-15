import { Prisma } from '@ubuntu-tales/db';

/** Every relation needed to map a database story to a `StoryCard` / `StoryDetail`. */
export const STORY_INCLUDE = {
  tribe: true,
  category: true,
  narrator: true,
  narrations: {
    where: { isPublished: true },
    orderBy: { isDefault: 'desc' },
    include: {
      narrator: true,
      soundscape: true,
      audio: { include: { renditions: true } },
    },
  },
} satisfies Prisma.StoryInclude;

export const PUBLISHED_STORY_WHERE = {
  status: 'PUBLISHED',
} satisfies Prisma.StoryWhereInput;
