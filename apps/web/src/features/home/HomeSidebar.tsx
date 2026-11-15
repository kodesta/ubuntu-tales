import { Link } from '@tanstack/react-router';
import type { TribeSummary, WisdomNote } from '@ubuntu-tales/shared';

import { buttonClassName, PublicationMark, Skeleton } from '@/ui';

import { WisdomNotes } from './WisdomNotes';
import styles from './HomeSidebar.module.css';

export interface HomeSidebarProps {
  followedTribes: TribeSummary[];
  wisdomNotes: WisdomNote[];
  tribesLoading?: boolean;
}

/** Feed shell sidebar: followed publications, wisdom notes, and the "About" editorial card. */
export function HomeSidebar({
  followedTribes,
  wisdomNotes,
  tribesLoading = false,
}: HomeSidebarProps) {
  return (
    <div className={styles.sidebar}>
      <section className={styles.card} aria-labelledby="followed-publications">
        <h2 id="followed-publications" className={styles.heading}>
          Publications you follow
        </h2>
        {tribesLoading ? (
          <Skeleton variant="text" lines={3} />
        ) : followedTribes.length > 0 ? (
          <ul className={styles.followList}>
            {followedTribes.map((tribe) => (
              <li key={tribe.id}>
                <Link
                  to="/tribes/$slug"
                  params={{ slug: tribe.slug }}
                  className={styles.followLink}
                >
                  <PublicationMark
                    name={tribe.name}
                    accentColor={tribe.accentColor}
                    image={tribe.image}
                    size="sm"
                  />
                  <span className={styles.followName}>{tribe.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.prompt}>
            <p className={styles.promptText}>
              No publications yet. Your roots shape what gathers here.
            </p>
            <Link
              to="/tribes"
              search={{ onboarding: 1 }}
              className={buttonClassName('secondary', 'sm')}
            >
              Choose your roots
            </Link>
          </div>
        )}
      </section>

      <WisdomNotes notes={wisdomNotes} />

      <section className={styles.about} aria-labelledby="about-ubuntu-tales">
        <p className={styles.eyebrow}>About Ubuntu Tales</p>
        <h2 id="about-ubuntu-tales" className={styles.aboutTitle}>
          Oral tradition, kept alive.
        </h2>
        <p className={styles.aboutBody}>
          Every tale here is a retelling, carried from one teller to the next. Read quietly, save
          what stays with you, and follow the voices you want to hear again.
        </p>
        <Link to="/tribes" className={styles.aboutLink}>
          Browse the publications →
        </Link>
      </section>
    </div>
  );
}
