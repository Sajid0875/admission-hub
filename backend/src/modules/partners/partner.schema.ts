/**
 * partner.schema.ts - Zod schemas for partner endpoints.
 *
 * Endpoints covered:
 *   - Create partner       (POST /partners)     — super_admin only
 *   - Update partner       (PATCH /partners/:id) — super_admin only
 *   - Change status        (PATCH /partners/:id/status) — super_admin only
 *   - List / filter        (GET /partners)      — super_admin only
 *
 * For MVP, partner onboarding is super_admin-initiated.
 * Public self-serve onboarding is deferred.
 */

import { z } from 'zod';
import { PartnerStatus, CommissionType } from '@prisma/client';

// --------------------------------------------------
// Shared field schemas
// --------------------------------------------------

const academyNameSchema = z
    .string()
    .min(2, 'Academy name must be at least 2 characters')
    .max(200, 'Academy name is too long')
    .transform((v) => v.trim());

const partnerNameSchema = z
    .string()
    .min(2, 'Partner name must be at least 2 characters')
    .max(200, 'Partner name is too long')
    .transform((v) => v.trim());

const ownerNameSchema = z
    .string()
    .min(2, 'Owner name must be at least 2 characters')
    .max(200, 'Owner name is too long')
    .transform((v) => v.trim());

const emailSchema = z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .transform((v) => v.trim().toLowerCase());

const mobileSchema = z
    .string()
    .min(6, 'Mobile number is too short')
    .max(30, 'Mobile number is too long')
    .transform((v) => v.trim());

const addressSchema = z
    .string()
    .trim()
    .max(500, 'Address is too long')
    .optional()
    .nullable();

const logoUrlSchema = z
    .string()
    .url('Logo URL must be a valid URL')
    .optional()
    .nullable();

const commissionTypeSchema = z.nativeEnum(CommissionType);
const partnerStatusSchema = z.nativeEnum(PartnerStatus);

// --------------------------------------------------
// Create partner
// --------------------------------------------------

export const CreatePartnerSchema = z.object({
    academyName: academyNameSchema,
    partnerName: partnerNameSchema,
    ownerName: ownerNameSchema,
    email: emailSchema,
    mobile: mobileSchema,
    address: addressSchema,
    logoUrl: logoUrlSchema,
    commissionType: commissionTypeSchema.optional(),
});

export type CreatePartnerInput = z.infer<typeof CreatePartnerSchema>;

// --------------------------------------------------
// Update partner (profile fields only — status via dedicated route)
// --------------------------------------------------

export const UpdatePartnerSchema = z
    .object({
        academyName: academyNameSchema.optional(),
        partnerName: partnerNameSchema.optional(),
        ownerName: ownerNameSchema.optional(),
        mobile: mobileSchema.optional(),
        address: addressSchema,
        logoUrl: logoUrlSchema,
        commissionType: commissionTypeSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export type UpdatePartnerInput = z.infer<typeof UpdatePartnerSchema>;

// --------------------------------------------------
// Change status
// --------------------------------------------------

export const ChangePartnerStatusSchema = z.object({
    status: partnerStatusSchema,
});

export type ChangePartnerStatusInput = z.infer<
    typeof ChangePartnerStatusSchema
>;

// --------------------------------------------------
// List / filter partners
// --------------------------------------------------

export const ListPartnersQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().min(1).optional(),
    status: partnerStatusSchema.optional(),
    commissionType: commissionTypeSchema.optional(),
});

export type ListPartnersQuery = z.infer<typeof ListPartnersQuerySchema>;