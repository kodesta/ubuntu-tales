import { Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, Share2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';

import { useRecommendations, useStory } from '@/features/reader/queries';
import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { ApiError } from '@/lib/api';
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

import { Confetti } from './Confetti';
import { ReactionPicker } from './ReactionPicker';
import { shareWisdom, wisdomShareMessage } from './shareWisdom';
import styles from './CompletePage.module.css';

const APP_TITLE = 'Ubuntu Tales — Stories your grandmother knew';

export interface CompletePageProps {
  slug: string;
}

/**
 * `/stories/$slug/complete` — the end-of-tale screen (design doc §7.9): editorial "Ubuntu!",
 * the large reaction picker, the wisdom quote, wisdom sharing and three recommendations.
 * Visiting directly works too: the page simply celebrates the tale that was opened.
 */
export function CompletePage({ slug }: CompletePageProps) {
  const storyQuery = useStory(slug);
  const recommendationsQuery = useRecommendations(slug);
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
  const recommendations = (recommendationsQuery.data ?? [])
    .filter((item) => item.slug !== story.slug)
    .slice(0, 3);

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
          <ReactionPicker storySlug={story.slug} />
        </section>

        <figure className={styles.wisdom}>
          <p className={styles.sectionLabel}>The wisdom</p>
          <blockquote className={styles.wisdomQuote}>“{wisdom}”</blockquote>
          <figcaption className={styles.wisdomSource}>From “{story.title}”</figcaption>
        </figure>

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
          {recommendationsQuery.isPending ? (
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
