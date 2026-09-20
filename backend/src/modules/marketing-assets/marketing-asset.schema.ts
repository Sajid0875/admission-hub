/**
 * marketing-asset.schema.ts - Zod schemas for marketing asset endpoints.
 *
 * Endpoints covered:
 *   - List assets              (GET /marketing-assets)
 *   - Get asset                (GET /marketing-assets/:id)
 *   - Create asset             (POST /marketing-assets)          — super_admin
 *   - Update asset             (PATCH /marketing-assets/:id)     — super_admin
 *   - Archive asset            (DELETE /marketing-assets/:id)    — super_admin (soft)
 *
 * Notes:
 *   - Assets are globally readable; write access is super_admin only.
 *   - File URLs only, no file uploads (for MVP).
 *   - Deletion is soft: status → ARCHIVED.
 */

import { z } from 'zod';
import { AssetType, AssetStatus } from '@prisma/client';

// --------------------------------------------------
// Shared field schemas
// --------------------------------------------------

const titleSchema = z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title is too long')
    .transform((v) => v.trim());

const fileUrlSchema = z
    .string()
    .url('fileUrl must be a valid URL')
    .max(2000, 'fileUrl is too long');

const thumbnailUrlSchema = z
    .string()
    .url('thumbnailUrl must be a valid URL')
    .max(2000, 'thumbnailUrl is too long')
    .optional()
    .nullable();

const languageSchema = z
    .string()
    .trim()
    .min(2, 'Language must be at least 2 characters')
    .max(50, 'Language is too long')
    .optional();

const courseIdSchema = z
    .string()
    .uuid('courseId must be a UUID')
    .optional()
    .nullable();

const assetTypeSchema = z.nativeEnum(AssetType);
const assetStatusSchema = z.nativeEnum(AssetStatus);

// --------------------------------------------------
// Create marketing asset
// --------------------------------------------------

export const CreateMarketingAssetSchema = z.object({
    title: titleSchema,
    type: assetTypeSchema,
    fileUrl: fileUrlSchema,
    thumbnailUrl: thumbnailUrlSchema,
    language: languageSchema,
    courseId: courseIdSchema,
    status: assetStatusSchema.optional(),
});

export type CreateMarketingAssetInput = z.infer<
    typeof CreateMarketingAssetSchema
>;

// --------------------------------------------------
// Update marketing asset
// --------------------------------------------------

export const UpdateMarketingAssetSchema = z
    .object({
        title: titleSchema.optional(),
        type: assetTypeSchema.optional(),
        fileUrl: fileUrlSchema.optional(),
        thumbnailUrl: thumbnailUrlSchema,
        language: languageSchema,
        courseId: courseIdSchema,
        status: assetStatusSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export type UpdateMarketingAssetInput = z.infer<
    typeof UpdateMarketingAssetSchema
>;

// --------------------------------------------------
// Archive (delete)
// --------------------------------------------------

export const ArchiveMarketingAssetSchema = z.object({
    reason: z.string().trim().max(500).optional().nullable(),
});

export type ArchiveMarketingAssetInput = z.infer<
    typeof ArchiveMarketingAssetSchema
>;

// --------------------------------------------------
// List / filter
// --------------------------------------------------

export const ListMarketingAssetsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().min(1).optional(),
    type: assetTypeSchema.optional(),
    status: assetStatusSchema.optional(),
    language: z.string().trim().min(1).optional(),
    courseId: z.string().uuid().optional(),
});

export type ListMarketingAssetsQuery = z.infer<
    typeof ListMarketingAssetsQuerySchema
>;