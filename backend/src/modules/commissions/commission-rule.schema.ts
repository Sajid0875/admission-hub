/**
 * commission-rule.schema.ts - Zod schemas for commission rule endpoints.
 *
 * Endpoints covered:
 *   - List rules              (GET /commission-rules)          — super_admin
 *   - Get rule                (GET /commission-rules/:id)      — super_admin
 *   - Create rule             (POST /commission-rules)         — super_admin
 *   - Update rule             (PATCH /commission-rules/:id)    — super_admin
 *   - Delete rule             (DELETE /commission-rules/:id)   — super_admin
 *
 * Notes:
 *   - Rules are config, not transactional data. Hard delete is allowed.
 *   - courseId is optional. If set, unique among rules with non-null courseId.
 *   - Historical commission records snapshot rate at creation time.
 */

import { z } from 'zod';
import { CommissionType } from '@prisma/client';

// --------------------------------------------------
// Shared field schemas
// --------------------------------------------------

const courseIdSchema = z
    .string()
    .uuid('courseId must be a UUID')
    .optional()
    .nullable();

const partnerTypeSchema = z
    .string()
    .trim()
    .min(1, 'partnerType must not be empty')
    .max(100, 'partnerType is too long')
    .optional()
    .nullable();

const commissionTypeSchema = z.nativeEnum(CommissionType);

const rateSchema = z
    .number()
    .nonnegative('Rate must be zero or positive')
    .max(1_000_000, 'Rate exceeds maximum allowed');

// --------------------------------------------------
// Create rule
// --------------------------------------------------

export const CreateCommissionRuleSchema = z.object({
    courseId: courseIdSchema,
    partnerType: partnerTypeSchema,
    commissionType: commissionTypeSchema,
    rate: rateSchema,
});

export type CreateCommissionRuleInput = z.infer<
    typeof CreateCommissionRuleSchema
>;

// --------------------------------------------------
// Update rule
// --------------------------------------------------

export const UpdateCommissionRuleSchema = z
    .object({
        courseId: courseIdSchema,
        partnerType: partnerTypeSchema,
        commissionType: commissionTypeSchema.optional(),
        rate: rateSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export type UpdateCommissionRuleInput = z.infer<
    typeof UpdateCommissionRuleSchema
>;

// --------------------------------------------------
// List / filter
// --------------------------------------------------

export const ListCommissionRulesQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    courseId: z.string().uuid().optional(),
    partnerType: z.string().trim().min(1).optional(),
    commissionType: commissionTypeSchema.optional(),
});

export type ListCommissionRulesQuery = z.infer<
    typeof ListCommissionRulesQuerySchema
>;