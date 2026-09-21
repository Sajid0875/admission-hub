/**
 * app.ts - Express application assembly.
 *
 * Builds the Express app with the middleware stack in the correct order:
 *   1. Security + parsing (helmet, cors, json, urlencoded)
 *   2. Request ID
 *   3. Request logging (dev only)
 *   4. Health check (bypasses auth)
 *   5. API routes (added in Phase 3+)
 *   6. 404 handler
 *   7. Global error handler
 *
 * Does NOT listen on a port. See server.ts for that.
 */

import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { randomUUID } from 'node:crypto';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { partnerRouter } from './modules/partners/partner.routes.js';
import { leadRouter } from './modules/leads/lead.routes.js';
import { followUpRouter } from './modules/followups/followup.routes.js';
import { admissionRouter } from './modules/admissions/admission.routes.js';
import { courseRouter } from './modules/courses/course.routes.js';
import { marketingAssetRouter } from './modules/marketing-assets/marketing-asset.routes.js';
import { commissionRuleRouter } from './modules/commissions/commission-rule.routes.js';
import { commissionRouter } from './modules/commissions/commission.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';

export const createApp = (): Application => {
    const app = express();

    // Trust proxy (behind reverse proxies like Render/Vercel).
    app.set('trust proxy', 1);

    // Hide Express signature.
    app.disable('x-powered-by');

    // --- Security headers ---
    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
        }),
    );

    // --- CORS ---
    app.use(
        cors({
            origin: env.CLIENT_URL,
            credentials: true,
        }),
    );

    // --- Body parsers ---
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // --- Request ID ---
    app.use((req, res, next) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
        req.id = id;
        res.setHeader('x-request-id', id);
        next();
    });

    // --- Request logging (dev only) ---
    if (env.NODE_ENV === 'development') {
        app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                logger.info(
                    {
                        requestId: req.id,
                        method: req.method,
                        url: req.originalUrl,
                        status: res.statusCode,
                        durationMs: Date.now() - start,
                    },
                    'request',
                );
            });
            next();
        });
    }

    // --- Health check ---
    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            service: 'admission-hub-backend',
            env: env.NODE_ENV,
            timestamp: new Date().toISOString(),
        });
    });

    // --- API routes ---
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/users', userRouter);
    app.use('/api/v1/partners', partnerRouter);
    app.use('/api/v1/leads', leadRouter);
    app.use('/api/v1/followups', followUpRouter);
    app.use('/api/v1/admissions', admissionRouter);
    app.use('/api/v1/courses', courseRouter);
    app.use('/api/v1/marketing-assets', marketingAssetRouter);
    app.use('/api/v1/commission-rules', commissionRuleRouter);
    app.use('/api/v1/commissions', commissionRouter);

    // Future modules:
    // app.use('/api/v1/notifications', notificationRouter);
    // app.use('/api/v1/reports', reportRouter);
    // ...
    // --- 404 handler (must be after all routes) ---
    app.use(notFoundHandler);

    // --- Global error handler (must be last) ---
    app.use(errorHandler);

    return app;
};