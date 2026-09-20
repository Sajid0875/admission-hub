/**
 * marketing-asset.controller.ts - Marketing asset HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to marketing-asset.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect`. Role gating is applied in
 * marketing-asset.routes.ts via `authorize(...)`. Services re-check
 * `SUPER_ADMIN` on write.
 */

import type { Request, Response } from 'express';
import {
    CreateMarketingAssetSchema,
    UpdateMarketingAssetSchema,
    ArchiveMarketingAssetSchema,
    ListMarketingAssetsQuerySchema,
} from './marketing-asset.schema.js';
import * as marketingAssetService from './marketing-asset.service.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';

// --------------------------------------------------
// Helper — read actor from req.user
// --------------------------------------------------

const requireActor = (req: Request): ScopeUser => {
    if (!req.user) {
        throw UnauthorizedError('Authentication required');
    }
    return req.user;
};

// --------------------------------------------------
// GET /api/v1/marketing-assets
// --------------------------------------------------

export const listMarketingAssetsHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListMarketingAssetsQuerySchema.parse(req.query);

    const result = await marketingAssetService.listMarketingAssets(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/marketing-assets/:id
// --------------------------------------------------

export const getMarketingAssetHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const asset = await marketingAssetService.getMarketingAssetById(
        actor,
        id as string,
    );

    res.status(200).json({ asset });
};

// --------------------------------------------------
// POST /api/v1/marketing-assets
// --------------------------------------------------

export const createMarketingAssetHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const input = CreateMarketingAssetSchema.parse(req.body);

    const asset = await marketingAssetService.createMarketingAsset(actor, input);

    res.status(201).json({ asset });
};

// --------------------------------------------------
// PATCH /api/v1/marketing-assets/:id
// --------------------------------------------------

export const updateMarketingAssetHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = UpdateMarketingAssetSchema.parse(req.body);

    const asset = await marketingAssetService.updateMarketingAsset(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ asset });
};

// --------------------------------------------------
// DELETE /api/v1/marketing-assets/:id
// Soft-archive; row stays in DB with status = ARCHIVED
// --------------------------------------------------

export const archiveMarketingAssetHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = ArchiveMarketingAssetSchema.parse(req.body ?? {});

    const asset = await marketingAssetService.archiveMarketingAsset(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ asset });
};