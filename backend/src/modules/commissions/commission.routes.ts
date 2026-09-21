/**
 * commission.routes.ts - Commission record route definitions.
 *
 * Mounts under /api/v1/commissions (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list records (super_admin, partner_admin)
 *   GET    /:id                   get one record (super_admin, partner_admin)
 *   PATCH  /:id/status            change status (super_admin only)
 *
 * Every route is behind `protect`.
 * Scope enforcement (partner_admin → own org) is in the service.
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listCommissionsHandler,
    getCommissionHandler,
    changeCommissionStatusHandler,
} from './commission.controller.js';

export const commissionRouter: Router = Router();

// All commission routes require authentication
commissionRouter.use(protect);

// --- Read (super_admin + partner_admin) ---
commissionRouter.get(
    '/',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(listCommissionsHandler),
);

commissionRouter.get(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(getCommissionHandler),
);

// --- Status change (super_admin only) ---
commissionRouter.patch(
    '/:id/status',
    authorize('SUPER_ADMIN'),
    asyncHandler(changeCommissionStatusHandler),
);