import { Link, useNavigate, useSearch } from '@tanstack/react-router';

import { useDocumentTitle } from '@/lib/hooks';
import { useSessionStore } from '@/stores/session';
import { buttonClassName, Button } from '@/ui';

import { useCompleteAuthentication } from '../authCompletion';
import { AuthPageLayout } from '../AuthPageLayout';
import formStyles from '../form.module.css';
import { LoginForm } from '../LoginForm';
import { firstNameOf, sanitizeRedirect } from '../validation';

/** `/login` — the editorial way back in. Supports `?redirect=` for post-auth return. */
export function LoginPage() {
  useDocumentTitle('Sign in — Ubuntu Tales');
  const { redirect } = useSearch({ from: '/login' });
  const complete = useCompleteAuthentication();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const navigate = useNavigate();

  if (status === 'authenticated' && user) {
    const target = sanitizeRedirect(redirect) ?? '/';
    return (
      <AuthPageLayout
        eyebrow="THE FIRE IS ALREADY LIT"
        title={`Welcome back, ${firstNameOf(user.displayName)}.`}
        intro="You are already signed in on this device. Pick up the tale wherever you left it."
        quote={{
          text: 'A person is a person through other persons.',
          source: 'Ubuntu proverb',
        }}
        panelTitle="You are signed in"
        panelIntro={`Signed in as ${user.email}.`}
      >
        <div className={formStyles.actions}>
          <Button fullWidth onClick={() => void navigate({ href: target })}>
            Continue reading
          </Button>
          <Link to="/profile" className={buttonClassName('secondary', 'md', true)}>
            Your account
          </Link>
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      eyebrow="PATHS BACK TO THE FIRE"
      title="Welcome back."
      intro="Your reading list kept its place. Sign in and pick up exactly where the tale left off."
      quote={{ text: 'A person is a person through other persons.', source: 'Ubuntu proverb' }}
      assurances={[
        'Your place in every tale, kept across devices.',
        'Saved tales, roots and settings follow you.',
        'No card, no subscription — reading stays free.',
      ]}
      panelTitle="Sign in"
      panelIntro="Use the email you opened your account with."
      footer={
        <p>
          Reading is free without an account. You can always{' '}
          <Link to="/library" className={formStyles.inlineLink}>
            keep browsing the archive
          </Link>
          .
        </p>
      }
    >
      <LoginForm
        redirectTo={redirect}
        onSuccess={(auth) => complete(auth, { mode: 'login', navigateTo: redirect })}
      />
    </AuthPageLayout>
  );
}
