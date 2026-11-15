import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { AuthorSummary, CategorySummary, LibraryTab } from '@ubuntu-tales/shared';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';

import { formatTaleCount, joinMeta } from '@/lib/format';
import { useCategories } from '@/lib/queries';
import {
  Avatar,
  Button,
  buttonClassName,
  EmptyState,
  FilterPills,
  Masthead,
  Ornament,
  PageShell,
  Skeleton,
  Tabs,
  TaleRow,
} from '@/ui';

import {
  flattenPages,
  useInfiniteSentinel,
  useLibraryFeed,
  useVoicesFeed,
  type ArchiveTab,
} from './libraryFeed';
import styles from './LibraryPage.module.css';

const APP_TITLE = 'Ubuntu Tales — Stories your grandmother knew';

/**
 * `/library?tab=stories|audio|authors` — the archive (design doc §7.6). Editorial masthead, tabs
 * bound to the URL, category pills, hairline list rows and real cursor-paginated infinite scroll.
 */
export function LibraryPage() {
  const search = useSearch({ from: '/library' });
  const navigate = useNavigate();
  const categoriesQuery = useCategories();
  const tab = search.tab ?? 'stories';
  const category = search.category ?? '';

  useEffect(() => {
    document.title = 'The library — Ubuntu Tales';
    return () => {
      document.title = APP_TITLE;
    };
  }, []);

  const setTab = (value: string) => {
    void navigate({
      to: '/library',
      search: { tab: value as LibraryTab, category: search.category },
    });
  };

  const setCategory = (value: string) => {
    void navigate({
      to: '/library',
      search: { tab: tab as LibraryTab, category: value || undefined },
    });
  };

  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        <Masthead
          eyebrow="The archive"
          title="The library."
          intro="Every tale in the collection, kept in one quiet place. Read by publication, by mood, or follow a voice you want to hear again."
        />

        <Tabs.Root value={tab} onValueChange={setTab}>
          <Tabs.List aria-label="Library sections">
            <Tabs.Trigger value="stories">All tales</Tabs.Trigger>
            <Tabs.Trigger value="audio">Audio</Tabs.Trigger>
            <Tabs.Trigger value="authors">Voices</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="stories">
            <TaleArchiveTab
              tab="stories"
              category={category}
              categories={categoriesQuery.data ?? []}
              onCategoryChange={setCategory}
              onBrowseStories={() => setTab('stories')}
            />
          </Tabs.Content>

          <Tabs.Content value="audio">
            <TaleArchiveTab
              tab="audio"
              category=""
              categories={categoriesQuery.data ?? []}
              onCategoryChange={setCategory}
              onBrowseStories={() => setTab('stories')}
            />
          </Tabs.Content>

          <Tabs.Content value="authors">
            <VoicesTab />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </PageShell>
  );
}

interface TaleArchiveTabProps {
  tab: ArchiveTab;
  category: string;
  categories: CategorySummary[];
  onCategoryChange: (value: string) => void;
  onBrowseStories: () => void;
}

function TaleArchiveTab({
  tab,
  category,
  categories,
  onCategoryChange,
  onBrowseStories,
}: TaleArchiveTabProps) {
  const feed = useLibraryFeed(tab, tab === 'stories' ? category : '');
  const stories = flattenPages(feed.data?.pages);
  const canObserve = typeof IntersectionObserver !== 'undefined';
  const sentinelRef = useInfiniteSentinel({
    hasNextPage: Boolean(feed.hasNextPage),
    isFetchingNextPage: feed.isFetchingNextPage,
    fetchNextPage: feed.fetchNextPage,
  });

  if (feed.isPending) return <ArchiveSkeleton />;

  if (feed.isError) {
    return (
      <EmptyState
        variant="error"
        eyebrow="The archive went quiet"
        title="We could not open the shelves."
        body="The connection may have slipped. Try once more — the tales are still here."
        action={<Button onClick={() => void feed.refetch()}>Try again</Button>}
      />
    );
  }

  if (stories.length === 0) {
    if (tab === 'audio') {
      return (
        <div className={styles.audioEmpty}>
          <p className={styles.eyebrow}>Narrations</p>
          <h2 className={styles.audioTitle}>Narrations are being recorded.</h2>
          <p className={styles.audioBody}>
            The griots are in the studio, telling these tales aloud. Until the recordings are
            ready, every one of them is here to read.
          </p>
          <Button onClick={onBrowseStories}>Read the tales</Button>
        </div>
      );
    }

    return (
      <EmptyState
        eyebrow="The archive"
        title={category ? 'No tales in this category yet.' : 'The shelves are being filled.'}
        body={
          category
            ? 'Try another category — the collection is still growing.'
            : 'New tales are added as the griots tell them. Begin with your reading list.'
        }
        action={
          category ? (
            <Button onClick={() => onCategoryChange('')}>Show all tales</Button>
          ) : (
            <Link to="/" className={buttonClassName('secondary')}>
              Back to the reading list
            </Link>
          )
        }
      />
    );
  }

  return (
    <div className={styles.panel}>
      {tab === 'stories' ? (
        <FilterPills
          label="Filter tales by category"
          options={[
            { value: '', label: 'All tales' },
            ...categories.map((entry) => ({ value: entry.slug, label: entry.name })),
          ]}
          value={category}
          onChange={onCategoryChange}
        />
      ) : null}

      <ul className={styles.rows}>
        {stories.map((story) => (
          <li key={story.id} className={styles.rowItem}>
            <TaleRow story={story} />
          </li>
        ))}
      </ul>

      {feed.isFetchingNextPage ? <ArchiveSkeleton rows={2} /> : null}

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
          <p>You have reached the end of the archive.</p>
        </div>
      ) : null}
    </div>
  );
}

function VoicesTab() {
  const feed = useVoicesFeed();
  const voices = flattenPages(feed.data?.pages);
  const canObserve = typeof IntersectionObserver !== 'undefined';
  const sentinelRef = useInfiniteSentinel({
    hasNextPage: Boolean(feed.hasNextPage),
    isFetchingNextPage: feed.isFetchingNextPage,
    fetchNextPage: feed.fetchNextPage,
  });

  if (feed.isPending) return <ArchiveSkeleton />;

  if (feed.isError) {
    return (
      <EmptyState
        variant="error"
        eyebrow="The voices went quiet"
        title="We could not open the griots' names."
        body="The connection may have slipped. Try once more."
        action={<Button onClick={() => void feed.refetch()}>Try again</Button>}
      />
    );
  }

  if (voices.length === 0) {
    return (
      <EmptyState
        eyebrow="The griots"
        title="The voices are being introduced."
        body="Narrators will appear here as their tales join the archive."
        action={
          <Link to="/library" className={buttonClassName('secondary')}>
            Back to all tales
          </Link>
        }
      />
    );
  }

  return (
    <div className={styles.panel}>
      <ul className={styles.rows}>
        {voices.map((author) => (
          <li key={author.id} className={styles.rowItem}>
            <VoiceRow author={author} />
          </li>
        ))}
      </ul>

      {feed.isFetchingNextPage ? <ArchiveSkeleton rows={2} /> : null}

      {feed.hasNextPage && !canObserve ? (
        <div className={styles.loadMore}>
          <Button variant="secondary" onClick={() => void feed.fetchNextPage()}>
            More voices
          </Button>
        </div>
      ) : null}

      <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />

      {!feed.hasNextPage && !feed.isFetchingNextPage ? (
        <div className={styles.endNote}>
          <Ornament />
          <p>You have met every griot in the archive.</p>
        </div>
      ) : null}
    </div>
  );
}

function VoiceRow({ author }: { author: AuthorSummary }) {
  const style = {
    '--accent': author.accentColor ?? 'var(--terracotta)',
  } as CSSProperties;

  return (
    <Link to="/authors/$slug" params={{ slug: author.slug }} className={styles.voiceRow} style={style}>
      <Avatar
        name={author.name}
        image={author.avatar}
        accentColor={author.accentColor}
        size="md"
      />
      <span className={styles.voiceBody}>
        <span className={styles.voiceName}>{author.name}</span>
        {author.roleLabel ? <span className={styles.voiceRole}>{author.roleLabel}</span> : null}
        {author.bio ? <span className={styles.voiceBio}>{author.bio}</span> : null}
        <span className={styles.voiceMeta}>
          {joinMeta([
            formatTaleCount(author.publishedStoryCount),
            author.tribeNames?.join(' · '),
          ])}
        </span>
      </span>
    </Link>
  );
}

function ArchiveSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.skeletonRows}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="row" lines={2} />
      ))}
    </div>
  );
}
