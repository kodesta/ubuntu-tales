import { Link, notFound } from '@tanstack/react-router';
import { REGION_LABELS } from '@ubuntu-tales/shared';
import { Share2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';

import { ApiError } from '@/lib/api';
import { formatReaderCount, formatTaleCount } from '@/lib/format';
import { useTribe } from '@/lib/queries';
import { sharePage } from '@/lib/share';
import { useToastStore } from '@/stores/toast';
import {
  ArchiveList,
  Button,
  EmptyState,
  FollowButton,
  IconButton,
  PageShell,
  PublicationMark,
  SectionHeader,
  Skeleton,
  StoryCard,
} from '@/ui';

import styles from './PublicationPage.module.css';

const APP_TITLE = 'Ubuntu Tales — Stories your grandmother knew';

/** `/tribes/$slug` — publication page: accent-washed masthead, numbered archive, about. */
export function PublicationPage({ slug }: { slug: string }) {
  const query = useTribe(slug);
  const showToast = useToastStore((state) => state.show);

  useEffect(() => {
    if (query.data) document.title = `${query.data.name} — Ubuntu Tales`;
    return () => {
      document.title = APP_TITLE;
    };
  }, [query.data]);

  if (query.isPending) return <PublicationSkeleton />;

  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      throw notFound();
    }
    return (
      <PageShell variant="publication">
        <EmptyState
          variant="error"
          eyebrow="The publication went quiet"
          title="We could not open this publication."
          body="The connection may have slipped. Try once more, or return to the publications index."
          action={
            <>
              <Button onClick={() => void query.refetch()}>Try again</Button>
              <Link to="/tribes">All publications</Link>
            </>
          }
        />
      </PageShell>
    );
  }

  const tribe = query.data;
  const accentStyle = { '--accent': tribe.accentColor } as CSSProperties;
  // Prefer featured tales for the cover-card archive; small publications fall back to their
  // latest list so the section never renders a lonely card in a three-up grid.
  const archiveCards = (
    tribe.featuredStories.length >= 2 ? tribe.featuredStories : tribe.latestStories
  ).slice(0, 3);

  const handleShare = async () => {
    const result = await sharePage({
      title: `${tribe.name} — Ubuntu Tales`,
      text: tribe.tagline,
      url: `${window.location.origin}/tribes/${tribe.slug}`,
    });
    if (result === 'copied') showToast('Link copied to your clipboard.');
    if (result === 'failed') showToast('Sharing is not available in this browser.');
  };

  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        <section className={styles.band} style={accentStyle} aria-labelledby="publication-title">
          <div className={styles.bandInner}>
            <div className={styles.identity}>
              <PublicationMark
                name={tribe.name}
                accentColor={tribe.accentColor}
                image={tribe.image}
                size="xl"
              />
              <div className={styles.identityText}>
                <p className={styles.eyebrow}>
                  Publication · {REGION_LABELS[tribe.region]}
                </p>
                <h1 id="publication-title" className={styles.name}>
                  {tribe.name}
                </h1>
                {tribe.tagline ? <p className={styles.tagline}>{tribe.tagline}</p> : null}
                {tribe.description ? (
                  <p className={styles.description}>{tribe.description}</p>
                ) : null}
                <p className={styles.stats}>
                  {formatTaleCount(tribe.publishedStoryCount)} ·{' '}
                  {formatReaderCount(tribe.subscriberCount)} · {tribe.countriesLabel}
                </p>
              </div>
            </div>
            <div className={styles.actions}>
              <FollowButton
                tribe={tribe}
                size="lg"
                labels={{ idle: 'Subscribe', active: 'Subscribed ✓' }}
              />
              <IconButton
                label={`Share ${tribe.name}`}
                variant="paper"
                onClick={() => void handleShare()}
              >
                <Share2 size={18} aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="latest-tales-title">
          <SectionHeader
            title={<span id="latest-tales-title">Latest tales</span>}
            action={<span>{formatTaleCount(tribe.publishedStoryCount)}</span>}
          />
          {tribe.latestStories.length > 0 ? (
            <ArchiveList stories={tribe.latestStories} />
          ) : (
            <EmptyState
              eyebrow="A young publication"
              title="No tales published here yet."
              body="We are still gathering the stories of this tribe. Follow it and check back soon."
              action={
                <FollowButton
                  tribe={tribe}
                  size="md"
                  labels={{ idle: 'Subscribe', active: 'Subscribed ✓' }}
                />
              }
            />
          )}
        </section>

        {archiveCards.length > 0 ? (
          <section className={styles.section} aria-labelledby="archive-title">
            <SectionHeader title={<span id="archive-title">From the archive</span>} />
            <div className={styles.archiveGrid}>
              {archiveCards.map((story) => (
                <StoryCard key={story.id} story={story} variant="list" />
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="about-publication-title">
          <SectionHeader title={<span id="about-publication-title">About this publication</span>} />
          <div className={styles.about}>
            <p className={styles.aboutText}>
              {tribe.description ??
                `${tribe.name} is one voice in the Ubuntu Tales archive — tales carried from ${tribe.countriesLabel}, retold for readers today.`}
            </p>
            <p className={styles.communityNote}>
              This is a community publication. Tales are traditional and retold with care.
            </p>
          </div>
        </section>

        <div className={styles.backRow}>
          <Link to="/tribes" className={styles.backLink}>
            ← All publications
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

function PublicationSkeleton() {
  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        <Skeleton variant="hero" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
        <Skeleton variant="row" />
      </div>
    </PageShell>
  );
}
