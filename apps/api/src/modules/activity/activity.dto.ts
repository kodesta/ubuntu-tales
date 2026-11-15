import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import {
  REACTIONS,
  SAVED_FILTERS,
  type ReactionType,
  type SavedFilter,
} from '@ubuntu-tales/shared';
import { AppException } from '../../common/errors/app-exception';
import { readString } from '../../common/http/query-params';

const REACTION_TYPES = REACTIONS.map((reaction) => reaction.type);

/** `PUT /me/progress/:storyId` body (frozen `ProgressInput` contract). */
export class ProgressInputDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  narrationId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  lastSentenceId?: string;

  @IsNumber({}, { message: 'audioPositionMs must be a number.' })
  @Min(0)
  @Max(86_400_000, { message: 'audioPositionMs is out of range.' })
  audioPositionMs!: number;

  @IsNumber({}, { message: 'percent must be a number.' })
  @Min(0)
  @Max(100)
  percent!: number;

  @IsNumber({}, { message: 'listenedDeltaSec must be a number.' })
  @Min(0)
  listenedDeltaSec!: number;

  @IsISO8601({ strict: true }, { message: 'clientUpdatedAt must be an ISO 8601 timestamp.' })
  clientUpdatedAt!: string;
}

/** `PUT /stories/:storyId/reactions` body. */
export class ReactionInputDto {
  @IsIn(REACTION_TYPES, { message: 'Choose a valid reaction.' })
  type!: ReactionType;
}

/** `?filter=all|in-progress|offline` for `/me/saved` (defaults to `all`). */
export function parseSavedFilter(value: unknown): SavedFilter {
  const raw = readString(value);
  if (raw === undefined) return 'all';
  if (!(SAVED_FILTERS as readonly string[]).includes(raw)) {
    throw AppException.validation(`filter must be one of: ${SAVED_FILTERS.join(', ')}.`, [
      { field: 'filter', message: `Must be one of: ${SAVED_FILTERS.join(', ')}.` },
    ]);
  }
  return raw as SavedFilter;
}

/** Reading the optional `X-Timezone` header used for streaks without failing on junk values. */
export function readTimezoneHeader(raw: unknown): string | undefined {
  if (Array.isArray(raw)) return readString(raw[0]);
  return readString(raw);
}
