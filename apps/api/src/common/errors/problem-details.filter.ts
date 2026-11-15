import {
  Catch,
  HttpException,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { Prisma } from '@ubuntu-tales/db';
import {
  ERROR_CODES,
  type ApiErrorBody,
  type ApiFieldError,
  type ErrorCode,
} from '@ubuntu-tales/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppException } from './app-exception';

const STATUS_CODES: Record<number, ErrorCode> = {
  400: ERROR_CODES.BAD_REQUEST,
  401: ERROR_CODES.FORBIDDEN,
  403: ERROR_CODES.FORBIDDEN,
  404: ERROR_CODES.NOT_FOUND,
  409: ERROR_CODES.CONFLICT,
  422: ERROR_CODES.VALIDATION_FAILED,
  429: ERROR_CODES.BAD_REQUEST,
  503: ERROR_CODES.SERVICE_UNAVAILABLE,
};

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

interface NormalisedError {
  status: number;
  code: ErrorCode;
  detail: string;
  errors?: ApiFieldError[];
}

/**
 * Maps every uncaught error to an RFC 9457 `application/problem+json` payload with the stable
 * `code` and optional field-level `errors` the web client understands (production plan 03 §1).
 * Unknown errors are logged and never leak internals.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const reply = context.getResponse<FastifyReply>();
    const request = context.getRequest<FastifyRequest>();
    const normalised = this.normalise(exception);

    const body: ApiErrorBody = {
      type: 'about:blank',
      title: TITLES[normalised.status] ?? 'Error',
      status: normalised.status,
      detail: normalised.detail,
      instance: request.url,
      code: normalised.code,
      ...(normalised.errors ? { errors: normalised.errors } : {}),
    };

    reply
      .status(normalised.status)
      .header('Content-Type', 'application/problem+json; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .send(body);
  }

  private normalise(exception: unknown): NormalisedError {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        detail: exception.detail,
        ...(exception.errors ? { errors: exception.errors } : {}),
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      let detail = exception.message;
      let code = STATUS_CODES[status] ?? ERROR_CODES.INTERNAL_ERROR;
      let errors: ApiFieldError[] | undefined;

      if (typeof response === 'object' && response !== null) {
        const parsed = response as Record<string, unknown>;
        const message = parsed.message;
        if (typeof message === 'string') detail = message;
        else if (Array.isArray(message)) {
          detail = message.join('; ');
          errors = message.map((item) => ({ field: 'request', message: String(item) }));
        }
        if (typeof parsed.code === 'string') code = parsed.code as ErrorCode;
        if (Array.isArray(parsed.errors)) errors = parsed.errors as ApiFieldError[];
      }

      return { status, code, detail, ...(errors ? { errors } : {}) };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return {
          status: 404,
          code: ERROR_CODES.NOT_FOUND,
          detail: 'The requested resource was not found.',
        };
      }
      if (exception.code === 'P2002') {
        return {
          status: 409,
          code: ERROR_CODES.CONFLICT,
          detail: 'A record with these unique values already exists.',
        };
      }
      if (exception.code === 'P2003') {
        return {
          status: 409,
          code: ERROR_CODES.CONFLICT,
          detail: 'The record is still referenced by other records.',
        };
      }
      this.logger.error(`Prisma ${exception.code}: ${exception.message}`);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: 400,
        code: ERROR_CODES.VALIDATION_FAILED,
        detail: 'The request could not be validated.',
      };
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );

    return {
      status: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      detail: 'An unexpected error occurred. Please try again.',
    };
  }
}
