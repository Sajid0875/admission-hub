/**
 * rateLimit.middleware.test.ts - Unit tests for in-memory rate limiter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
    createRateLimiter,
    resetRateLimitStores,
} from '../rateLimit.middleware.js';
import { AppError } from '../../shared/errors/AppError.js';

const mockReq = (ip = '1.2.3.4'): Request =>
    ({ ip, headers: {} }) as unknown as Request;

const mockRes = (): Response => {
    const headers: Record<string, string> = {};
    return {
        setHeader: (k: string, v: string) => {
            headers[k] = v;
        },
        getHeader: (k: string) => headers[k],
        headers,
    } as unknown as Response;
};

describe('createRateLimiter', () => {
    beforeEach(() => {
        resetRateLimitStores();
    });

    it('allows requests under the limit', () => {
        // Verifies happy path: first N requests pass through.
        const limiter = createRateLimiter({
            windowMs: 60_000,
            limit: 3,
            keyPrefix: 'test-ok',
        });
        const errors: unknown[] = [];
        const next: NextFunction = (err?: unknown) => {
            if (err) errors.push(err);
        };

        for (let i = 0; i < 3; i += 1) {
            limiter(mockReq(), mockRes(), next);
        }

        expect(errors).toHaveLength(0);
    });

    it('rejects the request after the limit is exceeded', () => {
        // Verifies failure case: (limit+1)th request becomes 429 AppError.
        const limiter = createRateLimiter({
            windowMs: 60_000,
            limit: 2,
            keyPrefix: 'test-block',
        });
        const errors: unknown[] = [];
        const next: NextFunction = (err?: unknown) => {
            if (err) errors.push(err);
        };

        limiter(mockReq(), mockRes(), next);
        limiter(mockReq(), mockRes(), next);
        limiter(mockReq(), mockRes(), next);

        expect(errors).toHaveLength(1);
        expect(errors[0]).toBeInstanceOf(AppError);
        expect((errors[0] as AppError).statusCode).toBe(429);
    });

    it('isolates counters by keyPrefix', () => {
        // Edge case: two limiters with different prefixes must not share buckets.
        const a = createRateLimiter({
            windowMs: 60_000,
            limit: 1,
            keyPrefix: 'prefix-a',
        });
        const b = createRateLimiter({
            windowMs: 60_000,
            limit: 1,
            keyPrefix: 'prefix-b',
        });
        const errors: unknown[] = [];
        const next: NextFunction = (err?: unknown) => {
            if (err) errors.push(err);
        };

        a(mockReq(), mockRes(), next);
        b(mockReq(), mockRes(), next);

        expect(errors).toHaveLength(0);
    });
});
