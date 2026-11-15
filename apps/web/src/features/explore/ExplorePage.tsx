import { Link } from '@tanstack/react-router';
import type { ExplorePoint, ExploreResponse, Region } from '@ubuntu-tales/shared';
import { REGIONS, REGION_LABELS, type StoryCard } from '@ubuntu-tales/shared';
import { Globe2, List, Map as MapIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useDocumentTitle } from '@/lib/hooks';
import { useExplore } from '@/lib/queries';
import { Button, EmptyState, FilterPills, Masthead, PageShell, Skeleton } from '@/ui';

import { pinRadius, resolveSelection, totalStories as sumStories, visiblePoints as filterPoints } from './explore.logic';
import { AFRICA_PATH, AFRICA_VIEWBOX, projectToMap, WORLD_PATH, WORLD_VIEWBOX } from './world-geometry';
import styles from './ExplorePage.module.css';

type RegionFilter = '' | Region;
type MapView = 'africa' | 'world';

/**
 * `/explore` — the atlas. Every publication is pinned to the place its tales come from; opening a pin
 * offers that publication's stories. The list view is the same data without the map, for keyboard and
 * screen-reader readers and for anyone who prefers a plain index.
 */
export function ExplorePage() {
  useDocumentTitle('The atlas — Ubuntu Tales');
  const explore = useExplore();
  const [region, setRegion] = useState<RegionFilter>('');
  const [mapView, setMapView] = useState<MapView>('africa');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [listView, setListView] = useState(false);

  const data = explore.data;
  const visible = useMemo(() => filterPoints(data?.points ?? [], region), [data, region]);

  // Keep a sensible selection as filters change.
  useEffect(() => {
    setSelectedSlug((current) => resolveSelection(visible, current));
  }, [visible]);

  const selected = visible.find((point) => point.tribe.slug === selectedSlug) ?? null;
  const storyCount = sumStories(visible);

  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        <Masthead
          eyebrow="The atlas"
          title="The world that tells these tales."
          intro="Each pin is a publication. Follow one to the ground it grows from, then open a tale — the map is only the beginning of the journey."
        />

        {explore.isPending ? <MapSkeleton /> : null}

        {explore.isError ? (
          <EmptyState
            variant="error"
            eyebrow="The atlas went quiet"
            title="We could not draw the map."
            body="Something interrupted the connection. Try once more — the places are still there."
            action={<Button onClick={() => void explore.refetch()}>Try again</Button>}
          />
        ) : null}

        {explore.isSuccess && (data?.points.length ?? 0) === 0 ? (
          <EmptyState
            eyebrow="No places yet"
            title="The atlas is still being drawn."
            body="Publications will appear here as their homelands are placed on the map."
            action={<Link to="/tribes">Browse the publications</Link>}
          />
        ) : null}

        {explore.isSuccess && data && data.points.length > 0 ? (
          <>
            <div className={styles.controls}>
              <FilterPills
                label="Filter places by region"
                value={region}
                onChange={(value) => setRegion(value as RegionFilter)}
                options={[
                  { value: '', label: 'All regions' },
                  ...REGIONS.map((item) => ({ value: item, label: REGION_LABELS[item] })),
                ]}
              />
              <div className={styles.mapControls}>
                <div className={styles.segmented} role="group" aria-label="Map view">
                  <button
                    type="button"
                    className={mapView === 'africa' ? styles.segmentActive : styles.segment}
                    aria-pressed={mapView === 'africa'}
                    onClick={() => setMapView('africa')}
                  >
                    <MapIcon size={15} aria-hidden="true" /> Africa
                  </button>
                  <button
                    type="button"
                    className={mapView === 'world' ? styles.segmentActive : styles.segment}
                    aria-pressed={mapView === 'world'}
                    onClick={() => setMapView('world')}
                  >
                    <Globe2 size={15} aria-hidden="true" /> World
                  </button>
                </div>
                <button
                  type="button"
                  className={listView ? styles.segmentActive : styles.segment}
                  aria-pressed={listView}
                  onClick={() => setListView((current) => !current)}
                >
                  <List size={15} aria-hidden="true" /> List view
                </button>
              </div>
            </div>

            <p className={styles.count} aria-live="polite">
              {visible.length} publication{visible.length === 1 ? '' : 's'} ·{' '}
              {storyCount} tale{storyCount === 1 ? '' : 's'}
              {region ? ` in ${REGION_LABELS[region]}` : ' across the continent'}
            </p>

            {listView ? null : (
              <div className={styles.mapWrap}>
                <WorldMap
                  points={visible}
                  selectedSlug={selectedSlug}
                  onSelect={setSelectedSlug}
                  viewBox={mapView === 'africa' ? AFRICA_VIEWBOX : WORLD_VIEWBOX}
                />
                <p className={styles.mapHint}>
                  Choose a pin to open its publication. Pins are sized by how many tales live there.
                </p>
              </div>
            )}

            <div className={styles.layout}>
              <div className={styles.placeList} aria-label="Publications on the map">
                <h2 className={styles.sectionTitle}>Places</h2>
                <ul className={styles.places}>
                  {visible.map((point) => (
                    <li key={point.tribe.slug}>
                      <button
                        type="button"
                        className={
                          point.tribe.slug === selectedSlug ? styles.placeActive : styles.place
                        }
                        aria-pressed={point.tribe.slug === selectedSlug}
                        onClick={() => setSelectedSlug(point.tribe.slug)}
                      >
                        <span
                          className={styles.dot}
                          style={{ background: point.tribe.accentColor }}
                          aria-hidden="true"
                        />
                        <span className={styles.placeText}>
                          <span className={styles.placeName}>{point.tribe.name}</span>
                          <span className={styles.placeMeta}>
                            {point.placeLabel ?? REGION_LABELS[point.tribe.region]} ·{' '}
                            {point.storyCount} tale{point.storyCount === 1 ? '' : 's'}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.panel}>
                {selected ? <PlacePanel point={selected} /> : null}
                <RegionSummary data={data} onPick={setRegion} activeRegion={region} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}

function WorldMap({
  points,
  selectedSlug,
  onSelect,
  viewBox,
}: {
  points: ExplorePoint[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  viewBox: string;
}) {
  return (
    <svg
      className={styles.map}
      viewBox={viewBox}
      role="group"
      aria-label="Map of publications by homeland"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={WORLD_PATH} className={styles.land} />
      <path d={AFRICA_PATH} className={styles.africa} />
      {points.map((point) => {
        const { x, y } = projectToMap(point.latitude, point.longitude);
        const active = point.tribe.slug === selectedSlug;
        const radius = pinRadius(point.storyCount);
        return (
          <g
            key={point.tribe.slug}
            role="button"
            tabIndex={0}
            aria-label={`${point.tribe.name} — ${point.storyCount} tale${point.storyCount === 1 ? '' : 's'}, ${point.placeLabel ?? REGION_LABELS[point.tribe.region]}`}
            aria-pressed={active}
            className={styles.pinGroup}
            onClick={() => onSelect(point.tribe.slug)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(point.tribe.slug);
              }
            }}
          >
            <circle
              cx={x}
              cy={y}
              r={radius + (active ? 7 : 4)}
              className={styles.pinHalo}
              style={{ fill: point.tribe.accentColor }}
            />
            <circle
              cx={x}
              cy={y}
              r={radius}
              className={active ? styles.pinActive : styles.pin}
              style={{ fill: point.tribe.accentColor }}
            />
            <title>
              {point.tribe.name} — {point.storyCount} tale{point.storyCount === 1 ? '' : 's'}
            </title>
          </g>
        );
      })}
    </svg>
  );
}

function PlacePanel({ point }: { point: ExplorePoint }) {
  return (
    <section className={styles.publication} aria-labelledby="explore-place-name">
      <p className={styles.placeEyebrow}>
        {REGION_LABELS[point.tribe.region]}
        {point.placeLabel ? ` · ${point.placeLabel}` : ''}
      </p>
      <h2 id="explore-place-name" className={styles.placeTitle}>
        <Link to="/tribes/$slug" params={{ slug: point.tribe.slug }}>
          {point.tribe.name}
        </Link>
      </h2>
      {point.tribe.tagline ? <p className={styles.tagline}>{point.tribe.tagline}</p> : null}
      {point.tribe.description ? <p className={styles.description}>{point.tribe.description}</p> : null}

      {point.featuredStories.length > 0 ? (
        <>
          <h3 className={styles.storiesTitle}>Tales from here</h3>
          <ul className={styles.stories}>
            {point.featuredStories.map((story) => (
              <li key={story.id}>
                <ExploreStoryRow story={story} />
              </li>
            ))}
          </ul>
          <Link to="/tribes/$slug" params={{ slug: point.tribe.slug }} className={styles.allLink}>
            Read the whole publication →
          </Link>
        </>
      ) : (
        <p className={styles.emptyNote}>
          No tales are published here yet. Follow the publication and they will arrive.
        </p>
      )}
    </section>
  );
}

function ExploreStoryRow({ story }: { story: StoryCard }) {
  return (
    <Link to="/stories/$slug" params={{ slug: story.slug }} className={styles.storyRow}>
      <img src={story.cover.url} alt="" width={56} height={44} loading="lazy" className={styles.storyThumb} />
      <span className={styles.storyText}>
        <span className={styles.storyTitle}>{story.title}</span>
        <span className={styles.storyMeta}>
          {story.category.name} · {story.readTimeMinutes} min read
          {story.hasAudio ? ' · audio' : ''}
        </span>
      </span>
    </Link>
  );
}

function RegionSummary({
  data,
  onPick,
  activeRegion,
}: {
  data: ExploreResponse;
  onPick: (region: Region | '') => void;
  activeRegion: Region | '';
}) {
  return (
    <section className={styles.regions} aria-labelledby="explore-regions">
      <h2 id="explore-regions" className={styles.sectionTitle}>
        By region
      </h2>
      <ul className={styles.regionList}>
        {data.regions.map((entry) => (
          <li key={entry.region}>
            <button
              type="button"
              className={entry.region === activeRegion ? styles.regionActive : styles.region}
              aria-pressed={entry.region === activeRegion}
              onClick={() => onPick(entry.region === activeRegion ? '' : entry.region)}
            >
              <span>{REGION_LABELS[entry.region]}</span>
              <span className={styles.regionCount}>
                {entry.publicationCount} pub · {entry.storyCount} tales
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.mapNote}>
        Places are the cultural homelands of these traditions, not borders. Some tales travel far
        from home — that is part of the story too.
      </p>
    </section>
  );
}

function MapSkeleton() {
  return (
    <div className={styles.skeleton}>
      <Skeleton variant="card" />
      <Skeleton lines={3} />
    </div>
  );
}
