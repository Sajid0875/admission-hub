/**
 * commission.service.ts - Commission record business logic.
 *
 * Responsibilities:
 *   - List / get commission records (super_admin + partner_admin)
 *   - Summary KPIs (GET /commissions/summary)
 *   - Change status: PENDING → APPROVED → PAID; PENDING → CANCELLED
 *   - Stamp paidAt when status becomes PAID
 *   - Tenant scoping: partner_admin sees only own org
 *
 * Enforces:
 *   - Only super_admin can change status
 *   - Status transitions follow a state machine
 *   - Financial fields (rate, baseAmount, commissionAmount) are immutable
 */

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';
import { AuditAction, logAction } from '../../shared/utils/audit.js';
import { NotificationType, notify } from '../../shared/utils/notify.js';
import { CommissionStatus } from '@prisma/client';
import type {
    ChangeCommissionStatusInput,
    CommissionSummaryQuery,
    ListCommissionsQuery,
} from './commission.schema.js';

// --------------------------------------------------
// Public shape
// --------------------------------------------------

export interface SafeCommissionRecord {
    id: string;
    partnerId: string;
    admissionId: string;
    ruleId: string | null;
    baseAmount: number;
    commissionRate: number;
    commissionAmount: number;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
}

const toSafeRecord = (row: {
    id: string;
    partnerId: string;
    admissionId: string;
    ruleId: string | null;
    baseAmount: unknown;
    commissionRate: unknown;
    commissionAmount: unknown;
    status: CommissionStatus;
    paidAt: Date | null;
    createdAt: Date;
}): SafeCommissionRecord => ({
    id: row.id,
    partnerId: row.partnerId,
    admissionId: row.admissionId,
    ruleId: row.ruleId,
    baseAmount: Number(row.baseAmount),
    commissionRate: Number(row.commissionRate),
    commissionAmount: Number(row.commissionAmount),
    status: row.status,
    paidAt: row.paidAt,
    createdAt: row.createdAt,
});

// --------------------------------------------------
// Status state machine
// --------------------------------------------------

const VALID_TRANSITIONS: Record<CommissionStatus, CommissionStatus[]> = {
    [CommissionStatus.PENDING]: [
        CommissionStatus.APPROVED,
        CommissionStatus.CANCELLED,
    ],
    [CommissionStatus.APPROVED]: [CommissionStatus.PAID],
    [CommissionStatus.PAID]: [],
    [CommissionStatus.CANCELLED]: [],
};

const assertValidTransition = (
    from: CommissionStatus,
    to: CommissionStatus,
): void => {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
        throw BadRequestError(`Invalid status transition: ${from} → ${to}`);
    }
};

// --------------------------------------------------
// List
// --------------------------------------------------

export interface ListCommissionsResult {
    data: SafeCommissionRecord[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listCommissions = async (
    actor: ScopeUser,
    query: ListCommissionsQuery,
): Promise<ListCommissionsResult> => {
    // Scope check: super_admin sees all; partner_admin sees own org
    if (actor.role !== 'SUPER_ADMIN') {
        if (actor.role !== 'PARTNER_ADMIN') {
            throw ForbiddenError('Only SUPER_ADMIN and PARTNER_ADMIN can view commissions');
        }
        if (!actor.partnerId) {
            throw ForbiddenError('User is not associated with any partner');
        }
    }

    const where: Record<string, unknown> = {};

    if (actor.role === 'PARTNER_ADMIN' && actor.partnerId) {
        where.partnerId = actor.partnerId;
    }

    if (query.status) where.status = query.status;
    if (query.admissionId) where.admissionId = query.admissionId;

    // Super_admin can filter by partnerId
    if (query.partnerId) {
        if (actor.role !== 'SUPER_ADMIN') {
            throw ForbiddenError('Only SUPER_ADMIN can filter by partnerId');
        }
        where.partnerId = query.partnerId;
    }

    if (query.from || query.to) {
        const range: Record<string, Date> = {};
        if (query.from) range.gte = query.from;
        if (query.to) range.lte = query.to;
        where.createdAt = range;
    }

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.commissionRecord.count({ where }),
        prisma.commissionRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(toSafeRecord),
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

export const getCommissionById = async (
    actor: ScopeUser,
    commissionId: string,
): Promise<SafeCommissionRecord> => {
    const row = await prisma.commissionRecord.findUnique({
        where: { id: commissionId },
    });

    if (!row) throw NotFoundError('Commission record not found');

    if (actor.role !== 'SUPER_ADMIN') {
        if (actor.role !== 'PARTNER_ADMIN') {
            throw ForbiddenError('Not allowed to access this commission record');
        }
        if (!actor.partnerId || actor.partnerId !== row.partnerId) {
            throw ForbiddenError('Not allowed to access this commission record');
        }
    }

    return toSafeRecord(row);
};

// --------------------------------------------------
// Change status
// --------------------------------------------------

export const changeCommissionStatus = async (
    actor: ScopeUser,
    commissionId: string,
    input: ChangeCommissionStatusInput,
): Promise<SafeCommissionRecord> => {
    if (actor.role !== 'SUPER_ADMIN') {
        throw ForbiddenError('Only SUPER_ADMIN can change commission status');
    }

    const existing = await prisma.commissionRecord.findUnique({
        where: { id: commissionId },
        select: { id: true, status: true },
    });
    if (!existing) throw NotFoundError('Commission record not found');

    assertValidTransition(existing.status, input.status);

    const data: Record<string, unknown> = { status: input.status };

    // Stamp paidAt when transitioning to PAID
    if (
        input.status === CommissionStatus.PAID &&
        existing.status !== CommissionStatus.PAID
    ) {
        data.paidAt = new Date();
    }

    const updated = await prisma.commissionRecord.update({
        where: { id: commissionId },
        data,
    });

    logger.info(
        {
            actorId: actor.id,
            commissionId,
            from: existing.status,
            to: input.status,
            note: input.note ?? null,
        },
        'commission status changed',
    );

    const auditAction =
        input.status === CommissionStatus.APPROVED
            ? AuditAction.COMMISSION_APPROVED
            : input.status === CommissionStatus.PAID
              ? AuditAction.COMMISSION_PAID
              : AuditAction.PAYOUT_APPROVED;

    void logAction({
        actorId: actor.id,
        partnerId: updated.partnerId,
        action: auditAction,
        entityType: 'commission',
        entityId: commissionId,
        oldValue: { status: existing.status },
        newValue: { status: input.status },
    });

    if (
        input.status === CommissionStatus.APPROVED ||
        input.status === CommissionStatus.PAID
    ) {
        void (async () => {
            const admins = await prisma.user.findMany({
                where: {
                    partnerId: updated.partnerId,
                    status: 'ACTIVE',
                    role: { name: 'PARTNER_ADMIN' },
                },
                select: { id: true },
            });
            for (const admin of admins) {
                void notify({
                    userId: admin.id,
                    partnerId: updated.partnerId,
                    type:
                        input.status === CommissionStatus.PAID
                            ? NotificationType.COMMISSION_PAID
                            : NotificationType.COMMISSION_APPROVED,
                    title:
                        input.status === CommissionStatus.PAID
                            ? 'Commission paid'
                            : 'Commission approved',
                    message: `Commission ${commissionId} is now ${input.status}.`,
                    referenceType: 'commission',
                    referenceId: commissionId,
                });
            }
        })();
    }

    return toSafeRecord(updated);
};
// --------------------------------------------------
// Summary KPIs
// --------------------------------------------------

export interface CommissionSummary {
    totalEarned: number;
    pendingPayout: number;
    totalPaid: number;
    lastPayoutDate: string | null;
    counts: {
        pending: number;
        approved: number;
        paid: number;
        cancelled: number;
    };
}

/**
 * Aggregates commission amounts for the actor's scope.
 * Matches FE KPI semantics: pendingPayout = PENDING + APPROVED amounts.
 */
export const getCommissionSummary = async (
    actor: ScopeUser,
    query: CommissionSummaryQuery = {},
): Promise<CommissionSummary> => {
    if (actor.role !== 'SUPER_ADMIN') {
        if (actor.role !== 'PARTNER_ADMIN') {
            throw ForbiddenError('Only SUPER_ADMIN and PARTNER_ADMIN can view commissions');
        }
        if (!actor.partnerId) {
            throw ForbiddenError('User is not associated with any partner');
        }
    }

    const where: { partnerId?: string } = {};

    if (actor.role === 'PARTNER_ADMIN' && actor.partnerId) {
        where.partnerId = actor.partnerId;
    }

    if (query.partnerId) {
        if (actor.role !== 'SUPER_ADMIN') {
            throw ForbiddenError('Only SUPER_ADMIN can filter by partnerId');
        }
        where.partnerId = query.partnerId;
    }

    const [grouped, lastPaid] = await Promise.all([
        prisma.commissionRecord.groupBy({
            by: ['status'],
            where,
            _sum: { commissionAmount: true },
            _count: { _all: true },
        }),
        prisma.commissionRecord.findFirst({
            where: { ...where, status: CommissionStatus.PAID, paidAt: { not: null } },
            orderBy: { paidAt: 'desc' },
            select: { paidAt: true },
        }),
    ]);

    const amountOf = (status: CommissionStatus): number => {
        const row = grouped.find((g) => g.status === status);
        return Number(row?._sum.commissionAmount ?? 0);
    };

    const countOf = (status: CommissionStatus): number => {
        const row = grouped.find((g) => g.status === status);
        return row?._count._all ?? 0;
    };

    const pendingAmt = amountOf(CommissionStatus.PENDING);
    const approvedAmt = amountOf(CommissionStatus.APPROVED);
    const paidAmt = amountOf(CommissionStatus.PAID);
    const cancelledAmt = amountOf(CommissionStatus.CANCELLED);

    return {
        totalEarned: pendingAmt + approvedAmt + paidAmt + cancelledAmt,
        pendingPayout: pendingAmt + approvedAmt,
        totalPaid: paidAmt,
        lastPayoutDate: lastPaid?.paidAt ? lastPaid.paidAt.toISOString() : null,
        counts: {
            pending: countOf(CommissionStatus.PENDING),
            approved: countOf(CommissionStatus.APPROVED),
            paid: countOf(CommissionStatus.PAID),
            cancelled: countOf(CommissionStatus.CANCELLED),
        },
    };
};
