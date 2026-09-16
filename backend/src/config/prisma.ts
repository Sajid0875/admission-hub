/**
 * prisma.ts - Prisma client singleton.
 *
 * One PrismaClient per process. In development, tsx watch reloads modules,
 * so we cache the client on globalThis to avoid exhausting DB connections.
 *
 * Import this everywhere; never `new PrismaClient()` outside this file.
 */

import { PrismaClient } from '@prisma/client';
import { env } from './env.js';
import { logger } from './logger.js';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log:
            env.NODE_ENV === 'development'
                ? [
                    { emit: 'event', level: 'query' },
                    { emit: 'event', level: 'warn' },
                    { emit: 'event', level: 'error' },
                ]
                : [
                    { emit: 'event', level: 'warn' },
                    { emit: 'event', level: 'error' },
                ],
    });

if (env.NODE_ENV === 'development') {
    globalForPrisma.prisma = prisma;
}

// Route Prisma logs through Pino so everything has one output stream.
prisma.$on('query', (e) => {
    if (env.NODE_ENV === 'development') {
        logger.debug(
            {
                query: e.query,
                params: e.params,
                durationMs: e.duration,
            },
            'prisma query',
        );
    }
});

prisma.$on('warn', (e) => {
    logger.warn({ prisma: e }, 'prisma warning');
});

prisma.$on('error', (e) => {
    logger.error({ prisma: e }, 'prisma error');
});

export type PrismaClientSingleton = typeof prisma;