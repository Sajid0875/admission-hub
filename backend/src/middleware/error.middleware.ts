/**
 * error.middleware.ts - Global error handler.
 *
 * Mounted last in app.ts. Any error thrown (or passed to next())
 * inside a controller reaches this handler and is turned into a
 * consistent JSON response.
 *
 * Response shape:
 * {
 *   error: {
 *     message: string,
 *     statusCode: number,
 *     details?: unknown,
 *     requestId?: string,
 *     stack?: string (development only)
 *   }
 * }
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors/AppError.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

interface ErrorResponse {
    error: {
        message: string;
        statusCode: number;
        details?: unknown;
        requestId?: string;
        stack?: string;
    };
}

/**
 * Convert any thrown value into an AppError.
 * - AppError passes through unchanged.
 * - ZodError is converted to 422 with field errors in details.
 * - Everything else becomes 500, non-operational.
 */
function normaliseError(err: unknown): AppError {
    if (err instanceof AppError) {
        return err;
    }

    if (err instanceof ZodError) {
        return new AppError('Validation failed', {
            statusCode: 422,
            details: err.flatten(),
        });
    }

    if (err instanceof Error) {
        return new AppError(err.message || 'Internal Server Error', {
            statusCode: 500,
            isOperational: false,
            cause: err,
        });
    }

    return new AppError('Internal Server Error', {
        statusCode: 500,
        isOperational: false,
        details: typeof err === 'string' ? err : undefined,
    });
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    const appErr = normaliseError(err);
    const requestId = req.id;

    const payload: ErrorResponse = {
        error: {
            message: appErr.message,
            statusCode: appErr.statusCode,
            requestId,
        },
    };

    if (appErr.details !== undefined) {
        payload.error.details = appErr.details;
    }

    if (env.NODE_ENV === 'development' && appErr.stack) {
        payload.error.stack = appErr.stack;
    }

    // Log at the right level.
    if (appErr.statusCode >= 500) {
        logger.error(
            {
                requestId,
                method: req.method,
                url: req.originalUrl,
                statusCode: appErr.statusCode,
                err: { message: appErr.message, stack: appErr.stack },
            },
            'unhandled error',
        );
    } else {
        logger.warn(
            {
                requestId,
                method: req.method,
                url: req.originalUrl,
                statusCode: appErr.statusCode,
                details: appErr.details,
            },
            'request error',
        );
    }

    // Guard: if headers already sent, delegate to Express default.
    if (res.headersSent) {
        return _next(appErr);
    }

    res.status(appErr.statusCode).json(payload);
};

/**
 * Convenience helper for async controllers.
 * Wrap any async handler and errors are forwarded to errorHandler.
 *
 * Example:
 *   router.get('/x', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler =
    (fn: RequestHandler): RequestHandler =>
        (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };