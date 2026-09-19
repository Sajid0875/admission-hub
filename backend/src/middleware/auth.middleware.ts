/**
 * auth.middleware.ts - Authentication and authorization middleware.
 *
 * `protect`     — verifies JWT, loads user, checks status, attaches req.user
 * `authorize`   — role-gates a route (must come after `protect`)
 *
 * Reads JWT payload only to identify the user. Reloads the user from DB
 * on every request so suspended/deleted users lose access immediately.
 */

import type { RequestHandler } from 'express';
import { prisma } from '../config/prisma.js';
import { verifyAccessToken } from '../shared/utils/jwt.js';
import {
    UnauthorizedError,
    ForbiddenError,
} from '../shared/errors/AppError.js';

// --------------------------------------------------
// protect — verify JWT, load user, attach req.user
// --------------------------------------------------

export const protect: RequestHandler = async (req, _res, next) => {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith('Bearer ')) {
            throw UnauthorizedError('Missing or malformed Authorization header');
        }

        const token = header.slice('Bearer '.length).trim();

        if (!token) {
            throw UnauthorizedError('Missing token');
        }

        const payload = verifyAccessToken(token);

        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            include: { role: true },
        });

        if (!user) {
            throw UnauthorizedError('User no longer exists');
        }

        if (user.status !== 'ACTIVE') {
            throw ForbiddenError('Account is not active');
        }

        req.user = {
            id: user.id,
            role: user.role.name,
            partnerId: user.partnerId,
        };

        next();
    } catch (err) {
        next(err);
    }
};

// --------------------------------------------------
// authorize — role gating
// --------------------------------------------------

export const authorize =
    (...allowedRoles: string[]): RequestHandler =>
        (req, _res, next) => {
            try {
                if (!req.user) {
                    throw UnauthorizedError('Authentication required');
                }

                if (!allowedRoles.includes(req.user.role)) {
                    throw ForbiddenError('Insufficient permissions');
                }

                next();
            } catch (err) {
                next(err);
            }
        };