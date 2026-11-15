import type { CommunityRole } from '@ubuntu-tales/shared';

/**
 * Fallback labels for the `communityRole` enum until `/config` answers (it serves the same list
 * with descriptions). Kept in one place so signup, profile and settings cannot drift.
 */
export const FALLBACK_COMMUNITY_ROLES: Array<{ value: CommunityRole; label: string }> = [
  { value: 'STORYTELLER', label: 'Storyteller' },
  { value: 'SEEKER', label: 'Seeker' },
  { value: 'WRITER', label: 'Writer' },
  { value: 'STORYTELLER_AND_SEEKER', label: 'Storyteller and seeker' },
  { value: 'ELDER_GUARDIAN', label: 'Elder guardian' },
];

export function communityRoleLabel(
  value: CommunityRole | null | undefined,
  roles: Array<{ value: CommunityRole; label: string }> = FALLBACK_COMMUNITY_ROLES,
): string | undefined {
  if (!value) return undefined;
  return roles.find((role) => role.value === value)?.label ?? value;
}
