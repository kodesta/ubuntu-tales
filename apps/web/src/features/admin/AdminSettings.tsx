import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session';
import { useToastStore } from '@/stores/toast';
import { Button, Skeleton } from '@/ui';

import styles from './admin.module.css';

/** `/admin/settings` — users, feature flags and the audit log (tasks 4.9). */
export function AdminSettings() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const user = useSessionStore((state) => state.user);
  const isAdmin = user?.systemRole === 'ADMIN';

  const flags = useQuery({ queryKey: ['admin', 'flags'], queryFn: () => api.admin.featureFlags.list() });
  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => api.admin.users.list({ limit: 50 }),
    enabled: isAdmin,
  });
  const audit = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: () => api.admin.auditLog.list({ limit: 50 }),
    enabled: isAdmin,
  });

  return (
    <div>
      <h1 className={styles.pageTitle}>Users & flags</h1>
      <p className={styles.pageIntro}>Feature gates for the editors; readers and audit for administrators.</p>

      <h2 className={styles.pageTitle} style={{ fontSize: 'var(--text-h3)' }}>Feature flags</h2>
      {flags.isPending ? <Skeleton lines={3} /> : null}
      {flags.isSuccess ? (
        <table className={styles.table}>
          <thead><tr><th>Flag</th><th>Enabled</th><th /></tr></thead>
          <tbody>
            {flags.data.map((flag) => (
              <tr key={flag.key}>
                <td>{flag.key}{flag.description ? <p className={styles.status}>{flag.description}</p> : null}</td>
                <td><span className={styles.status}>{flag.enabled ? 'on' : 'off'}</span></td>
                <td>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await api.admin.featureFlags.set(flag.key, !flag.enabled);
                      showToast(`${flag.key} ${flag.enabled ? 'disabled' : 'enabled'}.`);
                      await queryClient.invalidateQueries({ queryKey: ['admin', 'flags'] });
                    }}
                  >
                    {flag.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {isAdmin ? (
        <>
          <h2 className={styles.pageTitle} style={{ fontSize: 'var(--text-h3)' }}>Readers</h2>
          {users.isPending ? <Skeleton lines={3} /> : null}
          {users.isSuccess ? (
            <table className={styles.table}>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>
                {users.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.displayName}</td>
                    <td>{row.email}</td>
                    <td><span className={styles.status}>{row.systemRole}</span></td>
                    <td><span className={styles.status}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          <h2 className={styles.pageTitle} style={{ fontSize: 'var(--text-h3)' }}>Audit log</h2>
          {audit.isPending ? <Skeleton lines={3} /> : null}
          {audit.isSuccess ? (
            <table className={styles.table}>
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
              <tbody>
                {audit.data.items.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleString('en-GB')}</td>
                    <td>{row.actorName ?? '—'}</td>
                    <td>{row.action}</td>
                    <td>{row.entity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </>
      ) : (
        <p className={styles.empty}>User management and the audit log need an administrator.</p>
      )}
    </div>
  );
}
