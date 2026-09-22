/**
 * partner.controller.ts - Partner HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to partner.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect`. Role gating is applied in partner.routes.ts
 * via `authorize(...)`. Services still re-check tenant scope.
 */

import type { Request, Response } from 'express';
import {
    CreatePartnerSchema,
    UpdatePartnerSchema,
    ChangePartnerStatusSchema,
    ListPartnersQuerySchema,
} from './partner.schema.js';
import * as partnerService from './partner.service.js';
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
// GET /api/v1/partners
// --------------------------------------------------

export const listPartnersHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListPartnersQuerySchema.parse(req.query);

    const result = await partnerService.listPartners(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/partners/:id
// --------------------------------------------------

export const getPartnerHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const partner = await partnerService.getPartnerById(actor, id as string);

    res.status(200).json({ partner });
};

// --------------------------------------------------
// POST /api/v1/partners
// --------------------------------------------------

export const createPartnerHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const input = CreatePartnerSchema.parse(req.body);

    const partner = await partnerService.createPartner(actor, input);

    res.status(201).json({ partner });
};

// --------------------------------------------------
// PATCH /api/v1/partners/:id
// --------------------------------------------------

export const updatePartnerHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = UpdatePartnerSchema.parse(req.body);

    const partner = await partnerService.updatePartner(actor, id as string, input);

    res.status(200).json({ partner });
};

// --------------------------------------------------
// PATCH /api/v1/partners/:id/status
// --------------------------------------------------

export const changePartnerStatusHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = ChangePartnerStatusSchema.parse(req.body);

    const partner = await partnerService.changePartnerStatus(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ partner });
};