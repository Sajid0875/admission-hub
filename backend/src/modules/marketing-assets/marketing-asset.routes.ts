/**
 * marketing-asset.routes.ts - Marketing asset route definitions.
 *
 * Mounts under /api/v1/marketing-assets (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list assets (any authenticated)
 *   GET    /:id                   get one asset (any authenticated)
 *   POST   /                      create asset (super_admin)
 *   PATCH  /:id                   update asset (super_admin)
 *   DELETE /:id                   archive asset (super_admin, soft delete)
 *
 * Every route is behind `protect`.
 * Assets are globally readable — write access is super_admin only.
 *
 * Note: DELETE is implemented as a soft archive (status = ARCHIVED).
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listMarketingAssetsHandler,
    getMarketingAssetHandler,
    createMarketingAssetHandler,
    updateMarketingAssetHandler,
    archiveMarketingAssetHandler,
} from './marketing-asset.controller.js';

export const marketingAssetRouter: Router = Router();

// All marketing asset routes require authentication
marketingAssetRouter.use(protect);

// --- Read (any authenticated user) ---
marketingAssetRouter.get(
    '/',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(listMarketingAssetsHandler),
);

marketingAssetRouter.get(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(getMarketingAssetHandler),
);

// --- Write (super_admin only) ---
marketingAssetRouter.post(
    '/',
    authorize('SUPER_ADMIN'),
    asyncHandler(createMarketingAssetHandler),
);

marketingAssetRouter.patch(
    '/:id',
    authorize('SUPER_ADMIN'),
    asyncHandler(updateMarketingAssetHandler),
);

// --- Archive (soft delete; super_admin only) ---
marketingAssetRouter.delete(
    '/:id',
    authorize('SUPER_ADMIN'),
    asyncHandler(archiveMarketingAssetHandler),
);