import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { Bookmark, ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useSessionStore } from '@/stores/session';
import { useToastStore } from '@/stores/toast';
import { Avatar } from '@/ui/Avatar/Avatar';
import { buttonClassName } from '@/ui/Button/Button';
import { Rule } from '@/ui/Rule/Rule';

import styles from './AccountMenu.module.css';

/**
 * Session-aware header identity slot (brief item 2).
 * Guest: a quiet "Sign in" link plus "Join", both carrying the current path as `?redirect=`.
 * Signed in: initials avatar + name disclosure with Profile / Settings / Saved / Sign out.
 */
export function AccountMenu() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.show);
  const href = useRouterState({ select: (state) => state.location.href });

  const [open, setOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Never send the reader back to the auth screens after authenticating.
  const redirect = href.startsWith('/login') || href.startsWith('/signup') ? undefined : href;
  const authSearch = redirect ? { redirect } : undefined;

  if (status !== 'authenticated' || !user) {
    return (
      <div className={styles.guest}>
        <Link to="/login" search={authSearch} className={styles.signIn}>
          Sign in
        </Link>
        <Link
          to="/signup"
          search={authSearch}
          className={`${buttonClassName('secondary', 'sm')} ${styles.join}`}
        >
          Join
        </Link>
      </div>
    );
  }

  const close = () => setOpen(false);

  const signOut = async () => {
    close();
    await logout();
    showToast('Signed out. Your place is kept.');
    void navigate({ href: '/' });
  };

  return (
    <div className={styles.account} ref={accountRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="account-menu-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Avatar name={user.displayName} image={user.avatar} size="sm" />
        <span className={styles.triggerName}>{user.displayName}</span>
        <span className="sr-only">account menu</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </button>

      {open ? (
        <div className={styles.menu} id="account-menu-panel">
          <div className={styles.menuHeader}>
            <p className={styles.menuName}>{user.displayName}</p>
            <p className={styles.menuEmail}>{user.email}</p>
            {!user.emailVerified ? (
              <Link to="/verify-email" className={styles.verifyLink} onClick={close}>
                Verify your email
              </Link>
            ) : null}
          </div>

          <Rule className={styles.menuRule} />

          <Link to="/profile" className={styles.menuItem} onClick={close}>
            <UserRound size={17} aria-hidden="true" className={styles.menuItemIcon} />
            Profile
          </Link>
          <Link to="/settings" className={styles.menuItem} onClick={close}>
            <Settings size={17} aria-hidden="true" className={styles.menuItemIcon} />
            Settings
          </Link>
          <Link to="/saved" className={styles.menuItem} onClick={close}>
            <Bookmark size={17} aria-hidden="true" className={styles.menuItemIcon} />
            Your reading list
          </Link>

          <Rule className={styles.menuRule} />

          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemDanger}`}
            onClick={() => void signOut()}
          >
            <LogOut size={17} aria-hidden="true" className={styles.menuItemIcon} />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
