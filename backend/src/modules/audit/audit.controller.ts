/**
 * audit.controller.ts - Audit log HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate query params with Zod
 *   - Delegate to audit.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect` + `authorize('SUPER_ADMIN')`.
 * No write routes exist — audit is append-only.
 */

import type { Request, Response } from 'express';
import { ListAuditLogsQuerySchema } from './audit.schema.js';
import * as auditService from './audit.service.js';
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
// GET /api/v1/audit-logs
// --------------------------------------------------

export const listAuditLogsHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListAuditLogsQuerySchema.parse(req.query);

    const result = await auditService.listAuditLogs(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/audit-logs/:id
// --------------------------------------------------

export const getAuditLogHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const auditLog = await auditService.getAuditLogById(actor, id as string);

    res.status(200).json({ auditLog });
};