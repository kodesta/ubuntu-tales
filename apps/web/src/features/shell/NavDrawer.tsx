import { Link } from '@tanstack/react-router';
import { Bookmark, BookOpen, Compass, LibraryBig } from 'lucide-react';

import { useTribeStore } from '@/stores/tribe';
import { useUiStore } from '@/stores/ui';
import { buttonClassName, Drawer, Rule, Wordmark } from '@/ui';

import styles from './NavDrawer.module.css';

const ITEMS = [
  { to: '/', label: 'Read', Icon: BookOpen },
  { to: '/tribes', label: 'Publications', Icon: Compass },
  { to: '/library', label: 'Library', Icon: LibraryBig },
  { to: '/saved', label: 'Saved', Icon: Bookmark },
] as const;

/** The paper navigation drawer from the header menu. */
export function NavDrawer() {
  const open = useUiStore((state) => state.drawerOpen);
  const setOpen = useUiStore((state) => state.setDrawerOpen);
  const tribeName = useTribeStore((state) => state.name);
  const close = () => setOpen(false);

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

        <div className={styles.roots}>
          <p className={styles.eyebrow}>{tribeName ? 'Your roots' : 'Personalise'}</p>
          {tribeName ? (
            <p className={styles.tribeLine}>
              Reading as a <strong>{tribeName}</strong> reader.{' '}
              <Link
                to="/tribes"
                search={{ onboarding: 1 }}
                onClick={close}
                className={styles.inlineLink}
              >
                Change roots
              </Link>
            </p>
          ) : (
            <p className={styles.tribeLine}>
              Choose your roots to gather a reading list that fits you. Saved on this device.
            </p>
          )}
          <Link
            to="/tribes"
            search={{ onboarding: 1 }}
            onClick={close}
            className={buttonClassName('secondary', 'sm', true)}
          >
            {tribeName ? 'Choose a new tribe' : 'Choose your roots'}
          </Link>
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
