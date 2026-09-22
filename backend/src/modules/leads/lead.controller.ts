/**
 * lead.controller.ts - Lead HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to lead.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect`. Role gating is applied in lead.routes.ts
 * via `authorize(...)`. Services still re-check tenant + assignment scope.
 */

import type { Request, Response } from 'express';
import {
    CreateLeadSchema,
    UpdateLeadSchema,
    AssignLeadSchema,
    ChangeLeadStatusSchema,
    ArchiveLeadSchema,
    ListLeadsQuerySchema,
    ListActivitiesQuerySchema,
} from './lead.schema.js';
import * as leadService from './lead.service.js';
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
// GET /api/v1/leads
// --------------------------------------------------

export const listLeadsHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListLeadsQuerySchema.parse(req.query);

    const result = await leadService.listLeads(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/leads/:id
// --------------------------------------------------

export const getLeadHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const lead = await leadService.getLeadById(actor, id as string);

    res.status(200).json({ lead });
};

// --------------------------------------------------
// POST /api/v1/leads
// --------------------------------------------------

export const createLeadHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const input = CreateLeadSchema.parse(req.body);

    const result = await leadService.createLead(actor, input);

    const body: Record<string, unknown> = { lead: result.lead };
    if (result.duplicateFlag) {
        body.duplicateFlag = true;
        if (result.duplicateOf) body.duplicateOf = result.duplicateOf;
    }

    res.status(201).json(body);
};

// --------------------------------------------------
// PATCH /api/v1/leads/:id
// --------------------------------------------------

export const updateLeadHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = UpdateLeadSchema.parse(req.body);

    const lead = await leadService.updateLead(actor, id as string, input);

    res.status(200).json({ lead });
};

// --------------------------------------------------
// PATCH /api/v1/leads/:id/assign
// --------------------------------------------------

export const assignLeadHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = AssignLeadSchema.parse(req.body);

    const lead = await leadService.assignLead(actor, id as string, input);

    res.status(200).json({ lead });
};

// --------------------------------------------------
// PATCH /api/v1/leads/:id/status
// --------------------------------------------------

export const changeLeadStatusHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = ChangeLeadStatusSchema.parse(req.body);

    const lead = await leadService.changeLeadStatus(actor, id as string, input);

    res.status(200).json({ lead });
};

// --------------------------------------------------
// POST /api/v1/leads/:id/archive
// --------------------------------------------------

export const archiveLeadHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = ArchiveLeadSchema.parse(req.body ?? {});

    const lead = await leadService.archiveLead(actor, id as string, input);

    res.status(200).json({ lead });
};

// --------------------------------------------------
// GET /api/v1/leads/:id/activities
// --------------------------------------------------

export const listLeadActivitiesHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const query = ListActivitiesQuerySchema.parse(req.query);

    const result = await leadService.listLeadActivities(
        actor,
        id as string,
        query,
    );

    res.status(200).json(result);
};