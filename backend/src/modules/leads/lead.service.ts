/**
 * lead.service.ts - Lead management business logic.
 *
 * Responsibilities:
 *   - CRUD with tenant + assignment scoping
 *   - Duplicate detection (phone exact → hard reject; email match → soft flag)
 *   - Status state machine (enforced)
 *   - Assignment to COUNSELOR users only, same partner
 *   - Timeline (LeadActivity) appended on every meaningful change
 *   - Archive (soft delete)
 *
 * Enforces:
 *   - Tenant isolation: partner_admin sees own org; counselor sees assigned only
 *   - Cross-tenant attempts fail with 403
 *   - Cannot skip statuses (e.g. NEW → ADMITTED)
 *   - Cannot assign to a user outside the partner
 *   - Cannot assign to a non-COUNSELOR
 */

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
} from '../../shared/errors/AppError.js';
import {
    buildAssignmentScope,
    buildTenantScope,
    type ScopeUser,
} from '../../shared/utils/scope.js';
import {
    ActivityType,
    LeadPriority,
    LeadStatus,
    RoleName,
    Prisma,
} from '@prisma/client';
import type {
    ArchiveLeadInput,
    AssignLeadInput,
    ChangeLeadStatusInput,
    CreateLeadInput,
    ListActivitiesQuery,
    ListLeadsQuery,
    UpdateLeadInput,
} from './lead.schema.js';

// --------------------------------------------------
// Public shape
// --------------------------------------------------

export interface SafeLead {
    id: string;
    partnerId: string;
    assignedTo: string | null;
    createdBy: string | null;
    courseId: string | null;
    name: string;
    phone: string;
    whatsapp: string | null;
    email: string | null;
    city: string | null;
    source: string | null;
    budget: number | null;
    priority: string;
    status: string;
    score: number;
    followUpDate: Date | null;
    notes: string | null;
    closedReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
    duplicateFlag?: boolean;
}

export interface SafeActivity {
    id: string;
    leadId: string;
    userId: string | null;
    type: string;
    description: string;
    metadata: unknown;
    createdAt: Date;
}

// --------------------------------------------------
// Status state machine
// --------------------------------------------------

const VALID_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
    [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.LOST],
    [LeadStatus.CONTACTED]: [LeadStatus.FOLLOW_UP, LeadStatus.LOST],
    [LeadStatus.FOLLOW_UP]: [
        LeadStatus.DEMO_BOOKED,
        LeadStatus.FEE_DISCUSSION,
        LeadStatus.LOST,
    ],
    [LeadStatus.DEMO_BOOKED]: [LeadStatus.DEMO_COMPLETED, LeadStatus.LOST],
    [LeadStatus.DEMO_COMPLETED]: [LeadStatus.FEE_DISCUSSION, LeadStatus.LOST],
    [LeadStatus.FEE_DISCUSSION]: [LeadStatus.ADMISSION_PENDING, LeadStatus.LOST],
    [LeadStatus.ADMISSION_PENDING]: [LeadStatus.ADMITTED, LeadStatus.LOST],
    [LeadStatus.ADMITTED]: [], // terminal
    [LeadStatus.LOST]: [], // terminal
};

const assertValidStatusTransition = (
    from: LeadStatus,
    to: LeadStatus,
): void => {
    const allowed = VALID_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
        throw BadRequestError(`Invalid status transition: ${from} → ${to}`);
    }
};

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const toSafeLead = (lead: {
    id: string;
    partnerId: string;
    assignedTo: string | null;
    createdBy: string | null;
    courseId: string | null;
    name: string;
    phone: string;
    whatsapp: string | null;
    email: string | null;
    city: string | null;
    source: string | null;
    budget: unknown;
    priority: LeadPriority;
    status: LeadStatus;
    score: number;
    followUpDate: Date | null;
    notes: string | null;
    closedReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
}): SafeLead => ({
    id: lead.id,
    partnerId: lead.partnerId,
    assignedTo: lead.assignedTo,
    createdBy: lead.createdBy,
    courseId: lead.courseId,
    name: lead.name,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    email: lead.email,
    city: lead.city,
    source: lead.source,
    budget: lead.budget === null ? null : Number(lead.budget),
    priority: lead.priority,
    status: lead.status,
    score: lead.score,
    followUpDate: lead.followUpDate,
    notes: lead.notes,
    closedReason: lead.closedReason,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    archivedAt: lead.archivedAt,
});

const toSafeActivity = (activity: {
    id: string;
    leadId: string;
    userId: string | null;
    type: ActivityType;
    description: string;
    metadata: unknown;
    createdAt: Date;
}): SafeActivity => ({
    id: activity.id,
    leadId: activity.leadId,
    userId: activity.userId,
    type: activity.type,
    description: activity.description,
    metadata: activity.metadata,
    createdAt: activity.createdAt,
});

/**
 * Appends a LeadActivity row. Internal helper — errors do not block the
 * primary operation (fire-and-forget style with error logging).
 */
const appendActivity = async (
    leadId: string,
    userId: string | null,
    type: ActivityType,
    description: string,
    metadata?: Prisma.InputJsonValue,
): Promise<void> => {
    try {
        await prisma.leadActivity.create({
            data: {
                leadId,
                userId,
                type,
                description,
                metadata: metadata ?? Prisma.JsonNull,
            },
        });
    } catch (err) {
        logger.warn({ err, leadId, type }, 'failed to append lead activity');
    }
};

// --------------------------------------------------
// Access helpers
// --------------------------------------------------

/**
 * Loads a lead and asserts the actor can access it.
 * super_admin: any lead
 * partner_admin: same partner
 * counselor: same partner AND assigned to them
 * support: same partner (read-only downstream)
 */
const loadLeadForActor = async (
    actor: ScopeUser,
    leadId: string,
): Promise<{
    id: string;
    partnerId: string;
    assignedTo: string | null;
    status: LeadStatus;
}> => {
    const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
            id: true,
            partnerId: true,
            assignedTo: true,
            status: true,
        },
    });

    if (!lead) throw NotFoundError('Lead not found');

    if (actor.role === 'SUPER_ADMIN') return lead;

    if (!actor.partnerId || actor.partnerId !== lead.partnerId) {
        throw ForbiddenError('Not allowed to access this lead');
    }

    // Counselor: must be assigned
    if (actor.role === 'COUNSELOR' && lead.assignedTo !== actor.id) {
        throw ForbiddenError('Lead is not assigned to you');
    }

    return lead;
};

/**
 * Resolves the target partner for a create operation.
 */
const resolveTargetPartner = (actor: ScopeUser): string => {
    if (actor.role === 'SUPER_ADMIN') {
        throw BadRequestError(
            'super_admin cannot create leads directly — must specify a partner context',
        );
    }
    if (!actor.partnerId) {
        throw ForbiddenError('User is not associated with any partner');
    }
    return actor.partnerId;
};

// --------------------------------------------------
// Duplicate detection
// --------------------------------------------------

/**
 * Scoped to the same partner. Returns a duplicate lead if the phone
 * matches exactly (digits-only comparison). Email match is a soft flag.
 */
const findPotentialDuplicate = async (
    partnerId: string,
    phone: string,
    email: string | null | undefined,
): Promise<{ hard: boolean; leadId: string } | null> => {
    // Hard: exact phone match within partner
    const byPhone = await prisma.lead.findFirst({
        where: {
            partnerId,
            phone,
        },
        select: { id: true },
    });
    if (byPhone) {
        return { hard: true, leadId: byPhone.id };
    }

    // Soft: email match within partner
    if (email) {
        const byEmail = await prisma.lead.findFirst({
            where: { partnerId, email },
            select: { id: true },
        });
        if (byEmail) {
            return { hard: false, leadId: byEmail.id };
        }
    }

    return null;
};

// --------------------------------------------------
// List
// --------------------------------------------------

export interface ListLeadsResult {
    data: SafeLead[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listLeads = async (
    actor: ScopeUser,
    query: ListLeadsQuery,
): Promise<ListLeadsResult> => {
    // Build scope: super_admin sees all; partner_admin sees own org;
    // counselor sees assigned only.
    const scope =
        actor.role === 'COUNSELOR' || actor.role === 'SUPPORT'
            ? buildAssignmentScope(actor)
            : buildTenantScope(actor);

    const where: Record<string, unknown> = { ...scope };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assignedTo) where.assignedTo = query.assignedTo;
    if (query.courseId) where.courseId = query.courseId;

    // Archived filter: default to hiding archived
    const wantArchived = query.archived === true;
    where.archivedAt = wantArchived ? { not: null } : null;

    if (query.search) {
        where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
            { email: { contains: query.search, mode: 'insensitive' } },
        ];
    }

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.lead.count({ where }),
        prisma.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(toSafeLead),
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

export const getLeadById = async (
    actor: ScopeUser,
    leadId: string,
): Promise<SafeLead> => {
    await loadLeadForActor(actor, leadId);

    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

    return toSafeLead(lead);
};

// --------------------------------------------------
// Create
// --------------------------------------------------

export interface CreateLeadResult {
    lead: SafeLead;
    duplicateFlag: boolean;
    duplicateOf?: string;
}

export const createLead = async (
    actor: ScopeUser,
    input: CreateLeadInput,
): Promise<CreateLeadResult> => {
    const partnerId = resolveTargetPartner(actor);

    // Duplicate check
    const dup = await findPotentialDuplicate(partnerId, input.phone, input.email);
    if (dup && dup.hard) {
        throw ConflictError(
            `Duplicate lead: a lead with this phone already exists (id: ${dup.leadId})`,
        );
    }

    // Validate assignee if provided
    if (input.assignedTo) {
        const assignee = await prisma.user.findUnique({
            where: { id: input.assignedTo },
            select: { id: true, partnerId: true, role: { select: { name: true } } },
        });

        if (!assignee) throw BadRequestError('Assignee not found');
        if (assignee.partnerId !== partnerId) {
            throw ForbiddenError('Assignee belongs to a different partner');
        }
        if (assignee.role.name !== RoleName.COUNSELOR) {
            throw BadRequestError('Leads can only be assigned to COUNSELOR users');
        }
    }

    // Validate course if provided
    if (input.courseId) {
        const course = await prisma.course.findUnique({
            where: { id: input.courseId },
            select: { id: true },
        });
        if (!course) throw BadRequestError('Course not found');
    }

    const lead = await prisma.lead.create({
        data: {
            partnerId,
            createdBy: actor.id,
            assignedTo: input.assignedTo ?? null,
            courseId: input.courseId ?? null,
            name: input.name,
            phone: input.phone,
            whatsapp: input.whatsapp ?? null,
            email: input.email ?? null,
            city: input.city ?? null,
            source: input.source ?? null,
            budget: input.budget ?? null,
            priority: input.priority ?? LeadPriority.MEDIUM,
            status: LeadStatus.NEW,
            followUpDate: input.followUpDate ?? null,
            notes: input.notes ?? null,
        },
    });

    await appendActivity(lead.id, actor.id, ActivityType.CREATED, 'Lead created', {
        assignedTo: input.assignedTo ?? null,
    });

    if (input.assignedTo) {
        await appendActivity(
            lead.id,
            actor.id,
            ActivityType.ASSIGNED,
            'Lead assigned on creation',
            { assignedTo: input.assignedTo },
        );
    }

    logger.info(
        { actorId: actor.id, leadId: lead.id, partnerId },
        'lead created',
    );

    const result: CreateLeadResult = {
        lead: toSafeLead(lead),
        duplicateFlag: dup ? !dup.hard : false,
    };

    if (dup && !dup.hard) {
        result.duplicateOf = dup.leadId;
    }

    return result;
};

// --------------------------------------------------
// Update
// --------------------------------------------------

export const updateLead = async (
    actor: ScopeUser,
    leadId: string,
    input: UpdateLeadInput,
): Promise<SafeLead> => {
    await loadLeadForActor(actor, leadId);

    if (input.courseId) {
        const course = await prisma.course.findUnique({
            where: { id: input.courseId },
            select: { id: true },
        });
        if (!course) throw BadRequestError('Course not found');
    }

    const updated = await prisma.lead.update({
        where: { id: leadId },
        data: {
            name: input.name ?? undefined,
            phone: input.phone ?? undefined,
            whatsapp: input.whatsapp ?? undefined,
            email: input.email ?? undefined,
            city: input.city ?? undefined,
            courseId: input.courseId ?? undefined,
            source: input.source ?? undefined,
            budget: input.budget ?? undefined,
            priority: input.priority ?? undefined,
            notes: input.notes ?? undefined,
            followUpDate: input.followUpDate ?? undefined,
        },
    });

    await appendActivity(
        leadId,
        actor.id,
        ActivityType.NOTE,
        'Lead updated',
        { fields: Object.keys(input) },
    );

    logger.info({ actorId: actor.id, leadId }, 'lead updated');

    return toSafeLead(updated);
};

// --------------------------------------------------
// Assign
// --------------------------------------------------

export const assignLead = async (
    actor: ScopeUser,
    leadId: string,
    input: AssignLeadInput,
): Promise<SafeLead> => {
    const lead = await loadLeadForActor(actor, leadId);

    // Only partner_admin or super_admin can assign
    if (actor.role === 'COUNSELOR' || actor.role === 'SUPPORT') {
        throw ForbiddenError('Only PARTNER_ADMIN or SUPER_ADMIN can assign leads');
    }

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
            throw BadRequestError('Leads can only be assigned to COUNSELOR users');
        }
    }

    const updated = await prisma.lead.update({
        where: { id: leadId },
        data: { assignedTo: input.assignedTo },
    });

    await appendActivity(
        leadId,
        actor.id,
        ActivityType.ASSIGNED,
        input.assignedTo ? 'Lead reassigned' : 'Lead unassigned',
        { assignedTo: input.assignedTo },
    );

    logger.info(
        { actorId: actor.id, leadId, assignedTo: input.assignedTo },
        'lead assignment changed',
    );

    return toSafeLead(updated);
};

// --------------------------------------------------
// Status change
// --------------------------------------------------

export const changeLeadStatus = async (
    actor: ScopeUser,
    leadId: string,
    input: ChangeLeadStatusInput,
): Promise<SafeLead> => {
    const lead = await loadLeadForActor(actor, leadId);

    assertValidStatusTransition(lead.status, input.status);

    const updated = await prisma.lead.update({
        where: { id: leadId },
        data: { status: input.status },
    });

    await appendActivity(
        leadId,
        actor.id,
        ActivityType.STATUS_CHANGED,
        `Status changed to ${input.status}`,
        { from: lead.status, to: input.status, note: input.note ?? null },
    );

    logger.info(
        { actorId: actor.id, leadId, from: lead.status, to: input.status },
        'lead status changed',
    );

    return toSafeLead(updated);
};

// --------------------------------------------------
// Archive
// --------------------------------------------------

export const archiveLead = async (
    actor: ScopeUser,
    leadId: string,
    input: ArchiveLeadInput,
): Promise<SafeLead> => {
    await loadLeadForActor(actor, leadId);

    const updated = await prisma.lead.update({
        where: { id: leadId },
        data: {
            archivedAt: new Date(),
            closedReason: input.reason ?? null,
        },
    });

    await appendActivity(
        leadId,
        actor.id,
        ActivityType.NOTE,
        'Lead archived',
        { reason: input.reason ?? null },
    );

    logger.info({ actorId: actor.id, leadId }, 'lead archived');

    return toSafeLead(updated);
};

// --------------------------------------------------
// Activities timeline
// --------------------------------------------------

export interface ListActivitiesResult {
    data: SafeActivity[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listLeadActivities = async (
    actor: ScopeUser,
    leadId: string,
    query: ListActivitiesQuery,
): Promise<ListActivitiesResult> => {
    await loadLeadForActor(actor, leadId);

    const where: Record<string, unknown> = { leadId };
    if (query.type) where.type = query.type;

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.leadActivity.count({ where }),
        prisma.leadActivity.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(toSafeActivity),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
};