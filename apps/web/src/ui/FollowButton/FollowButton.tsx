import type { TribeSummary } from '@ubuntu-tales/shared';

import { cn } from '@/lib/cn';
import { useFollowsStore } from '@/stores/follows';
import { FOLLOW_DEVICE_NOTE, useToastStore } from '@/stores/toast';

import { buttonClassName } from '../Button/Button';

import styles from './FollowButton.module.css';

export interface FollowButtonProps {
  tribe: Pick<TribeSummary, 'slug' | 'name'>;
  size?: 'sm' | 'md' | 'lg';
  /** Publication page uses Subscribe/Subscribed; cards use Follow/Following. */
  labels?: { idle: string; active: string };
  fullWidth?: boolean;
  className?: string;
  onToggled?: (following: boolean) => void;
}

/** Local-only follow pill: optimistic, persisted under `ut.follows`, toast-confirmed. */
export function FollowButton({
  tribe,
  size = 'sm',
  labels = { idle: 'Follow', active: 'Following' },
  fullWidth = false,
  className,
  onToggled,
}: FollowButtonProps) {
  const following = useFollowsStore((state) => state.slugs.includes(tribe.slug));
  const toggle = useFollowsStore((state) => state.toggle);
  const showToast = useToastStore((state) => state.show);

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={
        following
          ? `Unfollow ${tribe.name}`
          : `Follow ${tribe.name}`
      }
      className={cn(
        buttonClassName(following ? 'secondary' : 'pill', size, fullWidth),
        styles.followButton,
        following && styles.following,
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const nowFollowing = toggle(tribe.slug);
        if (nowFollowing) showToast(FOLLOW_DEVICE_NOTE);
        onToggled?.(nowFollowing);
      }}
    >
      {following ? labels.active : labels.idle}
    </button>
  );
}
