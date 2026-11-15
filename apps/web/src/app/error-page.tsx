import { Link } from '@tanstack/react-router';

import { Button, buttonClassName, EmptyState, PageShell } from '@/ui';

import styles from './status-page.module.css';

export interface RouteErrorPageProps {
  error: Error;
  reset: () => void;
}

/** Route-level error boundary: editorial, calm, with a single retry. */
export function RouteErrorPage({ error, reset }: RouteErrorPageProps) {
  return (
    <PageShell variant="narrow">
      <EmptyState
        variant="error"
        headingLevel={1}
        eyebrow="A tale got away"
        title="Something interrupted the telling."
        body="This page could not be loaded. Try once more — the fire is still burning."
        action={
          <>
            <Button onClick={() => reset()}>Try again</Button>
            <Link to="/" className={buttonClassName('secondary')}>
              Back to the reading list
            </Link>
          </>
        }
      />
      {import.meta.env.DEV ? <pre className={styles.devError}>{error.message}</pre> : null}
    </PageShell>
  );
}
