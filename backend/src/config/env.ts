/**
 * env.ts - Environment configuration loader.
 * 
 * Reads process.env (populated by dotenv from .env),
 * validates with Zod, and exports a frozen, typed config object.
 * 
 * If any required variable is missing or malformed, the process exits
 * immediately with a clear error. This runs once at startup.
 */

import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CLIENT_URL: z.string().url().default('http://localhost:3000'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_SECRET: z
        .string()
        .min(32, 'JWT_SECRET must be at least 32 characters')
        .refine((v) => v !== 'PASTE_A_64_CHAR_RANDOM_STRING_HERE', {
            message: 'JWT_SECRET is still the placeholder value. Generate a real secret.',
        }),

    JWT_EXPIRES_IN: z.string().default('7d'),

    LOG_LEVEL: z
        .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
        .default('info'),

    // In-process follow-up reminder scanner (no Redis in MVP).
    FOLLOWUP_REMINDERS_ENABLED: z
        .enum(['true', 'false'])
        .default('true')
        .transform((v) => v === 'true'),
    FOLLOWUP_REMINDER_INTERVAL_MS: z.coerce
        .number()
        .int()
        .positive()
        .default(60_000),
    FOLLOWUP_DUE_SOON_MINUTES: z.coerce.number().int().positive().default(60),

    // WhatsApp stub — when true, stub still only logs (no external send).
    WHATSAPP_ENABLED: z
        .enum(['true', 'false'])
        .default('false')
        .transform((v) => v === 'true'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('\n[env] Invalid environment configuration:\n');
    for (const issue of parsed.error.issues) {
        console.error(` - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    console.error('\nFix backend/.env and restart.\n');
    process.exit(1);
}

export const env = Object.freeze(parsed.data);

export type Env = typeof env;