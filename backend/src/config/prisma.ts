/**
 * prisma.ts - Prisma client singleton.
 *
 * One PrismaClient per process. In development, tsx watch reloads modules,
 * so we cache the client on globalThis to avoid exhausting DB connections.
 *
 * Import this everywhere; never `new PrismaClient()` outside this file.
 */

import { PrismaClient, Prisma } from '@prisma/client';
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
// Type events explicitly to avoid `never` inference under ESM + Prisma v5.

prisma.$on(
    'query' as never,
    ((e: Prisma.QueryEvent) => {
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
    }) as never,
);

prisma.$on(
    'warn' as never,
    ((e: Prisma.LogEvent) => {
        logger.warn({ prisma: e }, 'prisma warning');
    }) as never,
);

prisma.$on(
    'error' as never,
    ((e: Prisma.LogEvent) => {
        logger.error({ prisma: e }, 'prisma error');
    }) as never,
);

export type PrismaClientSingleton = typeof prisma;