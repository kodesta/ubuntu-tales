import { Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, Share2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';

import { useCompleteStory, useRecommendations, useStory } from '@/features/reader/queries';
import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { ApiError } from '@/lib/api';
import { useIsAuthenticated } from '@/stores/session';
import { useToastStore } from '@/stores/toast';
import {
  Button,
  buttonClassName,
  EmptyState,
  PageShell,
  SectionHeader,
  Skeleton,
  StoryCard,
} from '@/ui';
import { useReactionSummary } from '@/ui/ReactionRow/useReactionSync';

import { Confetti } from './Confetti';
import { ReactionPicker } from './ReactionPicker';
import { shareWisdom, wisdomShareMessage } from './shareWisdom';
import styles from './CompletePage.module.css';

const APP_TITLE = 'Ubuntu Tales — Stories your grandmother knew';

export interface CompletePageProps {
  slug: string;
}

function readersLine(count: number): string {
  if (count === 1) return 'One reader felt this.';
  return `${count.toLocaleString('en')} readers felt this.`;
}

function statsLine(stats: { talesRead: number; currentStreakDays: number }): string {
  const tales = stats.talesRead === 1 ? '1 tale' : `${stats.talesRead.toLocaleString('en')} tales`;
  const streak =
    stats.currentStreakDays > 1 ? ` · ${stats.currentStreakDays}-day reading streak` : '';
  return `That is ${tales} read on your account${streak}.`;
}

/**
 * `/stories/$slug/complete` — the end-of-tale screen (design doc §7.9): editorial "Ubuntu!",
 * the large reaction picker, the wisdom quote, wisdom sharing and three recommendations.
 *
 * Signed-in readers get the server's celebration payload from `POST /me/progress/:id/complete`
 * (stats + recommendations, shared with the reader's "Finish tale" call). Guests keep the
 * catalogue recommendations query. Visiting directly works too: the page simply celebrates the
 * tale that was opened.
 */
export function CompletePage({ slug }: CompletePageProps) {
  const storyQuery = useStory(slug);
  const isAuthed = useIsAuthenticated();
  const completeQuery = useCompleteStory(slug, storyQuery.data?.id, isAuthed);
  // Guests only: signed-in recommendations come from the completion response.
  const recommendationsQuery = useRecommendations(slug, { enabled: !isAuthed });
  const summaryQuery = useReactionSummary(storyQuery.data?.id);
  const markComplete = useReadingProgressStore((state) => state.markComplete);
  const showToast = useToastStore((state) => state.show);

  useEffect(() => {
    const tale = storyQuery.data;
    if (!tale) return;
    document.title = `You finished ${tale.title} — Ubuntu Tales`;
    return () => {
      document.title = APP_TITLE;
    };
  }, [storyQuery.data]);

  useEffect(() => {
    if (!storyQuery.data) return;
    markComplete(slug);
  }, [markComplete, slug, storyQuery.data]);

  if (storyQuery.isPending) return <CompleteSkeleton />;

  if (storyQuery.isError) {
    if (storyQuery.error instanceof ApiError && storyQuery.error.status === 404) {
      throw notFound();
    }
    return (
      <PageShell variant="narrow">
        <EmptyState
          variant="error"
          eyebrow="Ubuntu!"
          title="We could not open this tale."
          body="The ending is shy today. Try again, or return to your reading list."
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
  const wisdom = story.moral ?? story.summary;
  const completion = completeQuery.data;
  const recommendationSource = isAuthed
    ? (completion?.recommendations ?? [])
    : (recommendationsQuery.data ?? []);
  const recommendations = recommendationSource
    .filter((item) => item.slug !== story.slug)
    .slice(0, 3);
  const recommendationsLoading = isAuthed
    ? completeQuery.isPending
    : recommendationsQuery.isPending;
  const reactionTotal = summaryQuery.data?.total ?? 0;
  const stats = completion?.stats;

  const accentStyle = {
    '--accent': story.tribe.accentColor ?? 'var(--terracotta)',
  } as CSSProperties;

  const handleShareWisdom = async () => {
    const result = await shareWisdom({ wisdom, title: story.title, slug: story.slug });
    const message = wisdomShareMessage(result);
    if (message) showToast(message);
  };

  return (
    <PageShell variant="narrow" className={styles.shell}>
      <Confetti />
      <div className={styles.page} style={accentStyle}>
        <p className={styles.eyebrow}>Ubuntu!</p>
        <h1 className={styles.title}>You have finished this tale.</h1>
        <p className={styles.lede}>
          <span className={styles.accentDot} aria-hidden="true" />
          {story.title} · {story.tribe.name}
        </p>

        <section className={styles.reactionSection} aria-labelledby="complete-reactions">
          <h2 id="complete-reactions" className={styles.sectionLabel}>
            How did the tale leave you?
          </h2>
          <ReactionPicker
            storySlug={story.slug}
            storyId={story.id}
            viewerReaction={story.viewer?.reaction ?? null}
          />
          {reactionTotal > 0 ? (
            <p className={styles.readersLine}>{readersLine(reactionTotal)}</p>
          ) : null}
        </section>

        <figure className={styles.wisdom}>
          <p className={styles.sectionLabel}>The wisdom</p>
          <blockquote className={styles.wisdomQuote}>“{wisdom}”</blockquote>
          <figcaption className={styles.wisdomSource}>From “{story.title}”</figcaption>
        </figure>

        {stats ? <p className={styles.statsLine}>{statsLine(stats)}</p> : null}

        <div className={styles.actions}>
          <Link to="/" className={buttonClassName('primary', 'md')}>
            Back to the reading list
          </Link>
          <Button
            variant="secondary"
            iconLeft={<Share2 size={18} aria-hidden="true" />}
            onClick={() => void handleShareWisdom()}
          >
            Share wisdom
          </Button>
          <Link
            to="/stories/$slug"
            params={{ slug: story.slug }}
            className={buttonClassName('ghost', 'md')}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to the tale
          </Link>
        </div>

        <section className={styles.recommendations} aria-labelledby="complete-more">
          <SectionHeader
            title={<span id="complete-more">Three more tales for the fire.</span>}
            eyebrow="Keep reading"
            action={
              <Link to="/library" className={styles.moreLink}>
                The library
              </Link>
            }
          />
          {isAuthed && completeQuery.isError ? (
            <EmptyState
              eyebrow="The fire is patient"
              title="We could not gather your next tales."
              body="Your finish is kept on this device. Try once more — the tales are still warm."
              action={
                <Button onClick={() => void completeQuery.refetch()}>Try again</Button>
              }
            />
          ) : recommendationsLoading ? (
            <div className={styles.cardGrid}>
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} variant="card" lines={3} />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className={styles.cardGrid}>
              {recommendations.map((item) => (
                <StoryCard key={item.id} story={item} variant="list" />
              ))}
            </div>
          ) : (
            <EmptyState
              eyebrow="The fire is patient"
              title="More tales are being gathered."
              body="Wander the library while the next story warms up."
              action={
                <Link to="/library" className={buttonClassName('secondary')}>
                  Browse the library
                </Link>
              }
            />
          )}
        </section>
      </div>
    </PageShell>
  );
}

function CompleteSkeleton() {
  return (
    <PageShell variant="narrow" className={styles.shell}>
      <div className={styles.skeleton}>
        <Skeleton variant="text" lines={1} />
        <Skeleton variant="title" />
        <Skeleton variant="text" lines={2} />
        <Skeleton variant="row" lines={2} />
        <Skeleton variant="row" lines={2} />
        <Skeleton variant="hero" />
      </div>
    </PageShell>
  );
}
