import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useIsAuthenticated, useSessionStore } from '@/stores/session';
import { EmptyState, PageShell } from '@/ui';

import styles from './admin.module.css';

const ADMIN_ROLES = new Set(['EDITOR', 'ADMIN']);

const NAV = [
  { to: '/admin', label: 'Dashboard', exact: true },
  { to: '/admin/stories', label: 'Stories' },
  { to: '/admin/moderation', label: 'Moderation' },
  { to: '/admin/story-of-the-day', label: 'Story of the day' },
  { to: '/admin/settings', label: 'Users & flags' },
] as const;

/** `/admin/*` — editorial console shell, guarded by `systemRole >= EDITOR` (plan 06 §9). */
export function AdminLayout() {
  const isAuthed = useIsAuthenticated();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    document.title = 'Editorial console — Ubuntu Tales';
  }, []);

  if (status === 'unknown') return null;

  if (!isAuthed || !user || !ADMIN_ROLES.has(user.systemRole)) {
    return (
      <PageShell>
        <EmptyState
          eyebrow="Editors only"
          title="This room is for the editors."
          headingLevel={1}
          body="If you believe you should have access, ask an administrator to raise your role."
          action={<Link to="/">Back to the reading list</Link>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell variant="publication">
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="Editorial console">
          <p className={styles.consoleName}>Editorial console</p>
          <nav className={styles.nav}>
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={pathname === item.to || (!('exact' in item && item.exact) && pathname.startsWith(item.to)) ? styles.navActive : styles.navLink}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className={styles.who}>
            {user.displayName} · {user.systemRole}
          </p>
        </aside>
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </PageShell>
  );
}
