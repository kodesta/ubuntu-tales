import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { StoryCard, StoryDetail } from '@ubuntu-tales/shared';
import { ArrowRight, Bookmark, BookmarkCheck, Link2, Share2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import { announceSavedToggle, toggleSavedWithSync } from '@/features/saved/savedSync';
import { DownloadButton } from '@/features/offline';
import { cn } from '@/lib/cn';
import { formatReadTime } from '@/lib/format';
import { useStories } from '@/lib/queries';
import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { useIsAuthenticated } from '@/stores/session';
import { useSavedStore } from '@/stores/saved';
import { useToastStore } from '@/stores/toast';
import {
  Button,
  FollowButton,
  Ornament,
  ReactionRow,
  SectionHeader,
  Skeleton,
  StoryCard as StoryCardView,
} from '@/ui';

import { completeStoryQueryOptions, useRecommendations } from './queries';
import styles from './ReaderEndMatter.module.css';

export interface ReaderEndMatterProps {
  story: StoryDetail;
  onShare: () => void;
  onCopyLink: () => void;
}

/** Fills "More from {tribe}" to three cards using recommendations when a publication is small. */
export function padMoreStories(
  tribeStories: StoryCard[],
  recommendations: StoryCard[],
  currentSlug: string,
): StoryCard[] {
  const filled: StoryCard[] = [];
  const seen = new Set<string>([currentSlug]);

  for (const story of [...tribeStories, ...recommendations]) {
    if (filled.length >= 3) break;
    if (seen.has(story.slug)) continue;
    seen.add(story.slug);
    filled.push(story);
  }

  return filled;
}

/**
 * End matter for the reader (design doc §7.5): ornament, the wisdom, reactions, save/share/copy,
 * the follow-publication card, "More from {tribe}", the next-tale teaser and the finish action.
 */
export function ReaderEndMatter({ story, onShare, onCopyLink }: ReaderEndMatterProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAuthed = useIsAuthenticated();
  const hydrated = useSavedStore((state) => state.hydrated);
  const savedInStore = useSavedStore((state) =>
    state.entries.some((entry) => entry.story.slug === story.slug),
  );
  const [finishing, setFinishing] = useState(false);
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
  // Before the account list hydrates, the per-response viewer overlay is the freshest truth.
  const effectiveSaved = isAuthed && !hydrated ? (story.viewer?.saved ?? savedInStore) : savedInStore;
  const saved = savedOverride ?? effectiveSaved;
  const markComplete = useReadingProgressStore((state) => state.markComplete);
  const showToast = useToastStore((state) => state.show);

  const moreQuery = useStories({ tribe: story.tribe.slug, limit: 4 });
  const recommendationsQuery = useRecommendations(story.slug);

  const tribeStories = (moreQuery.data?.items ?? []).filter(
    (item) => item.slug !== story.slug,
  );
  const recommendations = recommendationsQuery.data ?? [];
  const moreStories = padMoreStories(tribeStories, recommendations, story.slug);
  const moreIsLoading = moreQuery.isPending && recommendationsQuery.isPending;
  const allFromTribe =
    moreStories.length > 0 && moreStories.every((item) => item.tribe.slug === story.tribe.slug);
  // Small publications cannot always fill three cards from their own archive; when we lean on
  // recommendations the heading says so rather than mislabelling other publications' tales.
  const moreHeading =
    tribeStories.length === 0
      ? 'More tales from the archive'
      : allFromTribe
        ? `More from ${story.tribe.name}`
        : `More from ${story.tribe.name} and beyond`;

  const nextTale =
    recommendations.find(
      (item) =>
        item.slug !== story.slug && !moreStories.some((more) => more.slug === item.slug),
    ) ??
    recommendations.find((item) => item.slug !== story.slug) ??
    null;

  const accentStyle = {
    '--accent': story.tribe.accentColor ?? 'var(--terracotta)',
  } as CSSProperties;

  const handleSave = () => {
    const previouslySaved = saved;
    setSavedOverride(!previouslySaved);
    void toggleSavedWithSync(story, previouslySaved, queryClient).then((outcome) => {
      setSavedOverride(outcome.saved);
      announceSavedToggle(outcome);
    });
  };

  const handleFinish = async () => {
    if (finishing) return;
    markComplete(story.slug);
    setFinishing(true);
    if (isAuthed) {
      try {
        // Shares its cache entry with the celebration screen (staleTime: Infinity) so the completion
        // screen renders the returned stats/recommendations without a second POST.
        await queryClient.ensureQueryData(completeStoryQueryOptions(story.slug, story.id));
      } catch {
        showToast(
          'We could not record this finish on your account. Your place is kept on this device.',
        );
      }
    }
    setFinishing(false);
    void navigate({ to: '/stories/$slug/complete', params: { slug: story.slug } });
  };

  return (
    <div className={styles.endMatter}>
      {story.moral ? (
        <section className={styles.wisdomSection} aria-label="The wisdom of this tale">
          <Ornament />
          <figure className={styles.wisdom}>
            <figcaption className={styles.label}>The wisdom</figcaption>
            <blockquote className={styles.wisdomQuote}>{story.moral}</blockquote>
          </figure>
        </section>
      ) : (
        <Ornament />
      )}

      <section className={styles.reactions} aria-labelledby="reader-reactions-heading">
        <h2 id="reader-reactions-heading" className={styles.label}>
          How did the tale leave you?
        </h2>
        <ReactionRow
          storySlug={story.slug}
          storyId={story.id}
          viewerReaction={story.viewer?.reaction ?? null}
        />
      </section>

      <div className={styles.actions}>
        <Button
          variant="secondary"
          iconLeft={
            saved ? (
              <BookmarkCheck size={18} aria-hidden="true" />
            ) : (
              <Bookmark size={18} aria-hidden="true" />
            )
          }
          onClick={handleSave}
        >
          {saved ? 'Saved' : 'Save tale'}
        </Button>
        <Button
          variant="secondary"
          iconLeft={<Share2 size={18} aria-hidden="true" />}
          onClick={onShare}
        >
          Share
        </Button>
        <Button
          variant="quiet"
          iconLeft={<Link2 size={18} aria-hidden="true" />}
          onClick={onCopyLink}
        >
          Copy link
        </Button>
        <DownloadButton storySlug={story.slug} storyTitle={story.title} />
      </div>

      <div className={styles.finishBlock}>
        <Button
          variant="primary"
          size="lg"
          iconRight={<ArrowRight size={18} aria-hidden="true" />}
          disabled={finishing}
          onClick={() => void handleFinish()}
        >
          {finishing ? 'Finishing…' : 'Finish tale'}
        </Button>
        <p className={styles.finishNote}>
          Mark the tale finished, then choose how it made you feel.
        </p>
      </div>

      <aside className={styles.followCard} style={accentStyle}>
        <div className={styles.followCopy}>
          <p className={styles.label}>From the fire</p>
          <h2 className={styles.followTitle}>Follow {story.tribe.name}</h2>
          <p className={styles.followBody}>
            New tales from this publication, told the way they were told to us.
          </p>
        </div>
        <FollowButton
          tribe={{ slug: story.tribe.slug, name: story.tribe.name }}
          size="md"
          labels={{ idle: 'Follow the publication', active: 'Following ✓' }}
        />
      </aside>

      {moreStories.length > 0 || moreIsLoading ? (
        <section className={styles.more} aria-labelledby="reader-more-heading">
          <SectionHeader
            title={<span id="reader-more-heading">{moreHeading}</span>}
            eyebrow="Keep reading"
            action={
              <Link to="/library" className={styles.moreLink}>
                The library
              </Link>
            }
          />
          <div className={styles.moreGrid}>
            {moreIsLoading
              ? Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} variant="card" lines={3} />
                ))
              : moreStories.map((item) => (
                  <StoryCardView key={item.id} story={item} variant="list" />
                ))}
          </div>
        </section>
      ) : null}

      {nextTale ? (
        <Link
          to="/stories/$slug"
          params={{ slug: nextTale.slug }}
          className={styles.nextTale}
          style={accentStyle}
        >
          <span className={styles.nextCopy}>
            <span className={styles.label}>Next tale</span>
            <span className={styles.nextTitle}>{nextTale.title}</span>
            <span className={styles.nextMeta}>
              {nextTale.tribe.name} · {formatReadTime(nextTale.readTimeMinutes)}
            </span>
          </span>
          <ArrowRight className={styles.nextArrow} size={22} aria-hidden="true" />
        </Link>
      ) : (
        <Link to="/library" className={cn(styles.nextTale, styles.nextFallback)}>
          <span className={styles.nextCopy}>
            <span className={styles.label}>Keep wandering</span>
            <span className={styles.nextTitle}>The library holds more tales.</span>
          </span>
          <ArrowRight className={styles.nextArrow} size={22} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
