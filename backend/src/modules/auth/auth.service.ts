/**
 * auth.service.ts - Auth business logic.
 *
 * Responsibilities:
 *   - Verify credentials (email + password) against the User table
 *   - Enforce account status (must be ACTIVE)
 *   - Issue JWT access tokens
 *   - Return a safe user shape (never the password hash)
 *   - Update lastLoginAt
 *
 * Does NOT touch HTTP concerns (req, res). That's the controller's job.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import {
    UnauthorizedError,
    ForbiddenError,
} from '../../shared/errors/AppError.js';
import { signAccessToken } from '../../shared/utils/jwt.js';
import type { LoginInput } from './auth.schema.js';

// --------------------------------------------------
// Safe public user shape (never include passwordHash)
// --------------------------------------------------

export interface SafeUser {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    partnerId: string | null;
    status: string;
    lastLoginAt: Date | null;
    createdAt: Date;
}

export interface LoginResult {
    token: string;
    user: SafeUser;
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const toSafeUser = (user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    partnerId: string | null;
    status: string;
    lastLoginAt: Date | null;
    createdAt: Date;
    role: { name: string };
}): SafeUser => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role.name,
    partnerId: user.partnerId,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
});

// --------------------------------------------------
// Public API
// --------------------------------------------------

export const login = async (input: LoginInput): Promise<LoginResult> => {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: { role: true },
    });

    // Constant-time-ish behavior: always run bcrypt.compare even if user missing.
    const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8D2Yp0A7t/oWgQ0eN1bT2r6xM8K9u6';
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH;

    const passwordMatches = await bcrypt.compare(input.password, hashToCheck);

    if (!user || !passwordMatches) {
        logger.warn(
            { email: input.email },
            'login failed: invalid credentials',
        );
        throw UnauthorizedError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
        logger.warn(
            { userId: user.id, status: user.status },
            'login failed: account not active',
        );
        throw ForbiddenError('Account is not active');
    }

    // Update lastLoginAt (fire and forget — do not block token issuance on it)
    prisma.user
        .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        })
        .catch((err) => {
            logger.warn({ err, userId: user.id }, 'failed to update lastLoginAt');
        });

    const token = signAccessToken({
        userId: user.id,
        role: user.role.name,
        partnerId: user.partnerId,
    });

    return {
        token,
        user: toSafeUser(user),
    };
};

export const getCurrentUser = async (userId: string): Promise<SafeUser> => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true },
    });

    if (!user) {
        throw UnauthorizedError('User not found');
    }

    if (user.status !== 'ACTIVE') {
        throw ForbiddenError('Account is not active');
    }

    return toSafeUser(user);
};