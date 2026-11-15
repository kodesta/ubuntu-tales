import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';

import { formatLongDate } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useHome, useTribes } from '@/lib/queries';
import { useFollowsStore } from '@/stores/follows';
import { useTribeStore } from '@/stores/tribe';
import {
  Button,
  buttonClassName,
  EmptyState,
  PageShell,
  SectionHeader,
  Skeleton,
  StoryCard,
} from '@/ui';

import { DiscoverRail } from './DiscoverRail';
import { HomeSidebar } from './HomeSidebar';
import { SearchResults } from './SearchResults';
import styles from './HomePage.module.css';

/**
 * `/` — "Your reading list." Feed shell (8/4 desktop, single column mobile):
 * Today's tale hero, your-tribe band, the publications feed, a wisdom/notes sidebar and the
 * Discover rail. Any `?q=&category=` renders URL-driven search results instead of the feed.
 */
export function HomePage() {
  useDocumentTitle('Your reading list — Ubuntu Tales');
  const { q, category } = useSearch({ from: '/' });
  const navigate = useNavigate();
  const homeQuery = useHome();
  const tribesQuery = useTribes();
  const follows = useFollowsStore((state) => state.slugs);
  const guestTribeName = useTribeStore((state) => state.name);
  const searching = Boolean(q?.trim() || category);

  const feed = useMemo(() => {
    const home = homeQuery.data;
    if (!home) return [];
    const latest = home.latest.length > 0 ? home.latest : home.popular;
    if (follows.length === 0) return latest.slice(0, 6);
    const filtered = latest.filter((story) => follows.includes(story.tribe.slug));
    return (filtered.length > 0 ? filtered : latest).slice(0, 6);
  }, [homeQuery.data, follows]);

  const followedTribes = useMemo(() => {
    const tribes = tribesQuery.data ?? [];
    return tribes.filter((tribe) => follows.includes(tribe.slug));
  }, [tribesQuery.data, follows]);

  const setCategory = (next: string) => {
    void navigate({
      to: '/',
      search: (previous) => ({ ...previous, category: next || undefined }),
    });
  };

  if (homeQuery.isPending) return <HomeSkeleton />;

  if (homeQuery.isError) {
    return (
      <PageShell variant="feed">
        <EmptyState
          variant="error"
          eyebrow="The fire is still burning"
          title="We could not reach the archive."
          body="The tales are being served elsewhere right now. Check the connection, then try once more."
          action={<Button onClick={() => void homeQuery.refetch()}>Try again</Button>}
        />
      </PageShell>
    );
  }

  const home = homeQuery.data;
  const yourTribe = home.yourTribe;
  const tribeName = yourTribe?.tribe.name ?? guestTribeName;

  return (
    <PageShell variant="feed">
      <div className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{formatLongDate(new Date())}</p>
          <h1 className={styles.title}>Your reading list.</h1>
          {tribeName ? (
            <p className={styles.personal}>Welcome back, {tribeName} reader.</p>
          ) : (
            <p className={styles.personal}>
              A quiet place for tales. Personalise it whenever you like.
            </p>
          )}
        </header>

        <div className={styles.grid}>
          <div className={styles.main}>
            {searching ? (
              <SearchResults
                q={q?.trim() ?? ''}
                category={category ?? ''}
                categories={home.categories}
                onCategoryChange={setCategory}
                onClear={() => void navigate({ to: '/', search: {} })}
              />
            ) : (
              <>
                <section className={styles.today} aria-label="Today's tale">
                  <p className={styles.sectionEyebrow}>
                    <span className={styles.sectionRule} aria-hidden="true" />
                    Today&rsquo;s tale
                  </p>
                  <StoryCard story={home.storyOfTheDay} variant="hero" priority />
                </section>

                {yourTribe ? (
                  <section
                    className={styles.band}
                    style={
                      { '--accent': yourTribe.tribe.accentColor } as CSSProperties
                    }
                    aria-labelledby="your-tribe-title"
                  >
                    <div className={styles.bandHead}>
                      <div className={styles.bandIntro}>
                        <p className={styles.eyebrow}>Your tribe</p>
                        <h2 id="your-tribe-title" className={styles.bandTitle}>
                          More from {yourTribe.tribe.name}
                        </h2>
                      </div>
                      <Link
                        to="/tribes/$slug"
                        params={{ slug: yourTribe.tribe.slug }}
                        className={styles.textLink}
                      >
                        Visit publication →
                      </Link>
                    </div>
                    <div className={styles.bandStories}>
                      {yourTribe.stories.slice(0, 3).map((story) => (
                        <StoryCard key={story.id} story={story} variant="mini" />
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className={styles.prompt} aria-labelledby="choose-roots-title">
                    <div className={styles.promptText}>
                      <p className={styles.eyebrow}>Your roots</p>
                      <h2 id="choose-roots-title" className={styles.promptTitle}>
                        Choose your roots to personalise this feed.
                      </h2>
                      <p className={styles.promptBody}>
                        One publication, one doorway. You can change it any time — it lives on this
                        device.
                      </p>
                    </div>
                    <Link
                      to="/tribes"
                      search={{ onboarding: 1 }}
                      className={buttonClassName('secondary', 'sm')}
                    >
                      Choose a publication
                    </Link>
                  </section>
                )}

                <section className={styles.feed}>
                  <SectionHeader
                    title="From your publications"
                    action={<Link to="/library">View all →</Link>}
                  />
                  {follows.length === 0 ? (
                    <p className={styles.feedNote}>
                      Publications you follow will gather here. Until then, the newest tales from
                      across the archive.
                    </p>
                  ) : null}
                  <div className={styles.rows}>
                    {feed.map((story) => (
                      <StoryCard key={story.id} story={story} variant="row" />
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>

          <aside className={styles.aside} aria-label="Reading list sidebar">
            <HomeSidebar
              followedTribes={followedTribes}
              wisdomNotes={home.wisdomNotes}
              tribesLoading={tribesQuery.isPending}
            />
          </aside>
        </div>

        {searching ? null : (
          <DiscoverRail tribes={tribesQuery.data ?? []} loading={tribesQuery.isPending} />
        )}
      </div>
    </PageShell>
  );
}

function HomeSkeleton() {
  return (
    <PageShell variant="feed">
      <div className={styles.page}>
        <div className={styles.intro}>
          <Skeleton variant="text" lines={1} />
          <Skeleton variant="title" />
        </div>
        <div className={styles.grid}>
          <div className={styles.main}>
            <Skeleton variant="hero" />
            <Skeleton variant="row" />
            <Skeleton variant="row" />
            <Skeleton variant="row" />
          </div>
          <aside className={styles.aside}>
            <Skeleton variant="card" lines={3} />
            <Skeleton variant="card" lines={3} />
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
