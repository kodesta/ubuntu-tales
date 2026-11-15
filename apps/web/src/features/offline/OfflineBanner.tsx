import { useEffect, useState } from 'react';

import styles from './OfflineBanner.module.css';

/** Calm offline banner (production plan 06 §6): shown when the network drops. */
export function OfflineBanner() {
  const [offline, setOffline] = useState(() =>
    typeof navigator === 'undefined' ? false : !navigator.onLine,
  );

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className={styles.banner} role="status">
      You are offline — showing downloaded tales.
    </div>
  );
}
