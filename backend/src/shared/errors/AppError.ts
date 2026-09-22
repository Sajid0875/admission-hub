/**
 * AppError - base error class for all controlled application errors.
 *
 * Rules:
 * - Throw this (or a subclass) for anything the API should return as a
 *   structured JSON error response.
 * - Never throw raw `Error` for expected failure paths - use AppError.
 * - `statusCode` maps directly to the HTTP response status.
 * - `isOperational` distinguishes expected failures (true) from bugs (false).
 * - `details` is optional structured context (e.g. Zod field errors).
 */

export interface AppErrorOptions {
    statusCode?: number;
    isOperational?: boolean;
    details?: unknown;
    cause?: unknown;
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(message: string, options: AppErrorOptions = {}) {
        super(message);

        this.name = 'AppError';
        this.statusCode = options.statusCode ?? 500;
        this.isOperational = options.isOperational ?? true;
        this.details = options.details;

        if (options.cause !== undefined) {
            (this as { cause?: unknown }).cause = options.cause;
        }

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Common error factories â€” keep status code semantics consistent.
 */

export const BadRequestError = (message = 'Bad Request', details?: unknown) =>
    new AppError(message, { statusCode: 400, details });

export const UnauthorizedError = (message = 'Unauthorized', details?: unknown) =>
    new AppError(message, { statusCode: 401, details });

export const ForbiddenError = (message = 'Forbidden', details?: unknown) =>
    new AppError(message, { statusCode: 403, details });

export const NotFoundError = (message = 'Not Found', details?: unknown) =>
    new AppError(message, { statusCode: 404, details });

export const ConflictError = (message = 'Conflict', details?: unknown) =>
    new AppError(message, { statusCode: 409, details });

export const UnprocessableError = (message = 'Unprocessable Entity', details?: unknown) =>
    new AppError(message, { statusCode: 422, details });

export const InternalError = (message = 'Internal Server Error', details?: unknown) =>
    new AppError(message, { statusCode: 500, isOperational: false, details });