/**
 * auth.controller.ts - Auth HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies with Zod
 *   - Delegate to auth.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 */

import type { Request, Response } from 'express';
import { LoginSchema, RefreshTokenBodySchema } from './auth.schema.js';
import * as authService from './auth.service.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';

// --------------------------------------------------
// POST /api/v1/auth/login
// --------------------------------------------------

export const loginHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const input = LoginSchema.parse(req.body);

    const result = await authService.login(input);

    res.status(200).json({
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
    });
};

// --------------------------------------------------
// POST /api/v1/auth/refresh
// --------------------------------------------------

export const refreshHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const input = RefreshTokenBodySchema.parse(req.body);
    const result = await authService.refresh(input.refreshToken);

    res.status(200).json({
        token: result.token,
        refreshToken: result.refreshToken,
    });
};

// --------------------------------------------------
// POST /api/v1/auth/logout
// --------------------------------------------------

export const logoutHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const input = RefreshTokenBodySchema.parse(req.body);
    await authService.logout(input.refreshToken);

    res.status(204).send();
};

// --------------------------------------------------
// GET /api/v1/auth/me
// --------------------------------------------------

export const meHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    if (!req.user) {
        throw UnauthorizedError('Authentication required');
    }

    const user = await authService.getCurrentUser(req.user.id);

    res.status(200).json({ user });
};
