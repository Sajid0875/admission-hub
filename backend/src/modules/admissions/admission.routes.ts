/**
 * admission.routes.ts - Admission + payment route definitions.
 *
 * Mounts under /api/v1/admissions (wired in app.ts).
 *
 * Routes:
 *   GET    /                                       list admissions (all roles)
 *   GET    /:id                                    get admission (all roles)
 *   POST   /                                       create admission (super_admin, partner_admin, counselor)
 *   PATCH  /:id                                    update admission (super_admin, partner_admin)
 *   POST   /:id/verify                             verify / reject (super_admin, partner_admin)
 *   POST   /:id/cancel                             cancel (super_admin)
 *   GET    /:id/payments                           list payments (all roles)
 *   POST   /:id/payments                           record payment (super_admin, partner_admin)
 *   POST   /:id/payments/:paymentId/refund         refund payment (super_admin only)
 *
 * Every route is behind `protect`.
 *
 * Scope enforcement is two-layered:
 *   - Route-level `authorize(...)` blocks wrong roles early.
 *   - Service-level scope helpers enforce tenant rules.
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listAdmissionsHandler,
    getAdmissionHandler,
    createAdmissionHandler,
    updateAdmissionHandler,
    verifyAdmissionHandler,
    cancelAdmissionHandler,
    listPaymentsHandler,
    recordPaymentHandler,
    refundPaymentHandler,
} from './admission.controller.js';

export const admissionRouter: Router = Router();

// All admission routes require authentication
admissionRouter.use(protect);

// --- Read ---
admissionRouter.get(
    '/',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(listAdmissionsHandler),
);

admissionRouter.get(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(getAdmissionHandler),
);

admissionRouter.get(
    '/:id/payments',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(listPaymentsHandler),
);

// --- Create (from lead; service enforces partner context) ---
admissionRouter.post(
    '/',
    authorize('PARTNER_ADMIN', 'COUNSELOR'),
    asyncHandler(createAdmissionHandler),
);

// --- Update ---
admissionRouter.patch(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(updateAdmissionHandler),
);

// --- Verify / cancel ---
admissionRouter.post(
    '/:id/verify',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(verifyAdmissionHandler),
);

admissionRouter.post(
    '/:id/cancel',
    authorize('SUPER_ADMIN'),
    asyncHandler(cancelAdmissionHandler),
);

// --- Payments (append-only) ---
admissionRouter.post(
    '/:id/payments',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
    asyncHandler(recordPaymentHandler),
);

// --- Refunds (super_admin only) ---
admissionRouter.post(
    '/:id/payments/:paymentId/refund',
    authorize('SUPER_ADMIN'),
    asyncHandler(refundPaymentHandler),
);