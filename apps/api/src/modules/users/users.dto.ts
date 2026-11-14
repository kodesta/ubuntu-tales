import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { COMMUNITY_ROLES, type CommunityRole } from '@ubuntu-tales/shared';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../auth/password.service';

const COMMUNITY_ROLE_VALUES = COMMUNITY_ROLES.map((role) => role.value);

/** Lower-cases and trims emails so `Kwame@…` and `kwame@…` are the same account (citext). */
export const normaliseEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @IsString()
  @Length(2, 80, { message: 'Display name must be between 2 and 80 characters.' })
  displayName!: string;

  @Transform(normaliseEmail)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  })
  password!: string;

  /** Optional sensitive personalisation data; requires `consentLineagePersonalisation`. */
  @IsOptional()
  @IsUUID('all', { message: 'tribeId must be a UUID.' })
  tribeId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120, { message: 'Custom lineage must be between 1 and 120 characters.' })
  customLineage?: string;

  @IsOptional()
  @IsIn(COMMUNITY_ROLE_VALUES, { message: 'Choose a valid community role.' })
  communityRole?: CommunityRole;

  @IsBoolean({ message: 'You must accept the Terms of Service.' })
  @Equals(true, { message: 'You must accept the Terms of Service.' })
  acceptTerms!: boolean;

  @IsBoolean({ message: 'You must accept the Privacy Policy.' })
  @Equals(true, { message: 'You must accept the Privacy Policy.' })
  acceptPrivacy!: boolean;

  @IsBoolean({ message: 'You must confirm that you are 13 or older.' })
  @Equals(true, { message: 'You must confirm that you are 13 or older.' })
  confirmAge13Plus!: boolean;

  @IsOptional()
  @IsBoolean()
  consentLineagePersonalisation?: boolean;
}

export class LoginDto {
  @Transform(normaliseEmail)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(320)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Enter your password.' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  @Length(10, 300, { message: 'The verification token is invalid.' })
  token!: string;
}

export class ForgotPasswordDto {
  @Transform(normaliseEmail)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(320)
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @Length(10, 300, { message: 'The reset token is invalid.' })
  token!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  })
  newPassword!: string;
}

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @Length(2, 80, { message: 'Display name must be between 2 and 80 characters.' })
  @Matches(/\S/, { message: 'Display name cannot be blank.' })
  displayName?: string;

  @IsOptional()
  @IsUUID('all', { message: 'tribeId must be a UUID.' })
  tribeId?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 120, { message: 'Custom lineage must be between 1 and 120 characters.' })
  customLineage?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 160, { message: 'Lineage label must be between 1 and 160 characters.' })
  lineageLabel?: string | null;

  @IsOptional()
  @IsIn(COMMUNITY_ROLE_VALUES, { message: 'Choose a valid community role.' })
  communityRole?: CommunityRole | null;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}(-[A-Za-z]{2,4})?$/, { message: 'locale must look like "en" or "en-ZA".' })
  locale?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Enter your current password.' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `New password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `New password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  })
  newPassword!: string;
}
