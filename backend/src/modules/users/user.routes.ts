/**
 * user.routes.ts - User route definitions.
 *
 * Mounts under /api/v1/users (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list users (scoped)
 *   GET    /:id                   get one user (scoped)
 *   POST   /                      create user (super_admin, partner_admin)
 *   PATCH  /:id                   update user (scoped)
 *   PATCH  /:id/status            change status (super_admin)
 *   PATCH  /:id/role              change role (super_admin)
 *
 * Every route is behind `protect`.
 * Write routes are additionally gated via `authorize(...)`.
 *
 * Services still enforce tenant scope — routes only gate by role.
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listUsersHandler,
    getUserHandler,
    createUserHandler,
    updateUserHandler,
    changeStatusHandler,
    changeRoleHandler,
} from './user.controller.js';

export const userRouter: Router = Router();

// All user routes require authentication
userRouter.use(protect);

// --- Read ---
userRouter.get(
    '/',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(listUsersHandler),
);

userRouter.get(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(getUserHandler),
);

// --- Create ---
userRouter.post(
    '/',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(createUserHandler),
);

// --- Update (name / phone) ---
userRouter.patch(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(updateUserHandler),
);

// --- Status changes (super_admin only) ---
userRouter.patch(
    '/:id/status',
    authorize('SUPER_ADMIN'),
    asyncHandler(changeStatusHandler),
);

// --- Role changes (super_admin only) ---
userRouter.patch(
    '/:id/role',
    authorize('SUPER_ADMIN'),
    asyncHandler(changeRoleHandler),
);