import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { SavedFilter } from '@ubuntu-tales/shared';
import { useEffect } from 'react';

import { isInProgress, useReadingProgressStore } from '@/features/reader/readingProgress';
import { formatTaleCount } from '@/lib/format';
import { useSavedStore } from '@/stores/saved';
import { Button, buttonClassName, EmptyState, Masthead, PageShell, TaleRow } from '@/ui';

import { SavedFilters } from './SavedFilters';
import { countInProgress, filterSavedEntries } from './savedFilters';
import styles from './SavedPage.module.css';

const APP_TITLE = 'Ubuntu Tales — Stories your grandmother knew';

/**
 * `/saved` — the on-device reading list (design doc §7.8). Snapshot rows render instantly from the
 * saved store, progress hairlines come from the local reading-progress store, and unsaving removes
 * a row immediately with a toast.
 */
export function SavedPage() {
  const search = useSearch({ from: '/saved' });
  const navigate = useNavigate();
  const entries = useSavedStore((state) => state.entries);
  const progressBySlug = useReadingProgressStore((state) => state.bySlug);

  const filter: SavedFilter = search.filter ?? 'all';
  const filtered = filterSavedEntries(entries, filter, progressBySlug);
  const inProgress = countInProgress(entries, progressBySlug);

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
          <SavedFilters value={filter} onChange={setFilter} />
          <p className={styles.note}>Offline reading arrives with downloads, in a later chapter.</p>
        </div>

        {entries.length === 0 ? (
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
            action={<Button onClick={() => setFilter('all')}>See all saved tales</Button>}
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
                <Button onClick={() => setFilter('all')}>See all saved tales</Button>
              ) : (
                <Link to="/library" className={buttonClassName('primary')}>
                  Browse the library
                </Link>
              )
            }
          />
        ) : (
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
      </div>
    </PageShell>
  );
}
