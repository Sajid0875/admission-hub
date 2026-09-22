/**
 * rateLimit.middleware.ts - Lightweight in-memory rate limiter.
 *
 * No Redis / no third-party package — enough for single-instance MVP.
 * Multi-instance production should swap the store for Redis later.
 *
 * Usage:
 *   app.use('/api/v1', apiRateLimiter);
 *   authRouter.post('/login', loginRateLimiter, ...);
 */

import type { RequestHandler } from 'express';
import { TooManyRequestsError } from '../shared/errors/AppError.js';

interface Bucket {
    count: number;
    resetAt: number;
}

export interface RateLimitOptions {
    /** Sliding fixed window length in ms. */
    windowMs: number;
    /** Max requests per key per window. */
    limit: number;
    /** Prefix so login + API limiters don't share counters. */
    keyPrefix: string;
    /** Optional custom key (defaults to req.ip). */
    keyGenerator?: (req: Parameters<RequestHandler>[0]) => string;
}

const stores = new Map<string, Map<string, Bucket>>();

const getStore = (prefix: string): Map<string, Bucket> => {
    let store = stores.get(prefix);
    if (!store) {
        store = new Map();
        stores.set(prefix, store);
    }
    return store;
};

/** Test helper — clears all buckets. */
export const resetRateLimitStores = (): void => {
    stores.clear();
};

export const createRateLimiter = (options: RateLimitOptions): RequestHandler => {
    const { windowMs, limit, keyPrefix, keyGenerator } = options;

    return (req, res, next) => {
        const store = getStore(keyPrefix);
        const now = Date.now();
        const key = keyGenerator?.(req) ?? req.ip ?? 'unknown';

        let bucket = store.get(key);
        if (!bucket || bucket.resetAt <= now) {
            bucket = { count: 0, resetAt: now + windowMs };
            store.set(key, bucket);
        }

        bucket.count += 1;

        const remaining = Math.max(0, limit - bucket.count);
        const resetSec = Math.ceil(bucket.resetAt / 1000);

        res.setHeader('RateLimit-Limit', String(limit));
        res.setHeader('RateLimit-Remaining', String(remaining));
        res.setHeader('RateLimit-Reset', String(resetSec));

        if (bucket.count > limit) {
            const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
            res.setHeader('Retry-After', String(retryAfterSec));
            next(
                TooManyRequestsError('Rate limit exceeded. Try again later.', {
                    limit,
                    windowMs,
                    retryAfterSec,
                }),
            );
            return;
        }

        next();
    };
};

/** Stricter limiter for credential endpoints (brute-force dampening). */
export const loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    keyPrefix: 'auth-login',
});

/** General API limiter for authenticated and public API traffic. */
export const apiRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    keyPrefix: 'api-v1',
});
