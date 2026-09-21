/**
 * audit.service.ts - Audit log business logic.
 *
 * Read-only. No create/update/delete operations exist here.
 * Creation happens via the `logAction()` helper in `src/shared/utils/audit.ts`.
 *
 * Enforces:
 *   - Access: SUPER_ADMIN only (service double-checks what the router gates)
 *   - Append-only: no mutation methods ever exist in this file
 */

import { prisma } from '../../config/prisma.js';
import { ForbiddenError, NotFoundError } from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';
import type { ListAuditLogsQuery } from './audit.schema.js';

// --------------------------------------------------
// Public shape
// --------------------------------------------------

export interface SafeAuditLog {
    id: string;
    userId: string | null;
    partnerId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue: unknown;
    newValue: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}

const toSafe = (row: {
    id: string;
    userId: string | null;
    partnerId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue: unknown;
    newValue: unknown;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}): SafeAuditLog => ({
    id: row.id,
    userId: row.userId,
    partnerId: row.partnerId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    oldValue: row.oldValue,
    newValue: row.newValue,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
});

// --------------------------------------------------
// Access control
// --------------------------------------------------

const assertSuperAdmin = (actor: ScopeUser): void => {
    if (actor.role !== 'SUPER_ADMIN') {
        throw ForbiddenError('Only SUPER_ADMIN can view audit logs');
    }
};

// --------------------------------------------------
// List
// --------------------------------------------------

export interface ListAuditLogsResult {
    data: SafeAuditLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listAuditLogs = async (
    actor: ScopeUser,
    query: ListAuditLogsQuery,
): Promise<ListAuditLogsResult> => {
    assertSuperAdmin(actor);

    const where: Record<string, unknown> = {};

    if (query.actorId) where.userId = query.actorId;
    if (query.partnerId) where.partnerId = query.partnerId;
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;

    if (query.from || query.to) {
        const range: Record<string, Date> = {};
        if (query.from) range.gte = query.from;
        if (query.to) range.lte = query.to;
        where.createdAt = range;
    }

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(toSafe),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
};

// --------------------------------------------------
// Get by id
// --------------------------------------------------

export const getAuditLogById = async (
    actor: ScopeUser,
    auditLogId: string,
): Promise<SafeAuditLog> => {
    assertSuperAdmin(actor);

    const row = await prisma.auditLog.findUnique({
        where: { id: auditLogId },
    });

    if (!row) throw NotFoundError('Audit log not found');

    return toSafe(row);
};