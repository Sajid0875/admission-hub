/**
 * followup.service.ts - Follow-up business logic.
 *
 * Responsibilities:
 *   - CRUD with tenant + assignment scoping
 *   - Lead-linked operations (create, list-by-lead)
 *   - Complete with outcome
 *   - Snooze (moves dueAt forward)
 *   - Cancel (soft)
 *   - Overdue computed on the fly (status PENDING + dueAt < now)
 *   - Timeline integration (append LeadActivity on mutations)
 *
 * Enforces:
 *   - Cannot create follow-up on a terminal lead (ADMITTED, LOST)
 *   - Assigned user must be a COUNSELOR in the same partner
 *   - Counselor sees only assigned follow-ups
 *   - Snooze target date must be in the future
 */

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';
import {
    ActivityType,
    FollowUpStatus,
    FollowUpOutcome,
    LeadPriority,
    LeadStatus,
    RoleName,
} from '@prisma/client';
import type {
    CancelFollowUpInput,
    CompleteFollowUpInput,
    CreateFollowUpInput,
    ListFollowUpsQuery,
    ListLeadFollowUpsQuery,
    SnoozeFollowUpInput,
    UpdateFollowUpInput,
} from './followup.schema.js';

// --------------------------------------------------
// Public shape
// --------------------------------------------------

export interface SafeFollowUp {
    id: string;
    leadId: string;
    assignedTo: string | null;
    dueAt: Date;
    priority: string;
    status: string;
    outcome: string | null;
    notes: string | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    overdue?: boolean;
}

const toSafeFollowUp = (row: {
    id: string;
    leadId: string;
    assignedTo: string | null;
    dueAt: Date;
    priority: LeadPriority;
    status: FollowUpStatus;
    outcome: FollowUpOutcome | null;
    notes: string | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}): SafeFollowUp => ({
    id: row.id,
    leadId: row.leadId,
    assignedTo: row.assignedTo,
    dueAt: row.dueAt,
    priority: row.priority,
    status: row.status,
    outcome: row.outcome,
    notes: row.notes,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const computeOverdue = (row: SafeFollowUp): SafeFollowUp => ({
    ...row,
    overdue: row.status === FollowUpStatus.PENDING && row.dueAt < new Date(),
});

// --------------------------------------------------
// Activity helper
// --------------------------------------------------

const appendActivity = async (
    leadId: string,
    userId: string | null,
    type: ActivityType,
    description: string,
    metadata?: Record<string, unknown>,
): Promise<void> => {
    try {
        await prisma.leadActivity.create({
            data: {
                leadId,
                userId,
                type,
                description,
                metadata: (metadata ?? undefined) as never,
            },
        });
    } catch (err) {
        logger.warn({ err, leadId, type }, 'failed to append lead activity');
    }
};

// --------------------------------------------------
// Access helpers
// --------------------------------------------------

const loadFollowUpForActor = async (
    actor: ScopeUser,
    followUpId: string,
): Promise<{
    id: string;
    leadId: string;
    assignedTo: string | null;
    dueAt: Date;
    status: FollowUpStatus;
    partnerId: string;
}> => {
    const row = await prisma.followUp.findUnique({
        where: { id: followUpId },
        select: {
            id: true,
            leadId: true,
            assignedTo: true,
            dueAt: true,
            status: true,
            lead: { select: { partnerId: true } },
        },
    });

    if (!row) throw NotFoundError('Follow-up not found');

    const partnerId = row.lead.partnerId;

    if (actor.role !== 'SUPER_ADMIN') {
        if (!actor.partnerId || actor.partnerId !== partnerId) {
            throw ForbiddenError('Not allowed to access this follow-up');
        }
        if (
            (actor.role === 'COUNSELOR' || actor.role === 'SUPPORT') &&
            row.assignedTo !== actor.id
        ) {
            throw ForbiddenError('Follow-up is not assigned to you');
        }
    }

    return {
        id: row.id,
        leadId: row.leadId,
        assignedTo: row.assignedTo,
        dueAt: row.dueAt,
        status: row.status,
        partnerId,
    };
};

const assertLeadIsActive = (status: LeadStatus): void => {
    if (status === LeadStatus.ADMITTED || status === LeadStatus.LOST) {
        throw BadRequestError(
            `Cannot manage follow-ups for a lead in ${status} state`,
        );
    }
};

// --------------------------------------------------
// List
// --------------------------------------------------

export interface ListFollowUpsResult {
    data: SafeFollowUp[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listFollowUps = async (
    actor: ScopeUser,
    query: ListFollowUpsQuery,
): Promise<ListFollowUpsResult> => {
    const where: Record<string, unknown> = {};

    // Tenant scoping via lead
    if (actor.role !== 'SUPER_ADMIN') {
        if (!actor.partnerId) {
            throw ForbiddenError('User is not associated with any partner');
        }
        where.lead = { partnerId: actor.partnerId };
    }

    // Counselor/Support: only assigned
    if (actor.role === 'COUNSELOR' || actor.role === 'SUPPORT') {
        where.assignedTo = actor.id;
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.outcome) where.outcome = query.outcome;
    if (query.assignedTo) where.assignedTo = query.assignedTo;
    if (query.leadId) where.leadId = query.leadId;

    if (query.from || query.to) {
        const dueAtFilter: Record<string, Date> = {};
        if (query.from) dueAtFilter.gte = query.from;
        if (query.to) dueAtFilter.lte = query.to;
        where.dueAt = dueAtFilter;
    }

    if (query.overdue === true) {
        where.status = FollowUpStatus.PENDING;
        where.dueAt = { ...(where.dueAt as object | undefined), lt: new Date() };
    } else if (query.overdue === false) {
        // not overdue → either not PENDING, or PENDING with future dueAt
        where.OR = [
            { status: { not: FollowUpStatus.PENDING } },
            { status: FollowUpStatus.PENDING, dueAt: { gte: new Date() } },
        ];
    }

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.followUp.count({ where }),
        prisma.followUp.findMany({
            where,
            orderBy: { dueAt: 'asc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map((r) => computeOverdue(toSafeFollowUp(r))),
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

export const getFollowUpById = async (
    actor: ScopeUser,
    followUpId: string,
): Promise<SafeFollowUp> => {
    await loadFollowUpForActor(actor, followUpId);

    const row = await prisma.followUp.findUniqueOrThrow({
        where: { id: followUpId },
    });

    return computeOverdue(toSafeFollowUp(row));
};

// --------------------------------------------------
// Create
// --------------------------------------------------

export const createFollowUp = async (
    actor: ScopeUser,
    input: CreateFollowUpInput,
): Promise<SafeFollowUp> => {
    const lead = await prisma.lead.findUnique({
        where: { id: input.leadId },
        select: { id: true, partnerId: true, status: true },
    });
    if (!lead) throw NotFoundError('Lead not found');

    // Tenant check
    if (actor.role !== 'SUPER_ADMIN') {
        if (!actor.partnerId || actor.partnerId !== lead.partnerId) {
            throw ForbiddenError('Not allowed to create follow-ups for this lead');
        }
    }

    assertLeadIsActive(lead.status);

    // Assignee validation
    if (input.assignedTo) {
        const assignee = await prisma.user.findUnique({
            where: { id: input.assignedTo },
            select: { id: true, partnerId: true, role: { select: { name: true } } },
        });
        if (!assignee) throw BadRequestError('Assignee not found');
        if (assignee.partnerId !== lead.partnerId) {
            throw ForbiddenError('Assignee belongs to a different partner');
        }
        if (assignee.role.name !== RoleName.COUNSELOR) {
            throw BadRequestError('Follow-ups can only be assigned to COUNSELOR users');
        }
    }

    const created = await prisma.followUp.create({
        data: {
            leadId: lead.id,
            assignedTo: input.assignedTo ?? null,
            dueAt: input.dueAt,
            priority: input.priority ?? 'MEDIUM',
            notes: input.notes ?? null,
            status: FollowUpStatus.PENDING,
        },
    });

    await appendActivity(
        lead.id,
        actor.id,
        ActivityType.NOTE,
        'Follow-up scheduled',
        {
            followUpId: created.id,
            dueAt: input.dueAt.toISOString(),
            assignedTo: input.assignedTo ?? null,
        },
    );

    logger.info(
        { actorId: actor.id, followUpId: created.id, leadId: lead.id },
        'follow-up created',
    );

    return computeOverdue(toSafeFollowUp(created));
};

// --------------------------------------------------
// Update
// --------------------------------------------------

export const updateFollowUp = async (
    actor: ScopeUser,
    followUpId: string,
    input: UpdateFollowUpInput,
): Promise<SafeFollowUp> => {
    const existing = await loadFollowUpForActor(actor, followUpId);

    if (existing.status !== FollowUpStatus.PENDING) {
        throw BadRequestError(
            `Cannot update a follow-up in ${existing.status} state`,
        );
    }

    const updated = await prisma.followUp.update({
        where: { id: followUpId },
        data: {
            dueAt: input.dueAt ?? undefined,
            priority: input.priority ?? undefined,
            notes: input.notes ?? undefined,
        },
    });

    logger.info({ actorId: actor.id, followUpId }, 'follow-up updated');

    return computeOverdue(toSafeFollowUp(updated));
};

// --------------------------------------------------
// Complete
// --------------------------------------------------

export const completeFollowUp = async (
    actor: ScopeUser,
    followUpId: string,
    input: CompleteFollowUpInput,
): Promise<SafeFollowUp> => {
    const existing = await loadFollowUpForActor(actor, followUpId);

    if (existing.status !== FollowUpStatus.PENDING) {
        throw BadRequestError(
            `Cannot complete a follow-up in ${existing.status} state`,
        );
    }

    const completed = await prisma.followUp.update({
        where: { id: followUpId },
        data: {
            status: FollowUpStatus.COMPLETED,
            outcome: input.outcome,
            notes: input.notes ?? undefined,
            completedAt: new Date(),
        },
    });

    await appendActivity(
        existing.leadId,
        actor.id,
        ActivityType.NOTE,
        `Follow-up completed: ${input.outcome}`,
        { followUpId, outcome: input.outcome },
    );

    logger.info(
        { actorId: actor.id, followUpId, outcome: input.outcome },
        'follow-up completed',
    );

    return computeOverdue(toSafeFollowUp(completed));
};

// --------------------------------------------------
// Snooze
// --------------------------------------------------

export const snoozeFollowUp = async (
    actor: ScopeUser,
    followUpId: string,
    input: SnoozeFollowUpInput,
): Promise<SafeFollowUp> => {
    const existing = await loadFollowUpForActor(actor, followUpId);

    if (existing.status !== FollowUpStatus.PENDING) {
        throw BadRequestError(
            `Cannot snooze a follow-up in ${existing.status} state`,
        );
    }

    if (input.dueAt <= new Date()) {
        throw BadRequestError('Snooze target date must be in the future');
    }

    const snoozed = await prisma.followUp.update({
        where: { id: followUpId },
        data: {
            status: FollowUpStatus.PENDING,
            dueAt: input.dueAt,
            notes: input.notes ?? undefined,
        },
    });

    await appendActivity(
        existing.leadId,
        actor.id,
        ActivityType.NOTE,
        'Follow-up snoozed',
        {
            followUpId,
            previousDueAt: existing.dueAt.toISOString(),
            newDueAt: input.dueAt.toISOString(),
        },
    );

    logger.info(
        { actorId: actor.id, followUpId, newDueAt: input.dueAt },
        'follow-up snoozed',
    );

    return computeOverdue(toSafeFollowUp(snoozed));
};

// --------------------------------------------------
// Cancel
// --------------------------------------------------

export const cancelFollowUp = async (
    actor: ScopeUser,
    followUpId: string,
    input: CancelFollowUpInput,
): Promise<SafeFollowUp> => {
    const existing = await loadFollowUpForActor(actor, followUpId);

    if (
        existing.status === FollowUpStatus.COMPLETED ||
        existing.status === FollowUpStatus.CANCELLED
    ) {
        throw BadRequestError(
            `Cannot cancel a follow-up in ${existing.status} state`,
        );
    }

    const cancelled = await prisma.followUp.update({
        where: { id: followUpId },
        data: {
            status: FollowUpStatus.CANCELLED,
            notes: input.reason ?? undefined,
        },
    });

    await appendActivity(
        existing.leadId,
        actor.id,
        ActivityType.NOTE,
        'Follow-up cancelled',
        { followUpId, reason: input.reason ?? null },
    );

    logger.info({ actorId: actor.id, followUpId }, 'follow-up cancelled');

    return computeOverdue(toSafeFollowUp(cancelled));
};

// --------------------------------------------------
// Nested list — follow-ups for a specific lead
// --------------------------------------------------

export const listFollowUpsForLead = async (
    actor: ScopeUser,
    leadId: string,
    query: ListLeadFollowUpsQuery,
): Promise<ListFollowUpsResult> => {
    // Verify lead access
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, partnerId: true },
    });
    if (!lead) throw NotFoundError('Lead not found');

    if (actor.role !== 'SUPER_ADMIN') {
        if (!actor.partnerId || actor.partnerId !== lead.partnerId) {
            throw ForbiddenError('Not allowed to access this lead');
        }
    }

    const where: Record<string, unknown> = { leadId };
    if (actor.role === 'COUNSELOR' || actor.role === 'SUPPORT') {
        where.assignedTo = actor.id;
    }
    if (query.status) where.status = query.status;

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.followUp.count({ where }),
        prisma.followUp.findMany({
            where,
            orderBy: { dueAt: 'asc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map((r) => computeOverdue(toSafeFollowUp(r))),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
};