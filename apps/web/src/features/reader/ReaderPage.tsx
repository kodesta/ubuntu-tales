import { Link, notFound } from '@tanstack/react-router';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import { ApiError } from '@/lib/api';
import { formatReadTime, formatShortDate } from '@/lib/format';
import { FONT_SIZE_VALUES, useFontSizeStore } from '@/stores/fontSize';
import { useIsAuthenticated, useSessionStore } from '@/stores/session';
import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { useToastStore } from '@/stores/toast';
import { Avatar, Button, EmptyState, Image, PageShell, ReadingProgress, Skeleton } from '@/ui';

import { ReaderEndMatter } from './ReaderEndMatter';
import { ReaderTopBar } from './ReaderTopBar';
import { StoryBody } from './StoryBody';
import { useReadingProgressTracking } from './readingProgress';
import { useStory } from './queries';
import { copyStoryLink, shareResultMessage, shareStory } from './shareStory';
import { useProgressSync } from './useProgressSync';
import styles from './ReaderPage.module.css';

const APP_TITLE = 'Ubuntu Tales — Stories your grandmother knew';

export interface ReaderPageProps {
  slug: string;
}

/**
 * `/stories/$slug` — the reader. Reading-progress hairline, sticky article bar, editorial header,
 * 3:2 cover, sentence-level body markup and the full end matter (design doc §7.5).
 */
export function ReaderPage({ slug }: ReaderPageProps) {
  const storyQuery = useStory(slug);
  const fontSize = useFontSizeStore((state) => state.size);
  const showToast = useToastStore((state) => state.show);
  const [scrolled, setScrolled] = useState(false);

  const isAuthed = useIsAuthenticated();
  const sessionStatus = useSessionStore((state) => state.status);
  // Wait for the boot refresh before persisting anything, otherwise the first guest render can
  // record a 0% marker before the account's progress arrives (Phase 2 cross-device sync).
  const progress = useReadingProgressTracking(
    slug,
    Boolean(storyQuery.data) && sessionStatus !== 'unknown',
  );
  const recordProgress = useReadingProgressStore((state) => state.record);
  const markCompleteProgress = useReadingProgressStore((state) => state.markComplete);

  // Signed-in readers: mirror the local marker to PUT /me/progress while reading (10 s + flush on
  // visibility/unmount). Guests stay local-only — the hook is a no-op.
  useProgressSync({ storyId: storyQuery.data?.id, slug, enabled: isAuthed });

  // Signed-in hydrate: a saved tale opened on a new device starts from the account's place.
  useEffect(() => {
    const tale = storyQuery.data;
    if (!isAuthed || !tale?.viewer) return;
    const local = useReadingProgressStore.getState().bySlug[slug];
    // A 0% marker can be written before the authenticated response arrives; treat it as unset.
    if (local && local.percent > 0) return;
    if (tale.viewer.completed) {
      markCompleteProgress(slug);
      return;
    }
    if (tale.viewer.progressPercent > 0) {
      recordProgress(slug, { percent: tale.viewer.progressPercent });
      // Resume where the account left off on this device too (best effort, after layout settles).
      window.setTimeout(() => {
        if (window.scrollY > 0) return;
        const html = document.documentElement;
        const max = Math.max(html.scrollHeight, document.body.scrollHeight) - window.innerHeight;
        if (max > 0) {
          window.scrollTo({
            top: Math.round(((tale.viewer?.progressPercent ?? 0) / 100) * max),
            behavior: 'auto',
          });
        }
      }, 350);
    }
  }, [isAuthed, markCompleteProgress, recordProgress, slug, storyQuery.data]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const tale = storyQuery.data;
    if (!tale) return;
    document.title = `${tale.title} — ${tale.tribe.name} · Ubuntu Tales`;
    return () => {
      document.title = APP_TITLE;
    };
  }, [storyQuery.data]);

  if (storyQuery.isPending) return <ReaderSkeleton />;

  if (storyQuery.isError) {
    if (storyQuery.error instanceof ApiError && storyQuery.error.status === 404) {
      throw notFound();
    }
    return (
      <PageShell variant="reader">
        <EmptyState
          variant="error"
          eyebrow="The fire flickered"
          title="We could not open this tale."
          body="The connection may have slipped. Try once more, or return to your reading list."
          action={
            <>
              <Button onClick={() => void storyQuery.refetch()}>Try again</Button>
              <Link to="/">Back to the reading list</Link>
            </>
          }
        />
      </PageShell>
    );
  }

  const story = storyQuery.data;

  const handleShare = async () => {
    const result = await shareStory({
      slug: story.slug,
      title: story.title,
      summary: story.summary,
    });
    const message = shareResultMessage(result);
    if (message) showToast(message);
  };

  const handleCopyLink = async () => {
    const copied = await copyStoryLink(story.slug);
    showToast(
      copied ? 'Link copied to your clipboard.' : 'Copying is not available in this browser.',
    );
  };

  const pageStyle = {
    '--accent': story.tribe.accentColor ?? 'var(--terracotta)',
    '--body-size': FONT_SIZE_VALUES[fontSize],
  } as CSSProperties;

  const narrator = story.narrator;
  const coverCaption = story.cover.alt ?? `Artwork for ${story.title}`;

  return (
    <PageShell variant="full">
      <ReadingProgress
        value={progress?.percent ?? 0}
        accentColor={story.tribe.accentColor}
        label={`Reading progress for ${story.title}`}
      />
      <div className={styles.page} style={pageStyle}>
        <ReaderTopBar story={story} scrolled={scrolled} onShare={() => void handleShare()} />

        <article className={styles.article} aria-labelledby="story-title">
          <header className={styles.header}>
            <p className={styles.eyebrow}>
              <span className={styles.accentDot} aria-hidden="true" />
              <Link
                to="/tribes/$slug"
                params={{ slug: story.tribe.slug }}
                className={styles.publicationLink}
              >
                {story.tribe.name}
              </Link>
              <span className={styles.separator} aria-hidden="true">
                ·
              </span>
              <span>{story.category.name}</span>
            </p>

            <h1 id="story-title" className={styles.title}>
              {story.title}
            </h1>

            <p className={styles.dek}>{story.summary}</p>

            <div className={styles.byline}>
              <div className={styles.bylineIdentity}>
                <Avatar
                  name={narrator?.name ?? story.tribe.name}
                  image={narrator?.avatar}
                  accentColor={narrator?.accentColor ?? story.tribe.accentColor}
                  size="md"
                />
                <div className={styles.bylineText}>
                  <p className={styles.bylineName}>
                    {narrator ? `Narrated by ${narrator.name}` : 'A tale from the fire'}
                  </p>
                  {narrator?.roleLabel ? (
                    <p className={styles.bylineRole}>{narrator.roleLabel}</p>
                  ) : null}
                </div>
              </div>
              <p className={styles.bylineMeta}>
                {formatShortDate(story.publishedAt)} · {formatReadTime(story.readTimeMinutes)}
              </p>
            </div>
          </header>

          <figure className={styles.coverFigure}>
            <Image
              image={story.cover}
              ratio="3/2"
              loading="eager"
              sizes="(min-width: 720px) 680px, 100vw"
            />
            <figcaption className={styles.coverCaption}>{coverCaption}</figcaption>
          </figure>

          <StoryBody body={story.body} className={styles.body} />

          <ReaderEndMatter
            story={story}
            onShare={() => void handleShare()}
            onCopyLink={() => void handleCopyLink()}
          />
        </article>
      </div>
    </PageShell>
  );
}

function ReaderSkeleton() {
  return (
    <PageShell variant="full">
      <div className={styles.skeletonPage}>
        <div className={styles.skeletonBar}>
          <Skeleton variant="mark" />
          <Skeleton variant="text" lines={1} className={styles.skeletonBarLine} />
        </div>
        <div className={styles.skeletonArticle}>
          <Skeleton variant="text" lines={1} />
          <Skeleton variant="title" />
          <Skeleton variant="text" lines={2} />
          <Skeleton variant="hero" />
          <Skeleton variant="text" lines={5} />
        </div>
      </div>
    </PageShell>
  );
}
