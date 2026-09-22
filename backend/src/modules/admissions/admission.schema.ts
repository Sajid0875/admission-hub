/**
 * admission.schema.ts - Zod schemas for admission + payment endpoints.
 *
 * Endpoints covered:
 *   - Create admission           (POST /admissions)
 *   - Update admission           (PATCH /admissions/:id)
 *   - Verify admission           (POST /admissions/:id/verify)
 *   - Cancel admission           (POST /admissions/:id/cancel)
 *   - List admissions            (GET /admissions)
 *   - Get admission by id        (GET /admissions/:id)
 *   - List payments              (GET /admissions/:id/payments)
 *   - Record payment             (POST /admissions/:id/payments)
 *   - Initiate gateway payment   (POST /admissions/:id/payments/initiate)
 *   - Confirm gateway payment    (POST /admissions/:id/payments/confirm)
 *   - Refund payment             (POST /admissions/:id/payments/:paymentId/refund)
 *
 * Notes:
 *   - Payment status is derived from sum of payments; never accepted from client.
 *   - Admission creation is transactional: creates admission + flips lead to ADMITTED
 *     + appends LeadActivity, all in one Prisma transaction.
 *   - Commission is generated on verification, not creation.
 */

import { z } from 'zod';
import { PaymentStatus, VerificationStatus } from '@prisma/client';

// --------------------------------------------------
// Shared field schemas
// --------------------------------------------------

const studentNameSchema = z
    .string()
    .min(2, 'Student name must be at least 2 characters')
    .max(200, 'Student name is too long')
    .transform((v) => v.trim());

const feeSchema = z
    .number()
    .positive('Fee must be greater than 0')
    .max(10_000_000, 'Fee exceeds maximum allowed');

const remarksSchema = z
    .string()
    .trim()
    .max(2000, 'Remarks are too long')
    .optional()
    .nullable();

const joiningDateSchema = z
    .string()
    .datetime({ message: 'joiningDate must be an ISO 8601 datetime' })
    .transform((v) => new Date(v))
    .optional();

const paymentAmountSchema = z
    .number()
    .positive('Payment amount must be greater than 0');

/**
 * Allowed payment modes — validated in Zod because `paymentMode` is a
 * plain String column in the DB (not a Prisma enum) for MVP.
 * Add a Prisma enum + migration later if stricter DB-level validation is needed.
 */
const ALLOWED_PAYMENT_MODES = [
    'CASH',
    'UPI',
    'CARD',
    'BANK_TRANSFER',
    'CHEQUE',
    'GATEWAY',
    'OTHER',
] as const;

const paymentModeSchema = z.enum(ALLOWED_PAYMENT_MODES);
const paymentStatusSchema = z.nativeEnum(PaymentStatus);
const verificationStatusSchema = z.nativeEnum(VerificationStatus);

const transactionReferenceSchema = z
    .string()
    .trim()
    .max(200, 'Transaction reference is too long')
    .optional()
    .nullable();

// --------------------------------------------------
// Create admission
// --------------------------------------------------

export const CreateAdmissionSchema = z.object({
    leadId: z.string().uuid('leadId must be a UUID'),
    courseId: z.string().uuid('courseId must be a UUID'),
    studentName: studentNameSchema.optional(), // defaults to lead name if omitted
    fee: feeSchema,
    paymentMode: paymentModeSchema.optional().nullable(),
    joiningDate: joiningDateSchema,
    remarks: remarksSchema,
});

export type CreateAdmissionInput = z.infer<typeof CreateAdmissionSchema>;

// --------------------------------------------------
// Update admission (student info, remarks, joining date, fee)
// --------------------------------------------------

export const UpdateAdmissionSchema = z
    .object({
        studentName: studentNameSchema.optional(),
        fee: feeSchema.optional(),
        paymentMode: paymentModeSchema.optional().nullable(),
        joiningDate: joiningDateSchema,
        remarks: remarksSchema,
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export type UpdateAdmissionInput = z.infer<typeof UpdateAdmissionSchema>;

// --------------------------------------------------
// Verify admission
// --------------------------------------------------

export const VerifyAdmissionSchema = z.object({
    verificationStatus: verificationStatusSchema.refine(
        (v) => v === VerificationStatus.VERIFIED || v === VerificationStatus.REJECTED,
        { message: 'verificationStatus must be VERIFIED or REJECTED' },
    ),
    remarks: remarksSchema,
});

export type VerifyAdmissionInput = z.infer<typeof VerifyAdmissionSchema>;

// --------------------------------------------------
// Cancel admission
// --------------------------------------------------

export const CancelAdmissionSchema = z.object({
    reason: z.string().trim().max(500).optional().nullable(),
});

export type CancelAdmissionInput = z.infer<typeof CancelAdmissionSchema>;

// --------------------------------------------------
// Record payment
// --------------------------------------------------

export const RecordPaymentSchema = z.object({
    amount: paymentAmountSchema,
    paymentMode: paymentModeSchema,
    transactionReference: transactionReferenceSchema,
    status: paymentStatusSchema.optional(), // defaults to PAID
    paymentDate: z
        .string()
        .datetime()
        .transform((v) => new Date(v))
        .optional(),
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

// --------------------------------------------------
// Gateway checkout (initiate / confirm)
// --------------------------------------------------

export const InitiateGatewayPaymentSchema = z.object({
    amount: paymentAmountSchema.optional(), // defaults to remaining balance
});

export type InitiateGatewayPaymentInput = z.infer<
    typeof InitiateGatewayPaymentSchema
>;

export const ConfirmGatewayPaymentSchema = z.object({
    orderId: z.string().min(1).max(200),
    paymentId: z.string().min(1).max(200),
    intentToken: z.string().min(1).max(4000),
    signature: z.string().min(1).max(500).optional(),
});

export type ConfirmGatewayPaymentInput = z.infer<
    typeof ConfirmGatewayPaymentSchema
>;

// --------------------------------------------------
// Refund payment
// --------------------------------------------------

export const RefundPaymentSchema = z.object({
    reason: z.string().trim().max(500).optional().nullable(),
});

export type RefundPaymentInput = z.infer<typeof RefundPaymentSchema>;

// --------------------------------------------------
// List / filter admissions
// --------------------------------------------------

export const ListAdmissionsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().min(1).optional(),
    leadId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    paymentStatus: paymentStatusSchema.optional(),
    verificationStatus: verificationStatusSchema.optional(),
    createdBy: z.string().uuid().optional(),
    from: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
    to: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
});

export type ListAdmissionsQuery = z.infer<typeof ListAdmissionsQuerySchema>;

// --------------------------------------------------
// Nested — list payments for an admission
// --------------------------------------------------

export const ListPaymentsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    status: paymentStatusSchema.optional(),
});

export type ListPaymentsQuery = z.infer<typeof ListPaymentsQuerySchema>;