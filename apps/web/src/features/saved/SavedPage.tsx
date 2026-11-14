import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { SavedFilter, SavedStoryItem, StoryCard } from '@ubuntu-tales/shared';
import { REACTIONS } from '@ubuntu-tales/shared';
import { useEffect } from 'react';

import { isInProgress, useReadingProgressStore } from '@/features/reader/readingProgress';
import { formatTaleCount } from '@/lib/format';
import { requireAuth } from '@/features/auth';
import { useIsAuthenticated } from '@/stores/session';
import { useSavedStore } from '@/stores/saved';
import {
  Button,
  buttonClassName,
  EmptyState,
  Masthead,
  Ornament,
  PageShell,
  Skeleton,
  TaleRow,
} from '@/ui';

import { SavedFilters } from './SavedFilters';
import { countInProgress, filterSavedEntries } from './savedFilters';
import { flattenSavedPages, useSavedFeed, useSavedSentinel } from './savedFeed';
import { hydrateSavedFromApi } from './savedSync';
import styles from './SavedPage.module.css';

const APP_TITLE = 'Ubuntu Tales — Stories your grandmother knew';

/**
 * `/saved` — the reading list (design doc §7.8).
 *
 * Guests keep the Phase 1 on-device snapshot list. Signed-in readers use `GET /me/saved` with
 * All / In progress filters and real cursor pagination, progress hairlines from the account's
 * reading progress and a reflection tag from the account's reaction. Offline stays disabled
 * until downloads land.
 */
export function SavedPage() {
  const search = useSearch({ from: '/saved' });
  const navigate = useNavigate();
  const isAuthed = useIsAuthenticated();
  const filter: SavedFilter = search.filter ?? 'all';

  useEffect(() => {
    document.title = 'Your reading list — Ubuntu Tales';
    return () => {
      document.title = APP_TITLE;
    };
  }, []);

  const setFilter = (value: SavedFilter) => {
    void navigate({ to: '/saved', search: { filter: value } });
  };

  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        {isAuthed ? (
          <AccountSavedList filter={filter} onFilterChange={setFilter} />
        ) : (
          <GuestSavedList filter={filter} onFilterChange={setFilter} />
        )}
      </div>
    </PageShell>
  );
}

interface SavedListProps {
  filter: SavedFilter;
  onFilterChange: (value: SavedFilter) => void;
}

/* ------------------------------------------------------------------ guests -------------------- */

function GuestSavedList({ filter, onFilterChange }: SavedListProps) {
  const entries = useSavedStore((state) => state.entries);
  const progressBySlug = useReadingProgressStore((state) => state.bySlug);

  const filtered = filterSavedEntries(entries, filter, progressBySlug);
  const inProgress = countInProgress(entries, progressBySlug);

  const emptyState = entries.length === 0 ? (
    <EmptyState
      eyebrow="Your reading list"
      title="Nothing saved yet."
      body="Browse the archive and save the tales you want to keep for later."
      action={
        <Link to="/library" className={buttonClassName('primary')}>
          Browse the library
        </Link>
      }
    />
  ) : filter === 'offline' ? (
    <EmptyState
      eyebrow="Offline"
      title="Offline reading is coming."
      body="Downloads are a later chapter. Until they arrive, every saved tale is here whenever you are online."
      action={<Button onClick={() => onFilterChange('all')}>See all saved tales</Button>}
    />
  ) : filtered.length === 0 ? (
    <EmptyState
      eyebrow={filter === 'in-progress' ? 'In progress' : 'Your reading list'}
      title={filter === 'in-progress' ? 'Nothing in progress.' : 'Nothing saved yet.'}
      body={
        filter === 'in-progress'
          ? 'Open a saved tale and this list will mark your place in it.'
          : 'Browse the archive and save the tales you want to keep for later.'
      }
      action={
        filter === 'in-progress' ? (
          <Button onClick={() => onFilterChange('all')}>See all saved tales</Button>
        ) : (
          <Link to="/library" className={buttonClassName('primary')}>
            Browse the library
          </Link>
        )
      }
    />
  ) : null;

  return (
    <>
      <Masthead
        eyebrow="Saved on this device"
        title="Your reading list."
        intro={
          entries.length > 0
            ? `${formatTaleCount(entries.length)} kept on this device${
                inProgress > 0 ? `, ${inProgress} in progress` : ''
              }.`
            : 'The tales you save will gather here, ready for a quiet evening.'
        }
      />

      <div className={styles.controls}>
        <SavedFilters value={filter} onChange={onFilterChange} />
        <p className={styles.note}>Offline reading arrives with downloads, in a later chapter.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => requireAuth(undefined, { redirectTo: '/saved' })}
        >
          Sign in to keep this list on every device
        </Button>
      </div>

      {emptyState ?? (
        <ul className={styles.rows}>
          {filtered.map((entry) => {
            const progress = progressBySlug[entry.story.slug];
            const started = isInProgress(progress);
            return (
              <li key={entry.story.id} className={styles.rowItem}>
                <TaleRow
                  story={entry.story}
                  progressPercent={started ? progress?.percent : undefined}
                  action={
                    started ? (
                      <Link
                        to="/stories/$slug"
                        params={{ slug: entry.story.slug }}
                        className={styles.continue}
                      >
                        Continue reading
                      </Link>
                    ) : null
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/* -------------------------------------------------------------- signed in -------------------- */

function AccountSavedList({ filter, onFilterChange }: SavedListProps) {
  const feed = useSavedFeed(filter, filter !== 'offline');
  const items = flattenSavedPages(feed.data?.pages);
  const canObserve = typeof IntersectionObserver !== 'undefined';
  const sentinelRef = useSavedSentinel({
    hasNextPage: Boolean(feed.hasNextPage),
    isFetchingNextPage: feed.isFetchingNextPage,
    fetchNextPage: feed.fetchNextPage,
  });

  // Mirror the account reading list into the store so every save affordance agrees.
  useEffect(() => {
    void hydrateSavedFromApi();
  }, []);

  const total = feed.data?.pages[0]?.total ?? items.length;
  const note = <p className={styles.note}>Offline reading arrives with downloads, in a later chapter.</p>;

  const controls = (
    <div className={styles.controls}>
      <SavedFilters value={filter} onChange={onFilterChange} />
      {note}
    </div>
  );

  if (filter === 'offline') {
    return (
      <>
        <Masthead eyebrow="On your account" title="Your reading list." />
        {controls}
        <EmptyState
          eyebrow="Offline"
          title="Offline reading is coming."
          body="Downloads are a later chapter. Until they arrive, every saved tale is here whenever you are online."
          action={<Button onClick={() => onFilterChange('all')}>See all saved tales</Button>}
        />
      </>
    );
  }

  if (feed.isPending) {
    return (
      <>
        <Masthead eyebrow="On your account" title="Your reading list." />
        {controls}
        <div className={styles.skeletonRows}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} variant="row" lines={2} />
          ))}
        </div>
      </>
    );
  }

  if (feed.isError) {
    return (
      <>
        <Masthead eyebrow="On your account" title="Your reading list." />
        {controls}
        <EmptyState
          variant="error"
          eyebrow="The list went quiet"
          title="We could not open your reading list."
          body="The connection may have slipped. Try once more — your tales are still saved."
          action={<Button onClick={() => void feed.refetch()}>Try again</Button>}
        />
      </>
    );
  }

  const intro =
    filter === 'in-progress'
      ? total > 0
        ? `${formatTaleCount(total)} in progress.`
        : 'Tales you have started but not finished will gather here.'
      : total > 0
        ? `${formatTaleCount(total)} saved on your account, ready for a quiet evening.`
        : 'The tales you save will gather here, ready for a quiet evening.';

  const emptyState =
    items.length === 0 ? (
      <EmptyState
        eyebrow={filter === 'in-progress' ? 'In progress' : 'Your reading list'}
        title={filter === 'in-progress' ? 'Nothing in progress.' : 'Nothing saved yet.'}
        body={
          filter === 'in-progress'
            ? 'Open a saved tale and this list will mark your place in it.'
            : 'Browse the archive and save the tales you want to keep for later.'
        }
        action={
          filter === 'in-progress' ? (
            <Button onClick={() => onFilterChange('all')}>See all saved tales</Button>
          ) : (
            <Link to="/library" className={buttonClassName('primary')}>
              Browse the library
            </Link>
          )
        }
      />
    ) : null;

  return (
    <>
      <Masthead eyebrow="On your account" title="Your reading list." intro={intro} />
      {controls}

      {emptyState ?? (
        <>
          <ul className={styles.rows}>
            {items.map((item) => {
              const started =
                item.progressPercent > 0 && item.progressPercent < 100 && !item.completed;
              const reflection = item.reflection
                ? REACTIONS.find((reaction) => reaction.type === item.reflection)
                : undefined;
              return (
                <li key={item.id} className={styles.rowItem}>
                  <TaleRow
                    story={withSavedViewer(item)}
                    progressPercent={started ? item.progressPercent : undefined}
                    action={
                      <span className={styles.rowActions}>
                        {reflection ? (
                          <span className={styles.reflection} title={reflection.meaning}>
                            <span aria-hidden="true">{reflection.emoji}</span> {reflection.label}
                          </span>
                        ) : null}
                        {started ? (
                          <Link
                            to="/stories/$slug"
                            params={{ slug: item.slug }}
                            className={styles.continue}
                          >
                            Continue reading
                          </Link>
                        ) : null}
                      </span>
                    }
                  />
                </li>
              );
            })}
          </ul>

          {feed.isFetchingNextPage ? (
            <div className={styles.skeletonRows}>
              {Array.from({ length: 2 }, (_, index) => (
                <Skeleton key={index} variant="row" lines={2} />
              ))}
            </div>
          ) : null}

          {feed.hasNextPage && !canObserve ? (
            <div className={styles.loadMore}>
              <Button variant="secondary" onClick={() => void feed.fetchNextPage()}>
                Load more tales
              </Button>
            </div>
          ) : null}

          <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

          {!feed.hasNextPage && !feed.isFetchingNextPage ? (
            <div className={styles.endNote}>
              <Ornament />
              <p>You have reached the end of your reading list.</p>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

/**
 * The saved-list rows come from `GET /me/saved`, which may omit the viewer overlay. Supply it so
 * the save icon and any viewer-aware affordance render correct state immediately.
 */
function withSavedViewer(item: SavedStoryItem): StoryCard {
  if (item.viewer?.saved) return item;
  return {
    ...item,
    viewer: {
      saved: true,
      progressPercent: item.progressPercent,
      completed: item.completed,
      reaction: item.reflection ?? null,
    },
  };
}
