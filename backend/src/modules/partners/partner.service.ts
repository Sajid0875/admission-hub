/**
 * partner.service.ts - Partner management business logic.
 *
 * Responsibilities:
 *   - List partners (super_admin only; paginated, filterable)
 *   - Get a partner by id (scoped: super_admin sees any, others own only)
 *   - Create a partner (super_admin only; starts as PENDING)
 *   - Update partner profile (super_admin only)
 *   - Change partner status (super_admin only, with valid transitions)
 *
 * Enforces:
 *   - Tenant isolation (partner_admin sees own only)
 *   - Email uniqueness (DB constraint + friendly 409)
 *   - Valid status transitions
 *   - PENDING partners cannot be accessed by partner_admin until ACTIVE
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
import { AuditAction, logAction } from '../../shared/utils/audit.js';
import { NotificationType, notify } from '../../shared/utils/notify.js';
import {
    PartnerStatus,
    CommissionType,
} from '@prisma/client';
import type {
    ChangePartnerStatusInput,
    CreatePartnerInput,
    ListPartnersQuery,
    UpdatePartnerInput,
} from './partner.schema.js';

// --------------------------------------------------
// Public shape (kept aligned with what the DB returns)
// --------------------------------------------------

export interface SafePartner {
    id: string;
    academyName: string;
    partnerName: string;
    ownerName: string;
    email: string;
    mobile: string;
    address: string | null;
    logoUrl: string | null;
    commissionType: string;
    status: string;
    joiningDate: Date;
    approvedAt: Date | null;
    approvedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// --------------------------------------------------
// Type-safe mapper
// --------------------------------------------------

const toSafePartner = (partner: {
    id: string;
    academyName: string;
    partnerName: string;
    ownerName: string;
    email: string;
    mobile: string;
    address: string | null;
    logoUrl: string | null;
    commissionType: CommissionType;
    status: PartnerStatus;
    joiningDate: Date;
    approvedAt: Date | null;
    approvedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
}): SafePartner => ({
    id: partner.id,
    academyName: partner.academyName,
    partnerName: partner.partnerName,
    ownerName: partner.ownerName,
    email: partner.email,
    mobile: partner.mobile,
    address: partner.address,
    logoUrl: partner.logoUrl,
    commissionType: partner.commissionType,
    status: partner.status,
    joiningDate: partner.joiningDate,
    approvedAt: partner.approvedAt,
    approvedBy: partner.approvedBy,
    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
});

// --------------------------------------------------
// Permission helper
// --------------------------------------------------

const assertSuperAdmin = (actor: ScopeUser): void => {
    if (actor.role !== 'SUPER_ADMIN') {
        throw ForbiddenError('Only SUPER_ADMIN can perform this action');
    }
};

// --------------------------------------------------
// Valid status transitions
// --------------------------------------------------

const VALID_TRANSITIONS: Record<PartnerStatus, PartnerStatus[]> = {
    [PartnerStatus.PENDING]: [PartnerStatus.ACTIVE, PartnerStatus.REJECTED],
    [PartnerStatus.ACTIVE]: [PartnerStatus.SUSPENDED],
    [PartnerStatus.SUSPENDED]: [PartnerStatus.ACTIVE],
    [PartnerStatus.REJECTED]: [],
};

const assertValidTransition = (
    from: PartnerStatus,
    to: PartnerStatus,
): void => {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
        throw BadRequestError(
            `Invalid status transition: ${from} → ${to}`,
        );
    }
};

// --------------------------------------------------
// List
// --------------------------------------------------

export interface ListPartnersResult {
    data: SafePartner[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listPartners = async (
    actor: ScopeUser,
    query: ListPartnersQuery,
): Promise<ListPartnersResult> => {
    assertSuperAdmin(actor);

    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.commissionType) where.commissionType = query.commissionType;

    if (query.search) {
        where.OR = [
            { academyName: { contains: query.search, mode: 'insensitive' } },
            { partnerName: { contains: query.search, mode: 'insensitive' } },
            { ownerName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
        ];
    }

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.partner.count({ where }),
        prisma.partner.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(toSafePartner),
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

export const getPartnerById = async (
    actor: ScopeUser,
    partnerId: string,
): Promise<SafePartner> => {
    const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
    });

    if (!partner) throw NotFoundError('Partner not found');

    // super_admin sees any; other roles only see their own partner
    if (actor.role !== 'SUPER_ADMIN') {
        if (!actor.partnerId || actor.partnerId !== partner.id) {
            throw ForbiddenError('Not allowed to access this partner');
        }
        // Partner admins cannot see themselves while not ACTIVE
        if (partner.status !== PartnerStatus.ACTIVE) {
            throw ForbiddenError('Partner is not active');
        }
    }

    return toSafePartner(partner);
};

// --------------------------------------------------
// Create
// --------------------------------------------------

export const createPartner = async (
    actor: ScopeUser,
    input: CreatePartnerInput,
): Promise<SafePartner> => {
    assertSuperAdmin(actor);

    // Email uniqueness check (friendly error before DB constraint fires)
    const existing = await prisma.partner.findUnique({
        where: { email: input.email },
        select: { id: true },
    });
    if (existing) {
        throw ConflictError('A partner with this email already exists');
    }

    const created = await prisma.partner.create({
        data: {
            academyName: input.academyName,
            partnerName: input.partnerName,
            ownerName: input.ownerName,
            email: input.email,
            mobile: input.mobile,
            address: input.address ?? null,
            logoUrl: input.logoUrl ?? null,
            commissionType: input.commissionType ?? CommissionType.PERCENTAGE,
            status: PartnerStatus.PENDING,
        },
    });

    logger.info(
        { actorId: actor.id, partnerId: created.id },
        'partner created (pending approval)',
    );

    void logAction({
        actorId: actor.id,
        partnerId: created.id,
        action: AuditAction.PARTNER_CREATED,
        entityType: 'partner',
        entityId: created.id,
        newValue: { status: created.status, email: created.email },
    });

    return toSafePartner(created);
};

// --------------------------------------------------
// Update (profile fields only)
// --------------------------------------------------

export const updatePartner = async (
    actor: ScopeUser,
    partnerId: string,
    input: UpdatePartnerInput,
): Promise<SafePartner> => {
    assertSuperAdmin(actor);

    const existing = await prisma.partner.findUnique({
        where: { id: partnerId },
        select: { id: true },
    });
    if (!existing) throw NotFoundError('Partner not found');

    const updated = await prisma.partner.update({
        where: { id: partnerId },
        data: {
            academyName: input.academyName ?? undefined,
            partnerName: input.partnerName ?? undefined,
            ownerName: input.ownerName ?? undefined,
            mobile: input.mobile ?? undefined,
            address: input.address ?? undefined,
            logoUrl: input.logoUrl ?? undefined,
            commissionType: input.commissionType ?? undefined,
        },
    });

    logger.info({ actorId: actor.id, partnerId }, 'partner updated');

    return toSafePartner(updated);
};

// --------------------------------------------------
// Change status
// --------------------------------------------------

export const changePartnerStatus = async (
    actor: ScopeUser,
    partnerId: string,
    input: ChangePartnerStatusInput,
): Promise<SafePartner> => {
    assertSuperAdmin(actor);

    const existing = await prisma.partner.findUnique({
        where: { id: partnerId },
        select: { id: true, status: true },
    });
    if (!existing) throw NotFoundError('Partner not found');

    assertValidTransition(existing.status, input.status);

    // Stamp approval metadata when approving
    const approvingNow =
        input.status === PartnerStatus.ACTIVE &&
        existing.status === PartnerStatus.PENDING;

    const updated = await prisma.partner.update({
        where: { id: partnerId },
        data: {
            status: input.status,
            approvedAt: approvingNow ? new Date() : undefined,
            approvedBy: approvingNow ? actor.id : undefined,
        },
    });

    logger.info(
        {
            actorId: actor.id,
            partnerId,
            from: existing.status,
            to: input.status,
        },
        'partner status changed',
    );

    const statusAction =
        input.status === PartnerStatus.ACTIVE
            ? AuditAction.PARTNER_APPROVED
            : input.status === PartnerStatus.SUSPENDED
              ? AuditAction.PARTNER_SUSPENDED
              : input.status === PartnerStatus.REJECTED
                ? AuditAction.PARTNER_REJECTED
                : AuditAction.PARTNER_UPDATED;

    void logAction({
        actorId: actor.id,
        partnerId,
        action: statusAction,
        entityType: 'partner',
        entityId: partnerId,
        oldValue: { status: existing.status },
        newValue: { status: input.status },
    });

    // Notify partner admins when approved
    if (approvingNow) {
        void (async () => {
            const admins = await prisma.user.findMany({
                where: {
                    partnerId,
                    status: 'ACTIVE',
                    role: { name: 'PARTNER_ADMIN' },
                },
                select: { id: true },
            });
            for (const admin of admins) {
                void notify({
                    userId: admin.id,
                    partnerId,
                    type: NotificationType.PARTNER_APPROVED,
                    title: 'Partner approved',
                    message: 'Your partner workspace is now active.',
                    referenceType: 'partner',
                    referenceId: partnerId,
                });
            }
        })();
    }

    return toSafePartner(updated);
};