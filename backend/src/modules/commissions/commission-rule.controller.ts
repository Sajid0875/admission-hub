/**
 * commission-rule.controller.ts - Commission rule HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to commission-rule.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect` + `authorize('SUPER_ADMIN')`.
 */

import type { Request, Response } from 'express';
import {
    CreateCommissionRuleSchema,
    UpdateCommissionRuleSchema,
    ListCommissionRulesQuerySchema,
} from './commission-rule.schema.js';
import * as commissionRuleService from './commission-rule.service.js';
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
// GET /api/v1/commission-rules
// --------------------------------------------------

export const listCommissionRulesHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListCommissionRulesQuerySchema.parse(req.query);

    const result = await commissionRuleService.listCommissionRules(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/commission-rules/:id
// --------------------------------------------------

export const getCommissionRuleHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const rule = await commissionRuleService.getCommissionRuleById(
        actor,
        id as string,
    );

    res.status(200).json({ rule });
};

// --------------------------------------------------
// POST /api/v1/commission-rules
// --------------------------------------------------

export const createCommissionRuleHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const input = CreateCommissionRuleSchema.parse(req.body);

    const rule = await commissionRuleService.createCommissionRule(actor, input);

    res.status(201).json({ rule });
};

// --------------------------------------------------
// PATCH /api/v1/commission-rules/:id
// --------------------------------------------------

export const updateCommissionRuleHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = UpdateCommissionRuleSchema.parse(req.body);

    const rule = await commissionRuleService.updateCommissionRule(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ rule });
};

// --------------------------------------------------
// DELETE /api/v1/commission-rules/:id
// --------------------------------------------------

export const deleteCommissionRuleHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    await commissionRuleService.deleteCommissionRule(actor, id as string);

    res.status(204).send();
};