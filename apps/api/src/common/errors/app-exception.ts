import { HttpException } from '@nestjs/common';
import { ERROR_CODES, type ApiFieldError, type ErrorCode } from '@ubuntu-tales/shared';

/**
 * Domain error carrying the stable machine `code` that the Problem Details filter emits
 * (production plan 03 §1, 05 §3.4).
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly detail: string;
  readonly errors?: ApiFieldError[];

  constructor(code: ErrorCode, status: number, detail: string, errors?: ApiFieldError[]) {
    super({ code, detail, ...(errors ? { errors } : {}) }, status);
    this.code = code;
    this.detail = detail;
    if (errors) this.errors = errors;
  }

  static notFound(resource: string): AppException {
    return new AppException(ERROR_CODES.NOT_FOUND, 404, `${resource} was not found.`);
  }

  static validation(detail: string, errors?: ApiFieldError[]): AppException {
    return new AppException(ERROR_CODES.VALIDATION_FAILED, 400, detail, errors);
  }

  static serviceUnavailable(detail: string): AppException {
    return new AppException(ERROR_CODES.SERVICE_UNAVAILABLE, 503, detail);
  }

  static forbidden(detail = 'You do not have access to this resource.'): AppException {
    return new AppException(ERROR_CODES.FORBIDDEN, 403, detail);
  }

  static conflict(detail: string): AppException {
    return new AppException(ERROR_CODES.CONFLICT, 409, detail);
  }

  static tooLarge(detail: string): AppException {
    return new AppException(ERROR_CODES.UPLOAD_TOO_LARGE, 413, detail);
  }

  static notAllowed(detail: string): AppException {
    return new AppException(ERROR_CODES.UPLOAD_TYPE_NOT_ALLOWED, 415, detail);
  }
}
