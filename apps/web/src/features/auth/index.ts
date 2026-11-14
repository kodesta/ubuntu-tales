/**
 * Public surface of the auth feature (brief item 5). Other features — notably web-personal's
 * save/progress/reaction surfaces — should import `requireAuth` / `useRequireAuth` from here
 * instead of rendering their own auth UI.
 */
export { AccountMenu } from './AccountMenu';
export { AuthModalHost, AuthModalHost as AuthModal } from './AuthModal';
export { EmailVerificationBanner } from './EmailVerificationBanner';
export { useCompleteAuthentication } from './authCompletion';
export type { CompleteAuthenticationOptions } from './authCompletion';
export { useAuthModalStore } from './authModalStore';
export type { AuthMode, OpenAuthModalOptions } from './authModalStore';
export { interpretAuthError } from './authErrors';
export type { AuthErrorContext, ParsedAuthError } from './authErrors';
export { DEV_SEED_USERS, DEV_SEED_PASSWORD, isDevEnvironment } from './dev';
export {
  Field,
  FormError,
  FormSuccess,
  PasswordInput,
  SelectInput,
  TextInput,
  CheckboxField,
} from './fields';
export type { FieldControlIds, FieldProps } from './fields';
export { describeGuestMerge, mergeGuestData, readGuestSources } from './guestMerge';
export type {
  GuestDataSources,
  GuestMergeClient,
  GuestMergeOptions,
  GuestMergeSummary,
} from './guestMerge';
export { requireAuth, useRequireAuth } from './requireAuth';
export type { AuthAction, RequireAuthOptions } from './requireAuth';
export {
  firstNameOf,
  normaliseEmail,
  sanitizeRedirect,
  validateChangePassword,
  validateDisplayName,
  validateEmail,
  validateLogin,
  validatePassword,
  validateSignup,
  PASSWORD_MIN_LENGTH,
} from './validation';
export type { ChangePasswordValues, FieldErrors, LoginValues, SignupValues } from './validation';
export { AuthPageLayout } from './AuthPageLayout';
export type { AuthPageLayoutProps } from './AuthPageLayout';
export { LoginForm } from './LoginForm';
export type { LoginFormProps } from './LoginForm';
export { SignupForm } from './SignupForm';
export type { SignupFormProps } from './SignupForm';
