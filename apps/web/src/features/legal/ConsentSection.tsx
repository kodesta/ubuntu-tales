import { useState } from 'react';

import { hasAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics';
import { useToastStore } from '@/stores/toast';
import { Button } from '@/ui';

import styles from './legal.module.css';

/** Settings section: analytics opt-in and on-device data disclosure. */
export function ConsentSection() {
  const showToast = useToastStore((state) => state.show);
  const [granted, setGranted] = useState(hasAnalyticsConsent());

  return (
    <section aria-labelledby="consent-heading">
      <h2 id="consent-heading" className={styles.heading}>Privacy and storage</h2>
      <p className={styles.paragraph}>
        Product analytics are off by default. If you opt in we record which screens are used, never
        who you are and never what you read.
      </p>
      <p className={styles.paragraph}>
        Your reading preferences, guest saves and downloaded tales are stored in this browser.
        Signing out or clearing site data removes them from this device.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button
          variant={granted ? 'secondary' : 'primary'}
          onClick={() => {
            setAnalyticsConsent(true);
            setGranted(true);
            showToast('Thank you — anonymous analytics are now on.');
          }}
        >
          Allow anonymous analytics
        </Button>
        <Button
          variant={granted ? 'primary' : 'ghost'}
          onClick={() => {
            setAnalyticsConsent(false);
            setGranted(false);
            showToast('Analytics are off. Nothing is recorded.');
          }}
        >
          Keep analytics off
        </Button>
      </div>
    </section>
  );
}
