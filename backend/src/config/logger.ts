/**
 * logger.ts - Application logger.
 *
 * Uses Pino for structured logging.
 * - In development: pretty-printed with colors.
 * - In production: raw JSON (for log aggregators).
 *
 * Never log secrets, tokens, passwords, or full request bodies.
 * Import this logger everywhere; never use console.log in app code.
 */

import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
    level: env.LOG_LEVEL,
    base: {
        service: 'admission-hub-backend',
        env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
        paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            '*.password',
            '*.passwordHash',
            '*.token',
            '*.refreshToken',
        ],
        censor: '[REDACTED]',
    },
    transport:
        env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname,service,env',
                },
            }
            : undefined,
});

export type Logger = typeof logger;