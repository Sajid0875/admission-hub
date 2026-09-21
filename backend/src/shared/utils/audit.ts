/**
 * audit.ts - Audit log creation helper.
 *
 * Fire-and-forget: callers don't await this. A failure to write an
 * audit record NEVER blocks the primary action (e.g. a partner approval
 * still succeeds even if the audit write fails).
 *
 * Other services import `logAction()` from here.
 *
 * Uses the Prisma client directly (not a service) to avoid circular
 * imports. Mirrors the pattern used by `notify()`.
 */

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

// --------------------------------------------------
// Action constants — kept as strings for consistency
// --------------------------------------------------

export const AuditAction = {
    // Partner lifecycle
    PARTNER_CREATED: 'PARTNER_CREATED',
    PARTNER_UPDATED: 'PARTNER_UPDATED',
    PARTNER_APPROVED: 'PARTNER_APPROVED',
    PARTNER_SUSPENDED: 'PARTNER_SUSPENDED',
    PARTNER_REJECTED: 'PARTNER_REJECTED',

    // User lifecycle
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
    USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
    USER_SUSPENDED: 'USER_SUSPENDED',

    // Leads
    LEAD_TRANSFERRED: 'LEAD_TRANSFERRED',
    LEAD_STATUS_CHANGED: 'LEAD_STATUS_CHANGED',
    LEAD_ARCHIVED: 'LEAD_ARCHIVED',

    // Admissions
    ADMISSION_CREATED: 'ADMISSION_CREATED',
    ADMISSION_UPDATED: 'ADMISSION_UPDATED',
    ADMISSION_VERIFIED: 'ADMISSION_VERIFIED',
    ADMISSION_CANCELLED: 'ADMISSION_CANCELLED',

    // Payments
    PAYMENT_RECORDED: 'PAYMENT_RECORDED',
    PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',

    // Commissions
    COMMISSION_RULE_CREATED: 'COMMISSION_RULE_CREATED',
    COMMISSION_RULE_UPDATED: 'COMMISSION_RULE_UPDATED',
    COMMISSION_RULE_DELETED: 'COMMISSION_RULE_DELETED',
    COMMISSION_APPROVED: 'COMMISSION_APPROVED',
    COMMISSION_PAID: 'COMMISSION_PAID',
    PAYOUT_APPROVED: 'PAYOUT_APPROVED',

    // Courses
    COURSE_CREATED: 'COURSE_CREATED',
    COURSE_UPDATED: 'COURSE_UPDATED',
    COURSE_STATUS_CHANGED: 'COURSE_STATUS_CHANGED',

    // Marketing
    MARKETING_ASSET_CREATED: 'MARKETING_ASSET_CREATED',
    MARKETING_ASSET_UPDATED: 'MARKETING_ASSET_UPDATED',
    MARKETING_ASSET_ARCHIVED: 'MARKETING_ASSET_ARCHIVED',
} as const;

export type AuditActionValue =
    (typeof AuditAction)[keyof typeof AuditAction];

// --------------------------------------------------
// Payload
// --------------------------------------------------

export interface LogActionInput {
    actorId: string | null;
    partnerId: string | null;
    action: AuditActionValue | string;
    entityType: string;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string | null;
    userAgent?: string | null;
}

// --------------------------------------------------
// Fire-and-forget helper
// --------------------------------------------------

/**
 * Writes an audit record. Never throws — failures are logged.
 *
 * Callers should NOT await this. Fire-and-forget style.
 *
 *   void logAction({
 *     actorId: req.user.id,
 *     partnerId: req.user.partnerId,
 *     action: AuditAction.PARTNER_APPROVED,
 *     entityType: 'partner',
 *     entityId: partner.id,
 *     oldValue: { status: 'PENDING' },
 *     newValue: { status: 'ACTIVE' },
 *   });
 */
export const logAction = async (input: LogActionInput): Promise<void> => {
    try {
        await prisma.auditLog.create({
            data: {
                userId: input.actorId,
                partnerId: input.partnerId,
                action: input.action,
                entityType: input.entityType,
                entityId: input.entityId,
                oldValue: (input.oldValue ?? undefined) as never,
                newValue: (input.newValue ?? undefined) as never,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null,
            },
        });
    } catch (err) {
        logger.warn(
            {
                err,
                actorId: input.actorId,
                action: input.action,
                entityType: input.entityType,
            },
            'failed to write audit log',
        );
    }
};