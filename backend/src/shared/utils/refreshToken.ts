/**
 * refreshToken.ts - Opaque refresh-token create / hash helpers.
 *
 * Raw token is returned to the client once; only the SHA-256 hash is stored.
 */

import { createHash, randomBytes } from 'node:crypto';

export const hashRefreshToken = (rawToken: string): string =>
    createHash('sha256').update(rawToken, 'utf8').digest('hex');

/** Generate a URL-safe opaque refresh token (~43 chars for 32 bytes). */
export const generateRefreshToken = (): string =>
    randomBytes(32).toString('base64url');
