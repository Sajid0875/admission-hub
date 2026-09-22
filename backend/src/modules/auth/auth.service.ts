/**
 * auth.service.ts - Auth business logic.
 *
 * Responsibilities:
 *   - Verify credentials (email + password) against the User table
 *   - Enforce account status (must be ACTIVE)
 *   - Issue JWT access tokens + opaque refresh tokens
 *   - Rotate / revoke refresh tokens
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
import {
    signAccessToken,
    refreshTokenExpiresAt,
} from '../../shared/utils/jwt.js';
import {
    generateRefreshToken,
    hashRefreshToken,
} from '../../shared/utils/refreshToken.js';
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

export interface AuthTokensResult {
    token: string;
    refreshToken: string;
    user: SafeUser;
}

export interface LoginResult extends AuthTokensResult {}

export interface RefreshResult {
    token: string;
    refreshToken: string;
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

/** Persist a new refresh token row; returns the raw token for the client. */
const issueRefreshToken = async (userId: string): Promise<string> => {
    const raw = generateRefreshToken();
    await prisma.refreshToken.create({
        data: {
            userId,
            token: hashRefreshToken(raw),
            expiresAt: refreshTokenExpiresAt(),
        },
    });
    return raw;
};

const issueAccessTokenForUser = (user: {
    id: string;
    partnerId: string | null;
    role: { name: string };
}): string =>
    signAccessToken({
        userId: user.id,
        role: user.role.name,
        partnerId: user.partnerId,
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

    const token = issueAccessTokenForUser(user);
    const refreshToken = await issueRefreshToken(user.id);

    return {
        token,
        refreshToken,
        user: toSafeUser(user),
    };
};

/**
 * Exchange a valid refresh token for a new access + refresh pair (rotation).
 * Old refresh row is deleted so stolen tokens cannot be reused after rotation.
 */
export const refresh = async (rawRefreshToken: string): Promise<RefreshResult> => {
    const tokenHash = hashRefreshToken(rawRefreshToken);

    const stored = await prisma.refreshToken.findUnique({
        where: { token: tokenHash },
        include: { user: { include: { role: true } } },
    });

    if (!stored) {
        throw UnauthorizedError('Invalid refresh token');
    }

    // Always delete the presented token (one-time use / rotation hygiene)
    await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => {
        // Already deleted by a concurrent refresh — treat as invalid
    });

    if (stored.expiresAt.getTime() <= Date.now()) {
        throw UnauthorizedError('Refresh token expired');
    }

    if (stored.user.status !== 'ACTIVE') {
        throw ForbiddenError('Account is not active');
    }

    const token = issueAccessTokenForUser(stored.user);
    const refreshToken = await issueRefreshToken(stored.user.id);

    return { token, refreshToken };
};

/**
 * Revoke a refresh token (logout). Idempotent — unknown tokens succeed.
 */
export const logout = async (rawRefreshToken: string): Promise<void> => {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await prisma.refreshToken.deleteMany({ where: { token: tokenHash } });
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
