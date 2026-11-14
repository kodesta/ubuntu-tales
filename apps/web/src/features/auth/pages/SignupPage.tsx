import { Link, useSearch } from '@tanstack/react-router';

import { useDocumentTitle } from '@/lib/hooks';

import { useCompleteAuthentication } from '../authCompletion';
import { AuthPageLayout } from '../AuthPageLayout';
import formStyles from '../form.module.css';
import { SignupForm } from '../SignupForm';

/** `/signup` — open an account, editorial voice. Roots/lineage remain optional (docs 08 §3). */
export function SignupPage() {
  useDocumentTitle('Open an account — Ubuntu Tales');
  const { redirect } = useSearch({ from: '/signup' });
  const complete = useCompleteAuthentication();

  return (
    <AuthPageLayout
      eyebrow="OPEN YOUR ACCOUNT"
      title="Join the readers at the fire."
      intro="Keep your reading list, your roots and your place in every tale — on every device, for as long as you like."
      quote={{ text: 'A tree is known by its fruit, a person by their deeds.', source: 'Tale wisdom' }}
      assurances={[
        'Free to read. No card, ever.',
        'Roots are optional, private and removable.',
        'Change or remove anything, any time.',
      ]}
      panelTitle="Open an account"
      panelIntro="A name the fire can call you by, and an email for your letters."
      footer={
        <p>
          Prefer to keep reading without an account?{' '}
          <Link to="/library" className={formStyles.inlineLink}>
            The archive is open.
          </Link>
        </p>
      }
    >
      <SignupForm
        redirectTo={redirect}
        onSuccess={(auth) => complete(auth, { mode: 'signup', navigateTo: redirect })}
      />
    </AuthPageLayout>
  );
}
