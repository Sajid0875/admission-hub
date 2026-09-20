/**
 * partner.routes.ts - Partner route definitions.
 *
 * Mounts under /api/v1/partners (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list partners (super_admin)
 *   GET    /:id                   get one partner (super_admin, own partner_admin)
 *   POST   /                      create partner (super_admin)
 *   PATCH  /:id                   update partner (super_admin)
 *   PATCH  /:id/status            change status (super_admin)
 *
 * Every route is behind `protect`.
 * Read routes allow partner_admin to fetch their own record.
 * Write routes are super_admin only.
 *
 * Services still enforce tenant scope — routes only gate by role.
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
  listPartnersHandler,
  getPartnerHandler,
  createPartnerHandler,
  updatePartnerHandler,
  changePartnerStatusHandler,
} from './partner.controller.js';

export const partnerRouter: Router = Router();

// All partner routes require authentication
partnerRouter.use(protect);

// --- Read ---
// List: super_admin only (partner_admin doesn't need to enumerate others)
partnerRouter.get(
  '/',
  authorize('SUPER_ADMIN'),
  asyncHandler(listPartnersHandler),
);

// Get by id: super_admin OR partner_admin (own only — service enforces scope)
partnerRouter.get(
  '/:id',
  authorize('SUPER_ADMIN', 'PARTNER_ADMIN'),
  asyncHandler(getPartnerHandler),
);

// --- Write (super_admin only) ---
partnerRouter.post(
  '/',
  authorize('SUPER_ADMIN'),
  asyncHandler(createPartnerHandler),
);

partnerRouter.patch(
  '/:id',
  authorize('SUPER_ADMIN'),
  asyncHandler(updatePartnerHandler),
);

partnerRouter.patch(
  '/:id/status',
  authorize('SUPER_ADMIN'),
  asyncHandler(changePartnerStatusHandler),
);