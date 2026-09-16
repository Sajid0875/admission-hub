/**
 * notFound.middleware.ts - 404 handler for unmatched routes.
 *
 * Mounted AFTER all routes but BEFORE errorHandler in app.ts.
 * Any request that does not match a registered route reaches this,
 * which passes a NotFoundError to the next middleware (errorHandler).
 */

import type { RequestHandler } from 'express';
import { NotFoundError } from '../shared/errors/AppError.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
    next(
        NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`),
    );
};