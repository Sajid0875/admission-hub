/**
 * auth.schema.ts - Zod schemas for auth endpoints.
 *
 * Validates incoming request bodies. Controllers use `parse` on
 * these schemas, and ZodError is converted to 422 by errorHandler.
 */

import { z } from 'zod';

export const LoginSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Invalid email format')
        .transform((v) => v.trim().toLowerCase()),
    password: z
        .string()
        .min(1, 'Password is required')
        .max(200, 'Password too long'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenBodySchema = z.object({
    refreshToken: z
        .string()
        .min(1, 'refreshToken is required')
        .max(512, 'refreshToken too long'),
});

export type RefreshTokenBody = z.infer<typeof RefreshTokenBodySchema>;
