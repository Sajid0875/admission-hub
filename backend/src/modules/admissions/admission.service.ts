/**
 * admission.service.ts - Admission + payment business logic.
 *
 * Responsibilities:
 *   - Create admission from a lead (transactional: create + flip lead + activity)
 *   - Verify / reject admission (generates commission)
 *   - Cancel admission
 *   - Record payments (append-only, never overwrite history)
 *   - Refund payments (super_admin only)
 *   - Derive payment status from sum of payments
 *   - Tenant + assignment scoping
 *
 * Enforces:
 *   - One admission per lead
 *   - Lead must be non-terminal and non-archived
 *   - Payment cannot exceed remaining balance
 *   - Cross-tenant access blocked
 *   - Payment status is derived, never trusted from client
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
import {
    ActivityType,
    LeadStatus,
    PaymentStatus,
    VerificationStatus,
} from '@prisma/client';
import type {
    CancelAdmissionInput,
    CreateAdmissionInput,
    ListAdmissionsQuery,
    ListPaymentsQuery,
    RecordPaymentInput,
    RefundPaymentInput,
    UpdateAdmissionInput,
    VerifyAdmissionInput,
} from './admission.schema.js';

// --------------------------------------------------
// Public shapes
// --------------------------------------------------

export interface SafeAdmission {
    id: string;
    leadId: string;
    partnerId: string;
    courseId: string;
    createdBy: string | null;
    studentName: string;
    fee: number;
    amountPaid: number;
    paymentStatus: string;
    paymentMode: string | null;
    joiningDate: Date;
    remarks: string | null;
    verificationStatus: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SafePayment {
    id: string;
    admissionId: string;
    createdBy: string | null;
    amount: number;
    paymentMode: string;
    transactionReference: string | null;
    paymentDate: Date;
    status: string;
    createdAt: Date;
}

// --------------------------------------------------
// Mappers
// --------------------------------------------------

const toSafeAdmission = (
    row: {
        id: string;
        leadId: string;
        partnerId: string;
        courseId: string;
        createdBy: string | null;
        studentName: string;
        fee: unknown;
        paymentStatus: PaymentStatus;
        paymentMode: string | null;
        joiningDate: Date;
        remarks: string | null;
        verificationStatus: VerificationStatus;
        createdAt: Date;
        updatedAt: Date;
    },
    amountPaid: number,
): SafeAdmission => ({
    id: row.id,
    leadId: row.leadId,
    partnerId: row.partnerId,
    courseId: row.courseId,
    createdBy: row.createdBy,
    studentName: row.studentName,
    fee: Number(row.fee),
    amountPaid,
    paymentStatus: row.paymentStatus,
    paymentMode: row.paymentMode,
    joiningDate: row.joiningDate,
    remarks: row.remarks,
    verificationStatus: row.verificationStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

const toSafePayment = (row: {
    id: string;
    admissionId: string;
    createdBy: string | null;
    amount: unknown;
    paymentMode: string;
    transactionReference: string | null;
    paymentDate: Date;
    status: PaymentStatus;
    createdAt: Date;
}): SafePayment => ({
    id: row.id,
    admissionId: row.admissionId,
    createdBy: row.createdBy,
    amount: Number(row.amount),
    paymentMode: row.paymentMode,
    transactionReference: row.transactionReference,
    paymentDate: row.paymentDate,
    status: row.status,
    createdAt: row.createdAt,
});

// --------------------------------------------------
// Payment status derivation
// --------------------------------------------------

const PAID_STATUSES: PaymentStatus[] = [PaymentStatus.PAID];

/**
 * Computes the payment status of an admission from its payments.
 * This is authoritative — never trust client-supplied status.
 */
const computePaymentStatus = (
    totalFee: number,
    payments: Array<{ amount: unknown; status: PaymentStatus }>,
): { amountPaid: number; paymentStatus: PaymentStatus } => {
    const amountPaid = payments
        .filter((p) => PAID_STATUSES.includes(p.status))
        .reduce((sum, p) => sum + Number(p.amount), 0);

    let paymentStatus: PaymentStatus;
    if (amountPaid <= 0) {
        paymentStatus = PaymentStatus.UNPAID;
    } else if (amountPaid >= totalFee) {
        paymentStatus = PaymentStatus.PAID;
    } else {
        paymentStatus = PaymentStatus.PARTIAL;
    }

    return { amountPaid, paymentStatus };
};

const refreshAdmissionPaymentStatus = async (
    admissionId: string,
): Promise<void> => {
    const admission = await prisma.admission.findUniqueOrThrow({
        where: { id: admissionId },
        select: { id: true, fee: true },
    });
    const payments = await prisma.payment.findMany({
        where: { admissionId },
        select: { amount: true, status: true },
    });

    const { paymentStatus } = computePaymentStatus(
        Number(admission.fee),
        payments,
    );

    await prisma.admission.update({
        where: { id: admissionId },
        data: { paymentStatus },
    });
};

// --------------------------------------------------
// Access helpers
// --------------------------------------------------

const loadAdmissionForActor = async (
    actor: ScopeUser,
    admissionId: string,
): Promise<{
    id: string;
    leadId: string;
    partnerId: string;
    verificationStatus: VerificationStatus;
}> => {
    const row = await prisma.admission.findUnique({
        where: { id: admissionId },
        select: {
            id: true,
            leadId: true,
            partnerId: true,
            verificationStatus: true,
        },
    });

    if (!row) throw NotFoundError('Admission not found');

    if (actor.role !== 'SUPER_ADMIN') {
        if (!actor.partnerId || actor.partnerId !== row.partnerId) {
            throw ForbiddenError('Not allowed to access this admission');
        }
    }

    return row;
};

// --------------------------------------------------
// List admissions
// --------------------------------------------------

export interface ListAdmissionsResult {
    data: SafeAdmission[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listAdmissions = async (
    actor: ScopeUser,
    query: ListAdmissionsQuery,
): Promise<ListAdmissionsResult> => {
    const where: Record<string, unknown> = {};

    if (actor.role !== 'SUPER_ADMIN') {
        if (!actor.partnerId) {
            throw ForbiddenError('User is not associated with any partner');
        }
        where.partnerId = actor.partnerId;
    }

    if (query.leadId) where.leadId = query.leadId;
    if (query.courseId) where.courseId = query.courseId;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;
    if (query.createdBy) where.createdBy = query.createdBy;

    if (query.from || query.to) {
        const range: Record<string, Date> = {};
        if (query.from) range.gte = query.from;
        if (query.to) range.lte = query.to;
        where.createdAt = range;
    }

    if (query.search) {
        where.studentName = { contains: query.search, mode: 'insensitive' };
    }

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.admission.count({ where }),
        prisma.admission.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    // Compute amountPaid per row (N+1 but scoped by limit ≤ 100, acceptable)
    const data = await Promise.all(
        rows.map(async (row) => {
            const payments = await prisma.payment.findMany({
                where: { admissionId: row.id },
                select: { amount: true, status: true },
            });
            const { amountPaid } = computePaymentStatus(Number(row.fee), payments);
            return toSafeAdmission(row, amountPaid);
        }),
    );

    return {
        data,
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
};

// --------------------------------------------------
// Get admission
// --------------------------------------------------

export const getAdmissionById = async (
    actor: ScopeUser,
    admissionId: string,
): Promise<SafeAdmission> => {
    await loadAdmissionForActor(actor, admissionId);

    const row = await prisma.admission.findUniqueOrThrow({
        where: { id: admissionId },
    });
    const payments = await prisma.payment.findMany({
        where: { admissionId },
        select: { amount: true, status: true },
    });
    const { amountPaid } = computePaymentStatus(Number(row.fee), payments);

    return toSafeAdmission(row, amountPaid);
};

// --------------------------------------------------
// Create admission
// --------------------------------------------------

export const createAdmission = async (
    actor: ScopeUser,
    input: CreateAdmissionInput,
): Promise<SafeAdmission> => {
    // Load lead
    const lead = await prisma.lead.findUnique({
        where: { id: input.leadId },
        select: {
            id: true,
            name: true,
            partnerId: true,
            status: true,
            archivedAt: true,
        },
    });

    if (!lead) throw NotFoundError('Lead not found');

    // Tenant
    if (actor.role !== 'SUPER_ADMIN') {
        if (!actor.partnerId || actor.partnerId !== lead.partnerId) {
            throw ForbiddenError('Not allowed to admit this lead');
        }
    } else {
        // Even super_admin needs a partner context via the lead
        if (!lead.partnerId) {
            throw BadRequestError('Lead has no partner');
        }
    }

    // Lead status guards
    if (lead.archivedAt) {
        throw BadRequestError('Cannot admit an archived lead');
    }
    if (lead.status === LeadStatus.ADMITTED) {
        throw ConflictError('Lead is already admitted');
    }
    if (lead.status === LeadStatus.LOST) {
        throw BadRequestError('Cannot admit a LOST lead');
    }

    // One admission per lead
    const existing = await prisma.admission.findFirst({
        where: { leadId: lead.id },
        select: { id: true },
    });
    if (existing) {
        throw ConflictError('An admission already exists for this lead');
    }

    // Course
    const course = await prisma.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, title: true },
    });
    if (!course) throw BadRequestError('Course not found');

    // Transaction: create admission + flip lead + append activity
    const created = await prisma.$transaction(async (tx) => {
        const admission = await tx.admission.create({
            data: {
                leadId: lead.id,
                partnerId: lead.partnerId,
                courseId: course.id,
                createdBy: actor.id,
                studentName: input.studentName ?? lead.name,
                fee: input.fee,
                paymentMode: input.paymentMode ?? null,
                joiningDate: input.joiningDate ?? new Date(),
                remarks: input.remarks ?? null,
                verificationStatus: VerificationStatus.PENDING,
                paymentStatus: PaymentStatus.UNPAID,
            },
        });

        await tx.lead.update({
            where: { id: lead.id },
            data: { status: LeadStatus.ADMITTED },
        });

        await tx.leadActivity.create({
            data: {
                leadId: lead.id,
                userId: actor.id,
                type: ActivityType.ADMISSION_CREATED,
                description: `Admission created for course "${course.title}"`,
                metadata: {
                    admissionId: admission.id,
                    courseId: course.id,
                    fee: input.fee,
                } as never,
            },
        });

        return admission;
    });

    logger.info(
        { actorId: actor.id, admissionId: created.id, leadId: lead.id },
        'admission created',
    );

    return toSafeAdmission(created, 0);
};

// --------------------------------------------------
// Update admission (profile fields only)
// --------------------------------------------------

export const updateAdmission = async (
    actor: ScopeUser,
    admissionId: string,
    input: UpdateAdmissionInput,
): Promise<SafeAdmission> => {
    const existing = await loadAdmissionForActor(actor, admissionId);

    if (existing.verificationStatus === VerificationStatus.VERIFIED) {
        throw BadRequestError('Cannot edit a VERIFIED admission');
    }

    const updated = await prisma.admission.update({
        where: { id: admissionId },
        data: {
            studentName: input.studentName ?? undefined,
            fee: input.fee ?? undefined,
            paymentMode: input.paymentMode ?? undefined,
            joiningDate: input.joiningDate ?? undefined,
            remarks: input.remarks ?? undefined,
        },
    });

    // If fee changed, recompute payment status
    if (input.fee !== undefined) {
        await refreshAdmissionPaymentStatus(admissionId);
        const refreshed = await prisma.admission.findUniqueOrThrow({
            where: { id: admissionId },
        });
        const payments = await prisma.payment.findMany({
            where: { admissionId },
            select: { amount: true, status: true },
        });
        const { amountPaid } = computePaymentStatus(
            Number(refreshed.fee),
            payments,
        );
        logger.info({ actorId: actor.id, admissionId }, 'admission updated (fee changed)');
        return toSafeAdmission(refreshed, amountPaid);
    }

    const payments = await prisma.payment.findMany({
        where: { admissionId },
        select: { amount: true, status: true },
    });
    const { amountPaid } = computePaymentStatus(Number(updated.fee), payments);

    logger.info({ actorId: actor.id, admissionId }, 'admission updated');
    return toSafeAdmission(updated, amountPaid);
};

// --------------------------------------------------
// Verify admission
// --------------------------------------------------

export const verifyAdmission = async (
    actor: ScopeUser,
    admissionId: string,
    input: VerifyAdmissionInput,
): Promise<SafeAdmission> => {
    const existing = await loadAdmissionForActor(actor, admissionId);

    if (existing.verificationStatus !== VerificationStatus.PENDING) {
        throw BadRequestError(
            `Admission already ${existing.verificationStatus}`,
        );
    }

    const updated = await prisma.$transaction(async (tx) => {
        const admission = await tx.admission.update({
            where: { id: admissionId },
            data: {
                verificationStatus: input.verificationStatus,
                remarks: input.remarks ?? undefined,
            },
        });

        // Generate commission on VERIFIED (only)
        if (input.verificationStatus === VerificationStatus.VERIFIED) {
            // Check if a commission record already exists
            const existingCommission = await tx.commissionRecord.findFirst({
                where: { admissionId: admission.id },
                select: { id: true },
            });

            if (!existingCommission) {
                // Commission rule resolution: prefer course-level, else partner-level
                const courseRule = await tx.commissionRule.findFirst({
                    where: { courseId: admission.courseId },
                });

                let rate = 0;
                let ruleId: string | null = null;

                if (courseRule) {
                    rate = Number(courseRule.rate);
                    ruleId = courseRule.id;
                } else {
                    const partner = await tx.partner.findUnique({
                        where: { id: admission.partnerId },
                        select: { commissionType: true },
                    });
                    // Default fallback — no specific rule; use 0 to avoid surprising payouts
                    rate = 0;
                    ruleId = null;
                    void partner; // reserved for future
                }

                const baseAmount = Number(admission.fee);
                const commissionAmount = (baseAmount * rate) / 100;

                await tx.commissionRecord.create({
                    data: {
                        partnerId: admission.partnerId,
                        admissionId: admission.id,
                        ruleId,
                        baseAmount,
                        commissionRate: rate,
                        commissionAmount,
                        status: 'PENDING',
                    },
                });
            }
        }

        return admission;
    });

    // Refresh payment status (fee may have changed; still safe to recompute)
    await refreshAdmissionPaymentStatus(admissionId);

    const payments = await prisma.payment.findMany({
        where: { admissionId },
        select: { amount: true, status: true },
    });
    const { amountPaid } = computePaymentStatus(Number(updated.fee), payments);

    logger.info(
        {
            actorId: actor.id,
            admissionId,
            verification: input.verificationStatus,
        },
        'admission verification updated',
    );

    return toSafeAdmission(updated, amountPaid);
};

// --------------------------------------------------
// Cancel admission
// --------------------------------------------------

export const cancelAdmission = async (
    actor: ScopeUser,
    admissionId: string,
    input: CancelAdmissionInput,
): Promise<SafeAdmission> => {
    const existing = await loadAdmissionForActor(actor, admissionId);

    if (existing.verificationStatus === VerificationStatus.REJECTED) {
        throw BadRequestError('Admission already REJECTED');
    }

    const updated = await prisma.admission.update({
        where: { id: admissionId },
        data: {
            verificationStatus: VerificationStatus.REJECTED,
            remarks: input.reason ?? undefined,
        },
    });

    const payments = await prisma.payment.findMany({
        where: { admissionId },
        select: { amount: true, status: true },
    });
    const { amountPaid } = computePaymentStatus(Number(updated.fee), payments);

    logger.info({ actorId: actor.id, admissionId }, 'admission cancelled');

    return toSafeAdmission(updated, amountPaid);
};

// --------------------------------------------------
// Record payment (append-only)
// --------------------------------------------------

export const recordPayment = async (
    actor: ScopeUser,
    admissionId: string,
    input: RecordPaymentInput,
): Promise<{ payment: SafePayment; admission: SafeAdmission }> => {
    await loadAdmissionForActor(actor, admissionId);

    const admission = await prisma.admission.findUniqueOrThrow({
        where: { id: admissionId },
    });

    // Compute remaining
    const existingPayments = await prisma.payment.findMany({
        where: { admissionId },
        select: { amount: true, status: true },
    });
    const { amountPaid } = computePaymentStatus(
        Number(admission.fee),
        existingPayments,
    );
    const remaining = Number(admission.fee) - amountPaid;

    if (input.amount > remaining) {
        throw BadRequestError(
            `Payment amount (${input.amount}) exceeds remaining balance (${remaining})`,
        );
    }

    const payment = await prisma.payment.create({
        data: {
            admissionId,
            createdBy: actor.id,
            amount: input.amount,
            paymentMode: input.paymentMode,
            transactionReference: input.transactionReference ?? null,
            paymentDate: input.paymentDate ?? new Date(),
            status: input.status ?? PaymentStatus.PAID,
        },
    });

    // Recompute admission payment status
    await refreshAdmissionPaymentStatus(admissionId);

    const refreshedAdmission = await prisma.admission.findUniqueOrThrow({
        where: { id: admissionId },
    });
    const allPayments = await prisma.payment.findMany({
        where: { admissionId },
        select: { amount: true, status: true },
    });
    const { amountPaid: newAmountPaid } = computePaymentStatus(
        Number(refreshedAdmission.fee),
        allPayments,
    );

    logger.info(
        { actorId: actor.id, admissionId, paymentId: payment.id, amount: input.amount },
        'payment recorded',
    );

    return {
        payment: toSafePayment(payment),
        admission: toSafeAdmission(refreshedAdmission, newAmountPaid),
    };
};

// --------------------------------------------------
// Refund payment
// --------------------------------------------------

export const refundPayment = async (
    actor: ScopeUser,
    admissionId: string,
    paymentId: string,
    input: RefundPaymentInput,
): Promise<{ payment: SafePayment; admission: SafeAdmission }> => {
    if (actor.role !== 'SUPER_ADMIN') {
        throw ForbiddenError('Only SUPER_ADMIN can process refunds');
    }

    await loadAdmissionForActor(actor, admissionId);

    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, admissionId: true, status: true },
    });

    if (!payment) throw NotFoundError('Payment not found');
    if (payment.admissionId !== admissionId) {
        throw BadRequestError('Payment does not belong to this admission');
    }
    if (payment.status !== PaymentStatus.PAID) {
        throw BadRequestError(
            `Cannot refund a payment in ${payment.status} state`,
        );
    }

    const refunded = await prisma.$transaction(async (tx) => {
        const updated = await tx.payment.update({
            where: { id: paymentId },
            data: { status: PaymentStatus.REFUNDED },
        });

        // Append activity on the parent lead
        const admission = await tx.admission.findUniqueOrThrow({
            where: { id: admissionId },
            select: { leadId: true },
        });
        await tx.leadActivity.create({
            data: {
                leadId: admission.leadId,
                userId: actor.id,
                type: ActivityType.NOTE,
                description: 'Payment refunded',
                metadata: {
                    admissionId,
                    paymentId,
                    reason: input.reason ?? null,
                } as never,
            },
        });

        return updated;
    });

    await refreshAdmissionPaymentStatus(admissionId);

    const refreshedAdmission = await prisma.admission.findUniqueOrThrow({
        where: { id: admissionId },
    });
    const payments = await prisma.payment.findMany({
        where: { admissionId },
        select: { amount: true, status: true },
    });
    const { amountPaid } = computePaymentStatus(
        Number(refreshedAdmission.fee),
        payments,
    );

    logger.info(
        { actorId: actor.id, admissionId, paymentId },
        'payment refunded',
    );

    return {
        payment: toSafePayment(refunded),
        admission: toSafeAdmission(refreshedAdmission, amountPaid),
    };
};

// --------------------------------------------------
// List payments (nested)
// --------------------------------------------------

export interface ListPaymentsResult {
    data: SafePayment[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listPayments = async (
    actor: ScopeUser,
    admissionId: string,
    query: ListPaymentsQuery,
): Promise<ListPaymentsResult> => {
    await loadAdmissionForActor(actor, admissionId);

    const where: Record<string, unknown> = { admissionId };
    if (query.status) where.status = query.status;

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
            where,
            orderBy: { paymentDate: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(toSafePayment),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
};