import { Link } from '@tanstack/react-router';

import { AccountMenu } from '@/features/auth/AccountMenu';
import { useCurrentUser, useIsAuthenticated } from '@/stores/session';
import { useTribeStore } from '@/stores/tribe';
import { Menu, Search } from 'lucide-react';

import { IconButton } from '../IconButton/IconButton';
import { Wordmark } from '../Wordmark/Wordmark';

import styles from './Header.module.css';

export interface HeaderProps {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

const NAV_ITEMS = [
  { to: '/', label: 'Read', exact: true },
  { to: '/tribes', label: 'Publications', exact: false },
  { to: '/library', label: 'Library', exact: false },
  { to: '/saved', label: 'Saved', exact: false },
] as const;

/** Sticky 64px editorial header: brand, primary nav (desktop), search and the drawer trigger. */
export function Header({ onOpenMenu, onOpenSearch }: HeaderProps) {
  const chosenTribe = useTribeStore((state) => state.name);
  const user = useCurrentUser();
  const authenticated = useIsAuthenticated();
  const accountTribe = authenticated ? user?.tribe : undefined;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <IconButton label="Open menu" className={styles.menu} onClick={onOpenMenu}>
          <Menu size={20} aria-hidden="true" />
        </IconButton>

        <Link to="/" className={styles.brand} aria-label="Ubuntu Tales — home">
          <Wordmark />
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={styles.navLink}
              activeOptions={{ exact: item.exact, includeSearch: false }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <IconButton label="Search tales" onClick={onOpenSearch}>
            <Search size={20} aria-hidden="true" />
          </IconButton>
          {authenticated ? (
            accountTribe ? (
              <Link
                to="/tribes/$slug"
                params={{ slug: accountTribe.slug }}
                className={styles.rootsLink}
              >
                {accountTribe.name} roots
              </Link>
            ) : (
              <Link to="/profile" className={styles.rootsLink}>
                Choose your roots
              </Link>
            )
          ) : chosenTribe ? (
            <Link to="/tribes" className={styles.rootsLink}>
              {chosenTribe} roots
            </Link>
          ) : (
            <Link to="/tribes" search={{ onboarding: 1 }} className={styles.rootsLink}>
              Choose your roots
            </Link>
          )}
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
