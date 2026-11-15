import { Link } from '@tanstack/react-router';
import { BookOpen, Bookmark, Compass, Globe2, LibraryBig } from 'lucide-react';

import styles from './BottomNav.module.css';

const ITEMS = [
  { to: '/', label: 'Read', exact: true, Icon: BookOpen },
  { to: '/explore', label: 'Explore', exact: false, Icon: Globe2 },
  { to: '/tribes', label: 'Publications', exact: false, Icon: Compass },
  { to: '/library', label: 'Library', exact: false, Icon: LibraryBig },
  { to: '/saved', label: 'Saved', exact: false, Icon: Bookmark },
] as const;

/** Thumb-first mobile navigation. Hidden by the shell on reader routes (the tale owns the screen). */
export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Primary mobile">
      {ITEMS.map(({ to, label, exact, Icon }) => (
        <Link
          key={to}
          to={to}
          className={styles.item}
          activeOptions={{ exact, includeSearch: false }}
        >
          <Icon size={20} aria-hidden="true" className={styles.icon} />
          <span className={styles.label}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
