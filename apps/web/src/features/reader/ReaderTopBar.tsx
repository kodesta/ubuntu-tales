import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import type { StoryDetail } from '@ubuntu-tales/shared';
import { ArrowLeft, Share2 } from 'lucide-react';

import { cn } from '@/lib/cn';
import { IconButton, SaveButton } from '@/ui';

import { FontSizeControl } from './FontSizeControl';
import styles from './ReaderTopBar.module.css';

export interface ReaderTopBarProps {
  story: StoryDetail;
  /** True once the page has scrolled: the bar turns from transparent to paper with a hairline. */
  scrolled: boolean;
  onShare: () => void;
}

/** Reader-only top bar: back, publication, text size, save and share. Sticky, quiet by default. */
export function ReaderTopBar({ story, scrolled, onShare }: ReaderTopBarProps) {
  const router = useRouter();
  const navigate = useNavigate();

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.history.back();
      return;
    }
    void navigate({ to: '/' });
  };

  return (
    <header className={cn(styles.bar, scrolled && styles.barScrolled)}>
      <div className={styles.inner}>
        <IconButton label="Back" className={styles.back} onClick={goBack}>
          <ArrowLeft size={20} aria-hidden="true" />
        </IconButton>
        <Link
          to="/tribes/$slug"
          params={{ slug: story.tribe.slug }}
          className={styles.publication}
        >
          {story.tribe.name}
        </Link>
        <div className={styles.actions}>
          <FontSizeControl />
          <SaveButton story={story} />
          <IconButton label="Share this tale" onClick={onShare}>
            <Share2 size={20} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </header>
  );
}
