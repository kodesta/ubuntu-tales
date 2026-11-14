import { Link, useNavigate } from '@tanstack/react-router';
import {
  Bookmark,
  BookOpen,
  Compass,
  LibraryBig,
  LogIn,
  Settings,
  UserRound,
} from 'lucide-react';

import { useSessionStore } from '@/stores/session';
import { useToastStore } from '@/stores/toast';
import { useTribeStore } from '@/stores/tribe';
import { useUiStore } from '@/stores/ui';
import { Avatar, Button, buttonClassName, Drawer, Rule, Wordmark } from '@/ui';

import styles from './NavDrawer.module.css';

const ITEMS = [
  { to: '/', label: 'Read', Icon: BookOpen },
  { to: '/tribes', label: 'Publications', Icon: Compass },
  { to: '/library', label: 'Library', Icon: LibraryBig },
  { to: '/saved', label: 'Saved', Icon: Bookmark },
] as const;

/** The paper navigation drawer from the header menu, now with the reader's account. */
export function NavDrawer() {
  const open = useUiStore((state) => state.drawerOpen);
  const setOpen = useUiStore((state) => state.setDrawerOpen);
  const tribeName = useTribeStore((state) => state.name);
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);
  const showToast = useToastStore((state) => state.show);
  const navigate = useNavigate();
  const close = () => setOpen(false);

  const authenticated = status === 'authenticated' && Boolean(user);
  const rootsName = authenticated ? (user?.tribe?.name ?? null) : tribeName;

  const signOut = async () => {
    close();
    await logout();
    showToast('Signed out. Your place is kept.');
    void navigate({ href: '/' });
  };

  return (
    <Drawer open={open} onOpenChange={setOpen} title="Menu">
      <div className={styles.inner}>
        <Link to="/" onClick={close} className={styles.brand} aria-label="Ubuntu Tales — home">
          <Wordmark />
        </Link>

        <nav aria-label="Menu">
          <ul className={styles.list}>
            {ITEMS.map(({ to, label, Icon }) => (
              <li key={to}>
                <Link to={to} onClick={close} className={styles.link}>
                  <Icon size={18} aria-hidden="true" className={styles.icon} />
                  <span>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Rule className={styles.rule} />

        {authenticated && user ? (
          <section className={styles.account} aria-label="Account">
            <div className={styles.accountHead}>
              <Avatar name={user.displayName} image={user.avatar} size="md" />
              <div className={styles.accountText}>
                <p className={styles.accountName}>{user.displayName}</p>
                <p className={styles.accountEmail}>{user.email}</p>
              </div>
            </div>

            <nav aria-label="Account">
              <ul className={styles.list}>
                <li>
                  <Link to="/profile" onClick={close} className={styles.link}>
                    <UserRound size={18} aria-hidden="true" className={styles.icon} />
                    <span>Profile</span>
                  </Link>
                </li>
                <li>
                  <Link to="/settings" onClick={close} className={styles.link}>
                    <Settings size={18} aria-hidden="true" className={styles.icon} />
                    <span>Settings</span>
                  </Link>
                </li>
              </ul>
            </nav>

            {!user.emailVerified ? (
              <Link to="/verify-email" onClick={close} className={styles.inlineLink}>
                Verify your email
              </Link>
            ) : null}

            <Button variant="secondary" fullWidth onClick={() => void signOut()}>
              Sign out
            </Button>
          </section>
        ) : (
          <section className={styles.account} aria-label="Account">
            <p className={styles.eyebrow}>Your account</p>
            <p className={styles.tribeLine}>
              An account keeps your reading list, roots and place on every device. Reading stays
              free either way.
            </p>
            <Link to="/login" onClick={close} className={buttonClassName('secondary', 'md', true)}>
              <LogIn size={17} aria-hidden="true" />
              Sign in
            </Link>
            <Link to="/signup" onClick={close} className={buttonClassName('primary', 'md', true)}>
              Open an account
            </Link>
          </section>
        )}

        <Rule className={styles.rule} />

        <div className={styles.roots}>
          <p className={styles.eyebrow}>{rootsName ? 'Your roots' : 'Personalise'}</p>
          {rootsName ? (
            <p className={styles.tribeLine}>
              Reading as a <strong>{rootsName}</strong> reader.{' '}
              {authenticated ? (
                <Link to="/profile" onClick={close} className={styles.inlineLink}>
                  Change roots
                </Link>
              ) : (
                <Link
                  to="/tribes"
                  search={{ onboarding: 1 }}
                  onClick={close}
                  className={styles.inlineLink}
                >
                  Change roots
                </Link>
              )}
            </p>
          ) : authenticated ? (
            <p className={styles.tribeLine}>
              Roots are optional. They shape the stories you see and stay private to your account.
            </p>
          ) : (
            <p className={styles.tribeLine}>
              Choose your roots to gather a reading list that fits you. Saved on this device.
            </p>
          )}
          {authenticated ? (
            <Link
              to="/profile"
              onClick={close}
              className={buttonClassName('secondary', 'sm', true)}
            >
              {rootsName ? 'Change your roots' : 'Choose your roots'}
            </Link>
          ) : (
            <Link
              to="/tribes"
              search={{ onboarding: 1 }}
              onClick={close}
              className={buttonClassName('secondary', 'sm', true)}
            >
              {rootsName ? 'Choose a new tribe' : 'Choose your roots'}
            </Link>
          )}
        </div>

        <div className={styles.foot}>
          <p className={styles.note}>
            Ubuntu Tales. A person is a person through other persons.
          </p>
        </div>
      </div>
    </Drawer>
  );
}
