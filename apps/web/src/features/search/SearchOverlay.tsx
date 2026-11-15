import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Link2, BookOpen, Compass } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useDebouncedValue } from '@/lib/hooks';
import { useCategories, useSearchSuggestions } from '@/lib/queries';
import { useUiStore } from '@/stores/ui';
import { Button, Dialog, FilterPills, SearchField, Skeleton } from '@/ui';

import styles from './SearchOverlay.module.css';

interface SearchParamsLike {
  q?: string;
  category?: string;
}

/**
 * Global search overlay. URL is the source of truth for results: submitting writes `/?q=&category=`
 * and the home route renders filtered results (shareable, back-button friendly).
 */
export function SearchOverlay() {
  const open = useUiStore((state) => state.searchOpen);
  const setOpen = useUiStore((state) => state.setSearchOpen);
  const navigate = useNavigate();
  const locationSearch = useRouterState({
    select: (state) => state.location.search as SearchParamsLike,
  });

  const [value, setValue] = useState('');
  const [category, setCategory] = useState('');

  const debounced = useDebouncedValue(value, 250);
  const suggestionsQuery = useSearchSuggestions(open ? debounced : '');
  const categoriesQuery = useCategories();

  useEffect(() => {
    if (open) {
      setValue(locationSearch.q ?? '');
      setCategory(locationSearch.category ?? '');
    }
  }, [open, locationSearch.q, locationSearch.category]);

  const categoryOptions = [
    { value: '', label: 'All tales' },
    ...(categoriesQuery.data ?? []).map((item) => ({ value: item.slug, label: item.name })),
  ];

  const commit = () => {
    const query = value.trim();
    void navigate({
      to: '/',
      search: {
        q: query || undefined,
        category: category || undefined,
      },
    });
    setOpen(false);
  };

  const openSuggestion = (type: 'story' | 'tribe', slug: string) => {
    setOpen(false);
    if (type === 'story') {
      void navigate({ to: '/stories/$slug', params: { slug } });
    } else {
      void navigate({ to: '/tribes/$slug', params: { slug } });
    }
  };

  const suggestions = suggestionsQuery.data ?? [];
  const showSuggestions = debounced.trim().length >= 2;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Content
        title="Search the archive"
        description="Find a tale by name, a publication, or the feeling you are after."
        className={styles.panel}
      >
        <SearchField
          value={value}
          onChange={setValue}
          onSubmit={commit}
          autoFocus
          label="Search tales and publications"
        />

        <div className={styles.filters}>
          <FilterPills
            options={categoryOptions}
            value={category}
            onChange={setCategory}
            label="Filter results by category"
          />
        </div>

        <div className={styles.suggestions} aria-live="polite">
          {showSuggestions && suggestionsQuery.isPending ? (
            <Skeleton variant="text" lines={3} />
          ) : null}

          {showSuggestions && suggestions.length > 0 ? (
            <ul className={styles.suggestionList}>
              {suggestions.map((suggestion) => {
                const Icon = suggestion.type === 'story' ? BookOpen : Compass;
                return (
                  <li key={`${suggestion.type}-${suggestion.slug}`}>
                    <button
                      type="button"
                      className={styles.suggestion}
                      onClick={() => openSuggestion(suggestion.type, suggestion.slug)}
                    >
                      <Icon size={16} aria-hidden="true" className={styles.suggestionIcon} />
                      <span className={styles.suggestionLabel}>{suggestion.label}</span>
                      {suggestion.hint ? (
                        <span className={styles.suggestionHint}>{suggestion.hint}</span>
                      ) : null}
                      <span className={styles.suggestionType}>
                        {suggestion.type === 'story' ? 'Tale' : 'Publication'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {showSuggestions &&
          !suggestionsQuery.isPending &&
          !suggestionsQuery.isError &&
          suggestions.length === 0 ? (
            <p className={styles.hint}>
              Nothing matched “{debounced.trim()}” yet. Try a publication, a place, or a virtue.
            </p>
          ) : null}

          {!showSuggestions ? (
            <p className={styles.hint}>
              <Link2 size={14} aria-hidden="true" /> Tip: every result keeps your place in the URL —
              you can share it.
            </p>
          ) : null}
        </div>

        <div className={styles.actions}>
          <Button onClick={commit}>Search tales</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setValue('');
              setCategory('');
            }}
          >
            Clear
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
