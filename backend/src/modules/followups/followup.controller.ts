/**
 * followup.controller.ts - Follow-up HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to followup.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect`. Role gating is applied in followup.routes.ts
 * via `authorize(...)`. Services still re-check tenant + assignment scope.
 */

import type { Request, Response } from 'express';
import {
    CreateFollowUpSchema,
    UpdateFollowUpSchema,
    CompleteFollowUpSchema,
    SnoozeFollowUpSchema,
    CancelFollowUpSchema,
    ListFollowUpsQuerySchema,
    ListLeadFollowUpsQuerySchema,
} from './followup.schema.js';
import * as followUpService from './followup.service.js';
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
// GET /api/v1/followups
// --------------------------------------------------

export const listFollowUpsHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListFollowUpsQuerySchema.parse(req.query);

    const result = await followUpService.listFollowUps(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/followups/:id
// --------------------------------------------------

export const getFollowUpHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const followUp = await followUpService.getFollowUpById(actor, id as string);

    res.status(200).json({ followUp });
};

// --------------------------------------------------
// POST /api/v1/followups
// --------------------------------------------------

export const createFollowUpHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const input = CreateFollowUpSchema.parse(req.body);

    const followUp = await followUpService.createFollowUp(actor, input);

    res.status(201).json({ followUp });
};

// --------------------------------------------------
// PATCH /api/v1/followups/:id
// --------------------------------------------------

export const updateFollowUpHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = UpdateFollowUpSchema.parse(req.body);

    const followUp = await followUpService.updateFollowUp(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ followUp });
};

// --------------------------------------------------
// POST /api/v1/followups/:id/complete
// --------------------------------------------------

export const completeFollowUpHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = CompleteFollowUpSchema.parse(req.body);

    const followUp = await followUpService.completeFollowUp(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ followUp });
};

// --------------------------------------------------
// POST /api/v1/followups/:id/snooze
// --------------------------------------------------

export const snoozeFollowUpHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = SnoozeFollowUpSchema.parse(req.body);

    const followUp = await followUpService.snoozeFollowUp(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ followUp });
};

// --------------------------------------------------
// POST /api/v1/followups/:id/cancel
// --------------------------------------------------

export const cancelFollowUpHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = CancelFollowUpSchema.parse(req.body ?? {});

    const followUp = await followUpService.cancelFollowUp(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ followUp });
};

// --------------------------------------------------
// GET /api/v1/leads/:id/followups
// (mounted from the leads router — path param is `id` for lead id)
// --------------------------------------------------

export const listLeadFollowUpsHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const query = ListLeadFollowUpsQuerySchema.parse(req.query);

    const result = await followUpService.listFollowUpsForLead(
        actor,
        id as string,
        query,
    );

    res.status(200).json(result);
};