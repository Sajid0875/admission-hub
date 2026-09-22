/**
 * commission.controller.ts - Commission record HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to commission.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * Role gating is applied in commission.routes.ts via `authorize(...)`.
 * Services re-check tenant scope and role rules.
 */

import type { Request, Response } from 'express';
import {
    ChangeCommissionStatusSchema,
    CommissionSummaryQuerySchema,
    ListCommissionsQuerySchema,
} from './commission.schema.js';
import * as commissionService from './commission.service.js';
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
// GET /api/v1/commissions
// --------------------------------------------------

export const listCommissionsHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListCommissionsQuerySchema.parse(req.query);

    const result = await commissionService.listCommissions(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/commissions/summary
// --------------------------------------------------

export const getCommissionSummaryHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = CommissionSummaryQuerySchema.parse(req.query);

    const summary = await commissionService.getCommissionSummary(actor, query);

    res.status(200).json({ summary });
};

// --------------------------------------------------
// GET /api/v1/commissions/:id
// --------------------------------------------------

export const getCommissionHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const commission = await commissionService.getCommissionById(
        actor,
        id as string,
    );

    res.status(200).json({ commission });
};

// --------------------------------------------------
// PATCH /api/v1/commissions/:id/status
// --------------------------------------------------

export const changeCommissionStatusHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = ChangeCommissionStatusSchema.parse(req.body);

    const commission = await commissionService.changeCommissionStatus(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ commission });
};