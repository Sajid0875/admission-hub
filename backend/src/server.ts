/**
 * server.ts - Application entry point.
 *
 * Responsibilities:
 *   - Load env (side effect of importing config/env.js)
 *   - Create the Express app
 *   - Start listening
 *   - Handle graceful shutdown (SIGINT, SIGTERM)
 *   - Handle uncaught exceptions and unhandled rejections
 *
 * This is the only file that calls app.listen().
 */

import type { Server } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { startFollowUpReminderJob } from './jobs/followupReminders.js';

const startServer = async (): Promise<void> => {
    const app = createApp();

    const server: Server = await new Promise((resolve, reject) => {
        const s = app.listen(env.PORT, () => {
            logger.info(
                {
                    port: env.PORT,
                    env: env.NODE_ENV,
                    clientUrl: env.CLIENT_URL,
                },
                'server started',
            );
            resolve(s);
        });

        // listen() does not throw synchronously for EADDRINUSE — it emits 'error'.
        s.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                logger.fatal(
                    { err, port: env.PORT },
                    `port ${env.PORT} is already in use — stop the other process (lsof -i :${env.PORT}) or change PORT`,
                );
            }
            reject(err);
        });
    });

    // In-process follow-up reminders + WhatsApp stub fanout (no Redis yet).
    const stopReminders = startFollowUpReminderJob();

    // --- Graceful shutdown ---
    const shutdown = async (signal: string): Promise<void> => {
        logger.info({ signal }, 'shutdown signal received');
        stopReminders();

        const forceTimer = setTimeout(() => {
            logger.error('shutdown timed out, forcing exit');
            process.exit(1);
        }, 10_000);

        forceTimer.unref();

        // Only close if the server actually bound successfully
        if (!server.listening) {
            try {
                await prisma.$disconnect();
            } catch {
                /* ignore */
            }
            process.exit(1);
            return;
        }

        server.close(async (err) => {
            if (err) {
                logger.error({ err }, 'error while closing http server');
            } else {
                logger.info('http server closed');
            }

            try {
                await prisma.$disconnect();
                logger.info('prisma disconnected');
            } catch (disconnectErr) {
                logger.error({ err: disconnectErr }, 'error while disconnecting prisma');
            }

            process.exit(err ? 1 : 0);
        });
    };

    process.on('SIGINT', () => {
        void shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
        void shutdown('SIGTERM');
    });

    // --- Last-resort safety nets ---
    process.on('uncaughtException', (err) => {
        logger.fatal({ err }, 'uncaught exception');
        void shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        logger.fatal({ reason }, 'unhandled rejection');
        void shutdown('unhandledRejection');
    });
};

startServer().catch((err) => {
    logger.fatal({ err }, 'fatal error during bootstrap');
    process.exit(1);
});