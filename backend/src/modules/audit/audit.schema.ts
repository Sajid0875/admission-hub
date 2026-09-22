/**
 * audit.schema.ts - Zod schemas for audit log endpoints.
 *
 * Endpoints covered:
 *   - List audit logs           (GET /audit-logs)
 *   - Get one audit log         (GET /audit-logs/:id)
 *
 * Notes:
 *   - No create/update/delete routes — audit is append-only.
 *   - Access: SUPER_ADMIN only (global governance concern).
 *   - Filters: actorId, partnerId, action, entityType, entityId, date range.
 */

import { z } from 'zod';

// --------------------------------------------------
// Shared
// --------------------------------------------------

const uuidSchema = z.string().uuid();

// --------------------------------------------------
// List / filter
// --------------------------------------------------

export const ListAuditLogsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
    actorId: uuidSchema.optional(),
    partnerId: uuidSchema.optional(),
    action: z.string().trim().min(1).max(100).optional(),
    entityType: z.string().trim().min(1).max(100).optional(),
    entityId: z.string().trim().min(1).max(200).optional(),
    from: z
        .string()
        .datetime({ message: 'from must be an ISO 8601 datetime' })
        .optional()
        .transform((v) => (v ? new Date(v) : undefined)),
    to: z
        .string()
        .datetime({ message: 'to must be an ISO 8601 datetime' })
        .optional()
        .transform((v) => (v ? new Date(v) : undefined)),
});

export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;