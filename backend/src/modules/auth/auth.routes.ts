/**
 * auth.routes.ts - Auth route definitions.
 *
 * Mounts under /api/v1/auth (wired in app.ts).
 *
 * Routes:
 *   POST  /login    - public, credentials → access + refresh
 *   POST  /refresh  - public, refresh → rotated access + refresh
 *   POST  /logout   - public, revoke refresh token
 *   GET   /me       - protected, current user
 */

import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.middleware.js';
import { protect } from '../../middleware/auth.middleware.js';
import { loginRateLimiter } from '../../middleware/rateLimit.middleware.js';
import {
    loginHandler,
    logoutHandler,
    meHandler,
    refreshHandler,
} from './auth.controller.js';

export const authRouter: Router = Router();

// Public — stricter rate limit for credential stuffing dampening
authRouter.post('/login', loginRateLimiter, asyncHandler(loginHandler));

// Public — refresh / logout use opaque tokens (not Bearer access JWT)
authRouter.post('/refresh', loginRateLimiter, asyncHandler(refreshHandler));
authRouter.post('/logout', asyncHandler(logoutHandler));

// Protected — requires valid JWT
authRouter.get('/me', protect, asyncHandler(meHandler));
