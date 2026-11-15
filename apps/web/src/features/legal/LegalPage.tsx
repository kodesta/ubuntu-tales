import { Link, notFound } from '@tanstack/react-router';

import { PageShell } from '@/ui';

import { LEGAL_DOCUMENTS } from './content';
import styles from './legal.module.css';

export function LegalPage({ slug }: { slug: string }) {
  const document = LEGAL_DOCUMENTS.find((item) => item.slug === slug);
  if (!document) throw notFound();

  return (
    <PageShell variant="publication">
      <article className={styles.page}>
        <p className={styles.eyebrow}>Policies</p>
        <h1 className={styles.title}>{document.title}</h1>
        <p className={styles.updated}>Last updated {document.updated}</p>
        <p className={styles.intro}>{document.intro}</p>

        {document.sections.map((section) => (
          <section key={section.heading} className={styles.section}>
            <h2 className={styles.heading}>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className={styles.bullets}>
                {section.bullets.map((bullet) => (
                  <li key={bullet.slice(0, 40)}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <nav className={styles.related} aria-label="Other policies">
          {LEGAL_DOCUMENTS.filter((item) => item.slug !== document.slug).map((item) => (
            <Link key={item.slug} to="/legal/$slug" params={{ slug: item.slug }}>
              {item.title}
            </Link>
          ))}
        </nav>
      </article>
    </PageShell>
  );
}
