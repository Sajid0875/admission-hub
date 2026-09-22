/**
 * followup.routes.ts - Follow-up route definitions.
 *
 * Mounts under /api/v1/followups (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list follow-ups (all roles)
 *   GET    /:id                   get one follow-up (all roles)
 *   POST   /                      create follow-up (super_admin, partner_admin, counselor)
 *   PATCH  /:id                   update follow-up (all roles)
 *   POST   /:id/complete          complete with outcome (all roles)
 *   POST   /:id/snooze            snooze to new dueAt (all roles)
 *   POST   /:id/cancel            cancel (all roles)
 *
 * Every route is behind `protect`.
 *
 * Scope enforcement is two-layered:
 *   - Route-level `authorize(...)` blocks wrong roles early.
 *   - Service-level scope helpers enforce tenant + assignment rules.
 *
 * Counselors can only see/modify follow-ups assigned to them (service enforces).
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listFollowUpsHandler,
    getFollowUpHandler,
    createFollowUpHandler,
    updateFollowUpHandler,
    completeFollowUpHandler,
    snoozeFollowUpHandler,
    cancelFollowUpHandler,
} from './followup.controller.js';

export const followUpRouter: Router = Router();

// All follow-up routes require authentication
followUpRouter.use(protect);

// --- Read ---
followUpRouter.get(
    '/',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(listFollowUpsHandler),
);

followUpRouter.get(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(getFollowUpHandler),
);

// --- Create (partner_admin and counselor; service enforces partner binding) ---
followUpRouter.post(
    '/',
    authorize('PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(createFollowUpHandler),
);

// --- Update ---
followUpRouter.patch(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(updateFollowUpHandler),
);

// --- Lifecycle actions ---
followUpRouter.post(
    '/:id/complete',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(completeFollowUpHandler),
);

followUpRouter.post(
    '/:id/snooze',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(snoozeFollowUpHandler),
);

followUpRouter.post(
    '/:id/cancel',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(cancelFollowUpHandler),
);