import type { CategorySummary } from '@ubuntu-tales/shared';

import { useStories } from '@/lib/queries';
import {
  Button,
  EmptyState,
  FilterPills,
  Skeleton,
  TaleRow,
} from '@/ui';

import styles from './SearchResults.module.css';

export interface SearchResultsProps {
  q: string;
  category: string;
  categories: CategorySummary[];
  onCategoryChange: (category: string) => void;
  onClear: () => void;
}

/** URL-driven home search results (`/?q=&category=`), the target of the search overlay. */
export function SearchResults({
  q,
  category,
  categories,
  onCategoryChange,
  onClear,
}: SearchResultsProps) {
  const results = useStories({
    q: q || undefined,
    category: category || undefined,
    limit: 24,
    enabled: Boolean(q || category),
  });

  const categoryName = categories.find((item) => item.slug === category)?.name;
  const categoryOptions = [
    { value: '', label: 'All tales' },
    ...categories.map((item) => ({ value: item.slug, label: item.name })),
  ];
  const items = results.data?.items ?? [];

  return (
    <section className={styles.section} aria-labelledby="search-results-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Search the archive</p>
        <h2 id="search-results-title" className={styles.title}>
          {q ? <>Results for “{q}”</> : 'Tales by category'}
        </h2>
        <p className={styles.meta}>
          {results.isPending
            ? 'Looking through the archive…'
            : `${items.length} tale${items.length === 1 ? '' : 's'}${
                categoryName ? ` in ${categoryName}` : ''
              }`}
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear search
          </button>
        </p>
      </header>

      <FilterPills
        options={categoryOptions}
        value={category}
        onChange={onCategoryChange}
        label="Filter results by category"
      />

      {results.isPending ? (
        <div className={styles.rows}>
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      ) : null}

      {results.isError ? (
        <EmptyState
          variant="error"
          eyebrow="The archive went quiet"
          title="We could not reach the tales."
          body="The search may have timed out. Try again, or browse the library instead."
          action={<Button onClick={() => void results.refetch()}>Try again</Button>}
        />
      ) : null}

      {results.isSuccess && items.length === 0 ? (
        <EmptyState
          eyebrow="No tales found"
          title="Nothing matched that path."
          body="Try another spelling, a publication name, or a quieter word like “patience”."
          action={<Button variant="secondary" onClick={onClear}>Clear search</Button>}
        />
      ) : null}

      {items.length > 0 ? (
        <div className={styles.rows}>
          {items.map((story) => (
            <TaleRow key={story.id} story={story} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
