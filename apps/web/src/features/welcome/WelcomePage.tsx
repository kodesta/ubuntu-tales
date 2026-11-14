import { Link, useNavigate } from '@tanstack/react-router';
import type { CSSProperties } from 'react';

import { useDocumentTitle } from '@/lib/hooks';
import { useHome } from '@/lib/queries';
import { useOnboardingStore } from '@/stores/onboarding';
import { buttonClassName, Image, PageShell, Wordmark } from '@/ui';

import styles from './WelcomePage.module.css';

/**
 * `/welcome` — first visit. Full-viewport warm paper, one editorial statement, two ways in:
 * choose your roots (onboarding) or start reading. Already-onboarded readers are redirected by
 * the route's beforeLoad.
 */
export function WelcomePage() {
  useDocumentTitle('Stories your grandmother knew — Ubuntu Tales');
  const navigate = useNavigate();
  const completeOnboarding = useOnboardingStore((state) => state.complete);
  const homeQuery = useHome();

  const storyOfTheDay = homeQuery.data?.storyOfTheDay;
  const secondStory = homeQuery.data?.latest[0] ?? homeQuery.data?.popular[0];
  const accent = storyOfTheDay?.tribe.accentColor ?? 'var(--terracotta)';

  const startReading = () => {
    completeOnboarding();
    void navigate({ to: '/' });
  };

  return (
    <PageShell variant="full">
      <div className={styles.welcome}>
        <header className={styles.topbar}>
          <Link to="/" className={styles.brand} aria-label="Ubuntu Tales — home">
            <Wordmark size="sm" />
          </Link>
          <p className={styles.topNote}>Free to read · no account needed</p>
        </header>

        <div className={styles.grid}>
          <section className={styles.copy} aria-labelledby="welcome-title">
            <p className={styles.eyebrow}>Oral tradition, kept alive</p>
            <h1 id="welcome-title" className={styles.title}>
              Stories your grandmother knew.
            </h1>
            <p className={styles.dek}>
              Read and listen to folktales from across Africa — one tribe, one telling at a time.
            </p>
            <div className={styles.actions}>
              <Link
                to="/tribes"
                search={{ onboarding: 1 }}
                className={buttonClassName('primary', 'lg')}
                onClick={completeOnboarding}
              >
                Choose your roots
              </Link>
              <button type="button" className={styles.skip} onClick={startReading}>
                Just start reading
              </button>
            </div>
            <p className={styles.note}>
              Your roots and saved tales live on this device. Accounts are coming, quietly.
            </p>
          </section>

          <div className={styles.art} style={{ '--accent': accent } as CSSProperties}>
            <figure className={styles.artMain}>
              <span className={styles.mat}>
                {storyOfTheDay ? (
                  <Image image={storyOfTheDay.cover} ratio="3/2" loading="eager" />
                ) : (
                  <span className={styles.placeholder} aria-hidden="true" />
                )}
              </span>
              <figcaption className={styles.caption}>
                {storyOfTheDay ? `${storyOfTheDay.tribe.name} · ${storyOfTheDay.title}` : 'Cover art'}
              </figcaption>
            </figure>

            <figure className={styles.artSecond} aria-hidden="true">
              <span className={styles.mat}>
                {secondStory ? (
                  <Image image={secondStory.cover} ratio="3/2" />
                ) : (
                  <span className={styles.placeholder} aria-hidden="true" />
                )}
              </span>
            </figure>

            <article className={styles.todayCard}>
              <p className={styles.todayEyebrow}>Tale of the day</p>
              {storyOfTheDay ? (
                <>
                  <p className={styles.todayTitle}>{storyOfTheDay.title}</p>
                  <p className={styles.todayMeta}>
                    {storyOfTheDay.tribe.name} · {storyOfTheDay.readTimeMinutes} min read
                  </p>
                  <Link
                    to="/stories/$slug"
                    params={{ slug: storyOfTheDay.slug }}
                    className={styles.todayLink}
                  >
                    Read the tale →
                  </Link>
                </>
              ) : (
                <>
                  <p className={styles.todayTitle}>A tale is waiting.</p>
                  <p className={styles.todayMeta}>The archive is gathering its stories.</p>
                  <Link to="/tribes" className={styles.todayLink}>
                    Find a publication →
                  </Link>
                </>
              )}
            </article>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
