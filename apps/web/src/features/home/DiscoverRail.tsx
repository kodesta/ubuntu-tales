import { Link } from '@tanstack/react-router';
import type { TribeSummary } from '@ubuntu-tales/shared';

import { PublicationCard, SectionHeader, Skeleton } from '@/ui';

import styles from './DiscoverRail.module.css';

export interface DiscoverRailProps {
  tribes: TribeSummary[];
  loading?: boolean;
}

/** Horizontal rail of publications to wander into (design doc §7.4). */
export function DiscoverRail({ tribes, loading = false }: DiscoverRailProps) {
  return (
    <section className={styles.section} aria-labelledby="discover-publications">
      <SectionHeader
        title={<span id="discover-publications">Discover publications</span>}
        action={<Link to="/tribes">View all →</Link>}
      />
      {loading ? (
        <div className={styles.rail}>
          <Skeleton variant="rail" />
        </div>
      ) : (
        <div className={styles.rail}>
          {tribes.map((tribe) => (
            <PublicationCard key={tribe.id} tribe={tribe} variant="rail" />
          ))}
        </div>
      )}
    </section>
  );
}
