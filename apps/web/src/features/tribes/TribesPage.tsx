import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { TribeSummary } from '@ubuntu-tales/shared';
import { LOW_STORY_THRESHOLD, REGIONS, REGION_LABELS } from '@ubuntu-tales/shared';
import { useEffect, useState } from 'react';

import { useDebouncedValue, useDocumentTitle } from '@/lib/hooks';
import { usePublicConfig, useTribes } from '@/lib/queries';
import { useFollowsStore } from '@/stores/follows';
import { useOnboardingStore } from '@/stores/onboarding';
import { useTribeStore } from '@/stores/tribe';
import {
  Button,
  Dialog,
  EmptyState,
  FilterPills,
  Masthead,
  PageShell,
  PublicationCard,
  SearchField,
  Skeleton,
} from '@/ui';

import styles from './TribesPage.module.css';

type RegionFilter = '' | (typeof REGIONS)[number];

/**
 * `/tribes` — the publications index. Editorial masthead, search, region pills, publication cards.
 * With `?onboarding=1` it becomes the one-step "choose your roots" flow (guest tribe in
 * localStorage, low-story dialog, sticky Begin reading action).
 */
export function TribesPage() {
  useDocumentTitle('The publications — Ubuntu Tales');
  const { onboarding } = useSearch({ from: '/tribes/' });
  const isOnboarding = String(onboarding ?? '') === '1';
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 250);
  const [region, setRegion] = useState<RegionFilter>('');

  const tribesQuery = useTribes({
    q: debouncedQuery.trim() || undefined,
    region: region || undefined,
  });
  const configQuery = usePublicConfig();
  const lowStoryThreshold = configQuery.data?.lowStoryThreshold ?? LOW_STORY_THRESHOLD;

  const guestTribeSlug = useTribeStore((state) => state.slug);
  const setGuestTribe = useTribeStore((state) => state.setTribe);
  const follow = useFollowsStore((state) => state.follow);
  const completeOnboarding = useOnboardingStore((state) => state.complete);

  const [selectedSlug, setSelectedSlug] = useState<string | null>(guestTribeSlug);
  const [pendingLowStory, setPendingLowStory] = useState<TribeSummary | null>(null);

  useEffect(() => {
    setSelectedSlug(guestTribeSlug);
  }, [guestTribeSlug]);

  const tribes = tribesQuery.data ?? [];
  const selectedTribe = tribes.find((tribe) => tribe.slug === selectedSlug) ?? null;
  const choose = (tribe: TribeSummary) => setSelectedSlug(tribe.slug);

  const handleSelect = (tribe: TribeSummary) => {
    if (tribe.publishedStoryCount < lowStoryThreshold) {
      setPendingLowStory(tribe);
      return;
    }
    choose(tribe);
  };

  const beginReading = () => {
    if (!selectedTribe) return;
    setGuestTribe({ slug: selectedTribe.slug, name: selectedTribe.name });
    follow(selectedTribe.slug);
    completeOnboarding();
    void navigate({ to: '/' });
  };

  const skip = () => {
    completeOnboarding();
    void navigate({ to: '/' });
  };

  const clearFilters = () => {
    setQuery('');
    setRegion('');
  };

  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        {isOnboarding ? (
          <div className={styles.stepBar}>
            <p className={styles.stepLabel}>Step 1 of 1 · Your roots</p>
            <button type="button" className={styles.skipButton} onClick={skip}>
              Skip for now
            </button>
          </div>
        ) : null}

        <Masthead
          eyebrow="The publications"
          title="Choose the voices you want to hear."
          intro="Each publication is a tribe — a masthead, a voice, and a shelf of tales. Follow a few to shape your reading list, or pick one as your roots."
        />

        <div className={styles.controls}>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search publications…"
            label="Search publications"
            className={styles.search}
          />
          <FilterPills
            label="Filter publications by region"
            value={region}
            onChange={(value) => setRegion(value as RegionFilter)}
            options={[
              { value: '', label: 'All regions' },
              ...REGIONS.map((item) => ({ value: item, label: REGION_LABELS[item] })),
            ]}
          />
          <p className={styles.count} aria-live="polite">
            {tribesQuery.isPending
              ? 'Gathering publications…'
              : `${tribes.length} publication${tribes.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {tribesQuery.isPending ? (
          <div className={styles.grid} aria-hidden="true">
            <Skeleton variant="card" lines={3} />
            <Skeleton variant="card" lines={3} />
            <Skeleton variant="card" lines={3} />
            <Skeleton variant="card" lines={3} />
          </div>
        ) : null}

        {tribesQuery.isError ? (
          <EmptyState
            variant="error"
            eyebrow="The archive went quiet"
            title="We could not gather the publications."
            body="Something interrupted the connection. Try once more — the voices are still there."
            action={<Button onClick={() => void tribesQuery.refetch()}>Try again</Button>}
          />
        ) : null}

        {tribesQuery.isSuccess && tribes.length === 0 ? (
          <EmptyState
            eyebrow="No voices found"
            title="That search came back quiet."
            body="Try another spelling or region, or clear the filters to browse every publication."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : null}

        {tribes.length > 0 ? (
          <ul className={styles.grid}>
            {tribes.map((tribe) => (
              <li key={tribe.id}>
                <PublicationCard
                  tribe={tribe}
                  selected={isOnboarding && selectedSlug === tribe.slug}
                  onSelect={isOnboarding ? handleSelect : undefined}
                />
              </li>
            ))}
          </ul>
        ) : null}

        {!isOnboarding ? (
          <p className={styles.footerNote}>
            Followed publications are kept on this device until accounts arrive.{' '}
            <Link to="/" className={styles.footerLink}>
              Back to your reading list
            </Link>
          </p>
        ) : (
          <div className={styles.spacerForBar} aria-hidden="true" />
        )}
      </div>

      {isOnboarding ? (
        <div className={styles.stickyBar}>
          <div className={styles.stickyInner}>
            <p className={styles.stickyText}>
              {selectedTribe ? (
                <>
                  Your roots: <strong>{selectedTribe.name}</strong>
                </>
              ) : (
                'Choose one publication to begin.'
              )}
            </p>
            <Button size="lg" onClick={beginReading} disabled={!selectedTribe}>
              Begin reading
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog.Root
        open={Boolean(pendingLowStory)}
        onOpenChange={(open) => {
          if (!open) setPendingLowStory(null);
        }}
      >
        <Dialog.Content
          size="sm"
          title="The fire is still being built."
          description={
            pendingLowStory
              ? `${pendingLowStory.name} has only ${pendingLowStory.publishedStoryCount} tale${
                  pendingLowStory.publishedStoryCount === 1 ? '' : 's'
                } so far. We are still gathering its stories.`
              : undefined
          }
        >
          <div className={styles.dialogActions}>
            <Button
              onClick={() => {
                if (pendingLowStory) choose(pendingLowStory);
                setPendingLowStory(null);
              }}
            >
              Choose anyway
            </Button>
            <Button variant="secondary" onClick={() => setPendingLowStory(null)}>
              Explore others
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </PageShell>
  );
}
