import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { PageShell } from '@/ui';

import styles from './AuthPageLayout.module.css';

export interface AuthPageLayoutProps {
  eyebrow: string;
  title: string;
  intro: string;
  quote?: { text: string; source: string };
  assurances?: string[];
  /** Optional heading inside the form panel (modal-like screens use none). */
  panelTitle?: string;
  panelIntro?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * The editorial two-column frame shared by every account screen: a warm reading column on the
 * left (what this is and why it is safe), the form on paper-raised to the right. One h1 per page.
 */
export function AuthPageLayout({
  eyebrow,
  title,
  intro,
  quote,
  assurances,
  panelTitle,
  panelIntro,
  children,
  footer,
}: AuthPageLayoutProps) {
  return (
    <PageShell>
      <div className={styles.page}>
        <section className={styles.editorial} aria-labelledby="auth-page-title">
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="auth-page-title" className={styles.title}>
            {title}
          </h1>
          <p className={styles.intro}>{intro}</p>

          {quote ? (
            <blockquote className={styles.quote}>
              <p>{quote.text}</p>
              <footer className={styles.quoteSource}>{quote.source}</footer>
            </blockquote>
          ) : null}

          {assurances && assurances.length > 0 ? (
            <ul className={styles.assurances}>
              {assurances.map((line) => (
                <li key={line} className={styles.assurance}>
                  <Check size={16} aria-hidden="true" className={styles.assuranceIcon} />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className={styles.panel} aria-label="Account form">
          {panelTitle || panelIntro ? (
            <div className={styles.panelHead}>
              {panelTitle ? <h2 className={styles.panelTitle}>{panelTitle}</h2> : null}
              {panelIntro ? <p className={styles.panelIntro}>{panelIntro}</p> : null}
            </div>
          ) : null}

          {children}

          {footer ? <div className={styles.panelFoot}>{footer}</div> : null}
        </section>
      </div>
    </PageShell>
  );
}
