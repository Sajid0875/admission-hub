/**
 * commission-rule.service.ts - Commission rule business logic.
 *
 * Responsibilities:
 *   - CRUD for commission rules (super_admin only)
 *   - Validation: course exists if provided, rate bounds per commission type
 *   - Uniqueness: one rule per course (when courseId provided)
 *
 * Rule resolution helper (used by admission.service):
 *   - resolveCommissionRate(courseId, partnerId) → returns the applicable
 *     rate + ruleId, or { rate: 0, ruleId: null } if no match.
 */

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';
import { CommissionType } from '@prisma/client';
import type {
    CreateCommissionRuleInput,
    ListCommissionRulesQuery,
    UpdateCommissionRuleInput,
} from './commission-rule.schema.js';

// --------------------------------------------------
// Public shape
// --------------------------------------------------

export interface SafeCommissionRule {
    id: string;
    courseId: string | null;
    partnerType: string | null;
    commissionType: string;
    rate: number;
    createdAt: Date;
    updatedAt: Date;
}

const toSafeRule = (row: {
    id: string;
    courseId: string | null;
    partnerType: string | null;
    commissionType: CommissionType;
    rate: unknown;
    createdAt: Date;
    updatedAt: Date;
}): SafeCommissionRule => ({
    id: row.id,
    courseId: row.courseId,
    partnerType: row.partnerType,
    commissionType: row.commissionType,
    rate: Number(row.rate),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

// --------------------------------------------------
// Permission + validation
// --------------------------------------------------

const assertSuperAdmin = (actor: ScopeUser): void => {
    if (actor.role !== 'SUPER_ADMIN') {
        throw ForbiddenError('Only SUPER_ADMIN can manage commission rules');
    }
};

const assertRateInBounds = (
    commissionType: CommissionType,
    rate: number,
): void => {
    if (commissionType === CommissionType.PERCENTAGE && rate > 100) {
        throw BadRequestError('Percentage commission rate cannot exceed 100');
    }
};

const assertCourseExists = async (courseId: string): Promise<void> => {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
    });
    if (!course) throw BadRequestError('Course not found');
};

// --------------------------------------------------
// List
// --------------------------------------------------

export interface ListCommissionRulesResult {
    data: SafeCommissionRule[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listCommissionRules = async (
    actor: ScopeUser,
    query: ListCommissionRulesQuery,
): Promise<ListCommissionRulesResult> => {
    assertSuperAdmin(actor);

    const where: Record<string, unknown> = {};
    if (query.courseId) where.courseId = query.courseId;
    if (query.partnerType) where.partnerType = query.partnerType;
    if (query.commissionType) where.commissionType = query.commissionType;

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.commissionRule.count({ where }),
        prisma.commissionRule.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(toSafeRule),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
};

// --------------------------------------------------
// Get
// --------------------------------------------------

export const getCommissionRuleById = async (
    actor: ScopeUser,
    ruleId: string,
): Promise<SafeCommissionRule> => {
    assertSuperAdmin(actor);

    const row = await prisma.commissionRule.findUnique({
        where: { id: ruleId },
    });
    if (!row) throw NotFoundError('Commission rule not found');

    return toSafeRule(row);
};

// --------------------------------------------------
// Create
// --------------------------------------------------

export const createCommissionRule = async (
    actor: ScopeUser,
    input: CreateCommissionRuleInput,
): Promise<SafeCommissionRule> => {
    assertSuperAdmin(actor);
    assertRateInBounds(input.commissionType, input.rate);

    if (input.courseId) {
        await assertCourseExists(input.courseId);

        // Enforce one rule per course (non-null courseId)
        const existing = await prisma.commissionRule.findFirst({
            where: { courseId: input.courseId },
            select: { id: true },
        });
        if (existing) {
            throw ConflictError('A commission rule already exists for this course');
        }
    }

    const created = await prisma.commissionRule.create({
        data: {
            courseId: input.courseId ?? null,
            partnerType: input.partnerType ?? null,
            commissionType: input.commissionType,
            rate: input.rate,
        },
    });

    logger.info(
        { actorId: actor.id, ruleId: created.id, courseId: created.courseId },
        'commission rule created',
    );

    return toSafeRule(created);
};

// --------------------------------------------------
// Update
// --------------------------------------------------

export const updateCommissionRule = async (
    actor: ScopeUser,
    ruleId: string,
    input: UpdateCommissionRuleInput,
): Promise<SafeCommissionRule> => {
    assertSuperAdmin(actor);

    const existing = await prisma.commissionRule.findUnique({
        where: { id: ruleId },
    });
    if (!existing) throw NotFoundError('Commission rule not found');

    // Re-validate rate against the *effective* commissionType
    const effectiveType =
        input.commissionType ?? (existing.commissionType as CommissionType);
    const effectiveRate =
        input.rate !== undefined ? input.rate : Number(existing.rate);
    assertRateInBounds(effectiveType, effectiveRate);

    // If courseId is being changed, validate course + uniqueness
    if (input.courseId !== undefined && input.courseId !== null) {
        await assertCourseExists(input.courseId);

        const conflict = await prisma.commissionRule.findFirst({
            where: {
                courseId: input.courseId,
                id: { not: ruleId },
            },
            select: { id: true },
        });
        if (conflict) {
            throw ConflictError('A commission rule already exists for this course');
        }
    }

    const updated = await prisma.commissionRule.update({
        where: { id: ruleId },
        data: {
            courseId: input.courseId ?? undefined,
            partnerType: input.partnerType ?? undefined,
            commissionType: input.commissionType ?? undefined,
            rate: input.rate ?? undefined,
        },
    });

    logger.info({ actorId: actor.id, ruleId }, 'commission rule updated');

    return toSafeRule(updated);
};

// --------------------------------------------------
// Delete (hard delete)
// --------------------------------------------------

export const deleteCommissionRule = async (
    actor: ScopeUser,
    ruleId: string,
): Promise<void> => {
    assertSuperAdmin(actor);

    const existing = await prisma.commissionRule.findUnique({
        where: { id: ruleId },
        select: { id: true },
    });
    if (!existing) throw NotFoundError('Commission rule not found');

    await prisma.commissionRule.delete({ where: { id: ruleId } });

    logger.info({ actorId: actor.id, ruleId }, 'commission rule deleted');
};

// --------------------------------------------------
// Rule resolution (used by admission.service on verify)
// --------------------------------------------------

export interface ResolvedCommission {
    ruleId: string | null;
    commissionType: CommissionType;
    rate: number;
}

/**
 * Resolves the applicable commission rate for a given admission context.
 *
 * Priority:
 *   1. Course-level rule (courseId matches)
 *   2. partnerType rule (if we knew partner types — placeholder for future)
 *   3. Fallback: rate 0, no rule
 *
 * The commissionType default is PERCENTAGE.
 */
export const resolveCommissionRate = async (
    courseId: string,
): Promise<ResolvedCommission> => {
    const rule = await prisma.commissionRule.findFirst({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
    });

    if (!rule) {
        return {
            ruleId: null,
            commissionType: CommissionType.PERCENTAGE,
            rate: 0,
        };
    }

    return {
        ruleId: rule.id,
        commissionType: rule.commissionType,
        rate: Number(rule.rate),
    };
};