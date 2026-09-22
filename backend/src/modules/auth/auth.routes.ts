/**
 * auth.routes.ts - Auth route definitions.
 *
 * Mounts under /api/v1/auth (wired in app.ts).
 *
 * Routes:
 *   POST  /login   - public, credentials → JWT
 *   GET   /me      - protected, current user
 */

import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { protect } from '../../middleware/auth.middleware.js';
import { loginRateLimiter } from '../../middleware/rateLimit.middleware.js';
import { loginHandler, meHandler } from './auth.controller.js';

export const authRouter: Router = Router();

// Public — stricter rate limit for credential stuffing dampening
authRouter.post('/login', loginRateLimiter, asyncHandler(loginHandler));

// Protected — requires valid JWT
authRouter.get('/me', protect, asyncHandler(meHandler));