/**
 * commission.schema.ts - Zod schemas for commission record endpoints.
 *
 * Endpoints covered:
 *   - List records             (GET /commissions)
 *   - Get record               (GET /commissions/:id)
 *   - Change status            (PATCH /commissions/:id/status)  — super_admin
 *
 * Notes:
 *   - Records are created automatically by admission verification.
 *   - Status transitions: PENDING → APPROVED → PAID; PENDING → CANCELLED.
 *   - Historical records are immutable in their financial fields.
 */

import { z } from 'zod';
import { CommissionStatus } from '@prisma/client';

// --------------------------------------------------
// Change status
// --------------------------------------------------

export const ChangeCommissionStatusSchema = z.object({
    status: z
        .nativeEnum(CommissionStatus)
        .refine(
            (v) =>
                v === CommissionStatus.APPROVED ||
                v === CommissionStatus.PAID ||
                v === CommissionStatus.CANCELLED,
            {
                message: 'Status must be APPROVED, PAID, or CANCELLED',
            },
        ),
    note: z.string().trim().max(500).optional().nullable(),
});

export type ChangeCommissionStatusInput = z.infer<
    typeof ChangeCommissionStatusSchema
>;

// --------------------------------------------------
// List / filter
// --------------------------------------------------

export const ListCommissionsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    status: z.nativeEnum(CommissionStatus).optional(),
    partnerId: z.string().uuid().optional(),
    admissionId: z.string().uuid().optional(),
    from: z
        .string()
        .datetime()
        .optional()
        .transform((v) => (v ? new Date(v) : undefined)),
    to: z
        .string()
        .datetime()
        .optional()
        .transform((v) => (v ? new Date(v) : undefined)),
});

export type ListCommissionsQuery = z.infer<typeof ListCommissionsQuerySchema>;