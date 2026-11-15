import { ValidationPipe, type ValidationError } from '@nestjs/common';
import type { ApiFieldError } from '@ubuntu-tales/shared';
import { AppException } from '../errors/app-exception';

/** Flattens class-validator errors (including nested objects) into `{ field, message }` pairs. */
export function flattenValidationErrors(
  errors: readonly ValidationError[],
  parent = '',
): ApiFieldError[] {
  const fields: ApiFieldError[] = [];

  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        fields.push({ field: path, message });
      }
    }
    if (error.children && error.children.length > 0) {
      fields.push(...flattenValidationErrors(error.children, path));
    }
  }

  return fields;
}

/**
 * Global `ValidationPipe` configuration from production plan 05 §3.4: whitelist + forbid unknown
 * properties, transform to DTO instances, and emit RFC 9457 field errors via `AppException`.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    stopAtFirstError: false,
    exceptionFactory: (errors: ValidationError[]) => {
      const fields = flattenValidationErrors(errors);
      return AppException.validation(
        fields[0]?.message ?? 'The request could not be validated.',
        fields,
      );
    },
  });
}
