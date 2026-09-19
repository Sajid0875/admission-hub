/**
 * jwt.ts - JWT sign and verify helpers.
 *
 * Central place for token creation and verification.
 * Never call jsonwebtoken directly outside this file.
 */

import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../errors/AppError.js';

/**
 * Payload we embed in every access token.
 * Keep it small — it travels on every request.
 */
export interface AccessTokenPayload extends JwtPayload {
    sub: string;           // user id
    role: string;          // RoleName
    partnerId: string | null;
}

export interface SignAccessTokenInput {
    userId: string;
    role: string;
    partnerId: string | null;
}

export const signAccessToken = (input: SignAccessTokenInput): string => {
    const payload: AccessTokenPayload = {
        sub: input.userId,
        role: input.role,
        partnerId: input.partnerId,
    };

    const options: SignOptions = {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };

    return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);

        if (typeof decoded === 'string') {
            throw UnauthorizedError('Invalid token payload');
        }

        const payload = decoded as AccessTokenPayload;

        if (!payload.sub || !payload.role) {
            throw UnauthorizedError('Invalid token payload');
        }

        return payload;
    } catch (err) {
        if (err instanceof Error && err.name === 'TokenExpiredError') {
            throw UnauthorizedError('Token expired');
        }
        if (err instanceof Error && err.name === 'JsonWebTokenError') {
            throw UnauthorizedError('Invalid token');
        }
        throw err;
    }
};