import { Controller, Get } from '@nestjs/common';
import {
  APP_NAME,
  APP_TAGLINE,
  COMMUNITY_ROLES,
  LOW_STORY_THRESHOLD,
  REACTIONS,
  SUPPORTED_LOCALES,
  type PublicConfig,
} from '@ubuntu-tales/shared';
import { CacheablePublic } from '../../common/http/cacheable-public.decorator';

/** Public runtime config consumed by the web app at boot (production plan 03 §2.1). */
@Controller('config')
@CacheablePublic()
export class PublicConfigController {
  @Get()
  getConfig(): PublicConfig {
    return {
      appName: APP_NAME,
      tagline: APP_TAGLINE,
      lowStoryThreshold: LOW_STORY_THRESHOLD,
      supportedLocales: [...SUPPORTED_LOCALES],
      reactions: REACTIONS,
      communityRoles: COMMUNITY_ROLES,
    };
  }
}
