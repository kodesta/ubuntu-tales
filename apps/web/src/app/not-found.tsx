import { Link } from '@tanstack/react-router';

import { buttonClassName, EmptyState, PageShell } from '@/ui';

/** Branded editorial 404. Also used as the root route's `notFoundComponent`. */
export function NotFoundPage() {
  return (
    <PageShell variant="narrow">
      <EmptyState
        eyebrow="404 — a wrong turn"
        headingLevel={1}
        title="This path has grown over."
        body="The tale may have moved. Begin again from the reading list, or wander the archive."
        action={
          <>
            <Link to="/" className={buttonClassName('primary')}>
              Back to the reading list
            </Link>
            <Link to="/library" className={buttonClassName('secondary')}>
              Browse the library
            </Link>
          </>
        }
      />
    </PageShell>
  );
}
