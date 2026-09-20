/**
 * lead.routes.ts - Lead route definitions.
 *
 * Mounts under /api/v1/leads (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list leads (all roles)
 *   GET    /:id                   get one lead (all roles)
 *   POST   /                      create lead (partner_admin, counselor)
 *   PATCH  /:id                   update lead (all roles)
 *   PATCH  /:id/assign            assign lead (super_admin, partner_admin)
 *   PATCH  /:id/status            change status (all roles)
 *   POST   /:id/archive           archive lead (all roles)
 *   GET    /:id/activities        lead timeline (all roles)
 *
 * Every route is behind `protect`.
 *
 * Scope enforcement is two-layered:
 *   - Route-level `authorize(...)` blocks wrong roles early.
 *   - Service-level scope helpers enforce tenant + assignment rules.
 *
 * Counselors can only see/modify leads assigned to them (service enforces).
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listLeadsHandler,
    getLeadHandler,
    createLeadHandler,
    updateLeadHandler,
    assignLeadHandler,
    changeLeadStatusHandler,
    archiveLeadHandler,
    listLeadActivitiesHandler,
} from './lead.controller.js';

export const leadRouter: Router = Router();

// All lead routes require authentication
leadRouter.use(protect);

// --- Read ---
leadRouter.get(
    '/',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(listLeadsHandler),
);

leadRouter.get(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(getLeadHandler),
);

leadRouter.get(
    '/:id/activities',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(listLeadActivitiesHandler),
);

// --- Create (partner_admin and counselor; service enforces partner binding) ---
leadRouter.post(
    '/',
    authorize('PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(createLeadHandler),
);

// --- Update ---
leadRouter.patch(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(updateLeadHandler),
);

// --- Assign (partner_admin and super_admin only) ---
leadRouter.patch(
    '/:id/assign',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(assignLeadHandler),
);

// --- Status change (counselor can do this too for their assigned leads) ---
leadRouter.patch(
    '/:id/status',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(changeLeadStatusHandler),
);

// --- Archive ---
leadRouter.post(
    '/:id/archive',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(archiveLeadHandler),
);