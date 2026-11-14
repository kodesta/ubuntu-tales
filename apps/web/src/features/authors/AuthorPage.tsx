import { Link, notFound } from '@tanstack/react-router';
import { Share2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useMemo } from 'react';

import { ApiError } from '@/lib/api';
import { formatTaleCount } from '@/lib/format';
import { sharePage } from '@/lib/share';
import { useToastStore } from '@/stores/toast';
import {
  Avatar,
  Button,
  EmptyState,
  FollowButton,
  IconButton,
  PageShell,
  SectionHeader,
  Skeleton,
  TaleRow,
} from '@/ui';

import { useAuthor } from './queries';
import styles from './AuthorPage.module.css';

const APP_TITLE = 'Ubuntu Tales — Stories your grandmother knew';

interface AffiliatedPublication {
  slug: string;
  name: string;
  accentColor?: string;
}

export interface AuthorPageProps {
  slug: string;
}

/**
 * `/authors/$slug` — griot profile (design doc §7.7): accent-washed masthead, the tales they tell
 * as archive rows and the publications they are affiliated with.
 */
export function AuthorPage({ slug }: AuthorPageProps) {
  const authorQuery = useAuthor(slug);
  const showToast = useToastStore((state) => state.show);

  useEffect(() => {
    const profile = authorQuery.data;
    if (!profile) return;
    document.title = `${profile.name} — Ubuntu Tales`;
    return () => {
      document.title = APP_TITLE;
    };
  }, [authorQuery.data]);

  const publications = useMemo<AffiliatedPublication[]>(() => {
    const seen = new Map<string, AffiliatedPublication>();
    for (const story of authorQuery.data?.stories ?? []) {
      if (seen.has(story.tribe.slug)) continue;
      seen.set(story.tribe.slug, {
        slug: story.tribe.slug,
        name: story.tribe.name,
        accentColor: story.tribe.accentColor,
      });
    }
    return [...seen.values()];
  }, [authorQuery.data]);

  if (authorQuery.isPending) return <AuthorSkeleton />;

  if (authorQuery.isError) {
    if (authorQuery.error instanceof ApiError && authorQuery.error.status === 404) {
      throw notFound();
    }
    return (
      <PageShell variant="publication">
        <EmptyState
          variant="error"
          eyebrow="The voice went quiet"
          title="We could not open this profile."
          body="The connection may have slipped. Try once more, or wander the archive."
          action={
            <>
              <Button onClick={() => void authorQuery.refetch()}>Try again</Button>
              <Link to="/library">Browse the library</Link>
            </>
          }
        />
      </PageShell>
    );
  }

  const author = authorQuery.data;
  const accentStyle = {
    '--accent': author.accentColor ?? 'var(--terracotta)',
  } as CSSProperties;

  const handleShare = async () => {
    const result = await sharePage({
      title: `${author.name} — Ubuntu Tales`,
      text: author.roleLabel,
      url: `${window.location.origin}/authors/${author.slug}`,
    });
    if (result === 'copied') showToast('Link copied to your clipboard.');
    if (result === 'failed') showToast('Sharing is not available in this browser.');
  };

  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        <section className={styles.band} style={accentStyle} aria-labelledby="griot-name">
          <div className={styles.bandInner}>
            <Avatar
              name={author.name}
              image={author.avatar}
              accentColor={author.accentColor}
              size="lg"
              className={styles.avatar}
            />
            <div className={styles.identity}>
              <p className={styles.eyebrow}>The griots</p>
              <h1 id="griot-name" className={styles.name}>
                {author.name}
              </h1>
              {author.roleLabel ? <p className={styles.role}>{author.roleLabel}</p> : null}
              {author.bio ? <p className={styles.bio}>{author.bio}</p> : null}
              <p className={styles.stats}>
                {formatTaleCount(author.publishedStoryCount)} · {publications.length} publication
                {publications.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className={styles.actions}>
              <FollowButton
                tribe={{ slug: `voice:${author.slug}`, name: author.name }}
                size="lg"
                labels={{ idle: 'Follow this voice', active: 'Following this voice ✓' }}
              />
              <IconButton
                label={`Share ${author.name}`}
                variant="paper"
                onClick={() => void handleShare()}
              >
                <Share2 size={18} aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        </section>

        <div className={styles.layout}>
          <section className={styles.tales} aria-labelledby="griot-tales">
            <SectionHeader
              title={<span id="griot-tales">Tales told by {author.name}.</span>}
              eyebrow="The archive"
              action={
                <Link to="/library" className={styles.sectionLink}>
                  The library
                </Link>
              }
            />
            {author.stories.length > 0 ? (
              <ul className={styles.rows}>
                {author.stories.map((story) => (
                  <li key={story.id} className={styles.rowItem}>
                    <TaleRow story={story} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                eyebrow="The fire is patient"
                title="No tales are recorded here yet."
                body="This griot's tales are still being gathered."
                action={
                  <Link to="/library" className={styles.sectionLink}>
                    Browse the archive
                  </Link>
                }
              />
            )}
          </section>

          <aside className={styles.sidebar} aria-labelledby="griot-publications">
            <SectionHeader
              title={<span id="griot-publications">Publications</span>}
              eyebrow="Affiliations"
            />
            {publications.length > 0 ? (
              <ul className={styles.publications}>
                {publications.map((publication) => (
                  <li
                    key={publication.slug}
                    style={
                      {
                        '--accent': publication.accentColor ?? 'var(--terracotta)',
                      } as CSSProperties
                    }
                  >
                    <Link
                      to="/tribes/$slug"
                      params={{ slug: publication.slug }}
                      className={styles.publicationLink}
                    >
                      <span className={styles.publicationDot} aria-hidden="true" />
                      <span>{publication.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.note}>No publications are recorded for this voice yet.</p>
            )}
            <div className={styles.noteBox}>
              <p>Follows are kept on this device until accounts arrive.</p>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function AuthorSkeleton() {
  return (
    <PageShell variant="publication">
      <div className={styles.skeleton}>
        <Skeleton variant="mark" />
        <Skeleton variant="title" />
        <Skeleton variant="text" lines={2} />
        <Skeleton variant="row" lines={2} />
        <Skeleton variant="row" lines={2} />
        <Skeleton variant="row" lines={2} />
      </div>
    </PageShell>
  );
}
