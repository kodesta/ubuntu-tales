import { Link } from '@tanstack/react-router';

import { Wordmark } from '../Wordmark/Wordmark';

import styles from './Footer.module.css';

const linkClass = styles.link;

/** Full-width paper-sunk footer, four columns on desktop, stacked on mobile. */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.about}>
          <Wordmark size="sm" />
          <p className={styles.blurb}>
            A quiet archive of African folktales, retold with care and kept for the next teller.
          </p>
          <p className={styles.note}>
            Tales here are traditional. They belong to everyone. Your roots, reading list and
            progress follow your account — and work on this device when you read as a guest.
          </p>
        </div>

        <nav className={styles.column} aria-label="Read">
          <h2 className={styles.heading}>Read</h2>
          <Link to="/" className={linkClass} activeOptions={{ includeSearch: false }}>
            Your reading list
          </Link>
          <Link to="/library" className={linkClass}>
            The library
          </Link>
          <Link to="/saved" className={linkClass}>
            Saved tales
          </Link>
        </nav>

        <nav className={styles.column} aria-label="Publications">
          <h2 className={styles.heading}>Publications</h2>
          <Link to="/tribes" className={linkClass}>
            All publications
          </Link>
          <Link to="/tribes" search={{ onboarding: 1 }} className={linkClass}>
            Choose your roots
          </Link>
          <Link to="/welcome" className={linkClass}>
            Welcome
          </Link>
        </nav>

        <div className={styles.column}>
          <h2 className={styles.heading}>Ubuntu</h2>
          <p className={styles.quote}>“A person is a person through other persons.”</p>
          <p className={styles.note}>One tribe, one telling at a time.</p>
        </div>
      </div>
      <div className={styles.bottom}>
        <p>© 2026 Ubuntu Tales</p>
        <p>Made for readers, not dashboards.</p>
      </div>
    </footer>
  );
}
