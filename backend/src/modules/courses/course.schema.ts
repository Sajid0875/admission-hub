/**
 * course.schema.ts - Zod schemas for course endpoints.
 *
 * Endpoints covered:
 *   - List courses              (GET /courses)
 *   - Get course                (GET /courses/:id)
 *   - Create course             (POST /courses)          — super_admin
 *   - Update course             (PATCH /courses/:id)     — super_admin
 *   - Change status             (PATCH /courses/:id/status) — super_admin
 *
 * Notes:
 *   - Courses are a global catalog: all authenticated users can read.
 *   - Only super_admin can write.
 *   - Deletion is archival (status → ARCHIVED), never hard delete.
 */

import { z } from 'zod';
import { CourseStatus } from '@prisma/client';

// --------------------------------------------------
// Shared field schemas
// --------------------------------------------------

const titleSchema = z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title is too long')
    .transform((v) => v.trim());

const descriptionSchema = z
    .string()
    .trim()
    .max(5000, 'Description is too long')
    .optional()
    .nullable();

const durationSchema = z
    .string()
    .min(1, 'Duration is required')
    .max(100, 'Duration is too long')
    .transform((v) => v.trim());

const feeSchema = z
    .number()
    .positive('Fee must be greater than 0')
    .max(10_000_000, 'Fee exceeds maximum allowed');

const urlSchema = z
    .string()
    .url('Must be a valid URL')
    .optional()
    .nullable();

const longTextSchema = z
    .string()
    .trim()
    .max(20000, 'Text is too long')
    .optional()
    .nullable();

const statusSchema = z.nativeEnum(CourseStatus);

// --------------------------------------------------
// Create course
// --------------------------------------------------

export const CreateCourseSchema = z.object({
    title: titleSchema,
    description: descriptionSchema,
    duration: durationSchema,
    fee: feeSchema,
    syllabusUrl: urlSchema,
    brochureUrl: urlSchema,
    demoUrl: urlSchema,
    benefits: longTextSchema,
    faq: longTextSchema,
});

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;

// --------------------------------------------------
// Update course
// --------------------------------------------------

export const UpdateCourseSchema = z
    .object({
        title: titleSchema.optional(),
        description: descriptionSchema,
        duration: durationSchema.optional(),
        fee: feeSchema.optional(),
        syllabusUrl: urlSchema,
        brochureUrl: urlSchema,
        demoUrl: urlSchema,
        benefits: longTextSchema,
        faq: longTextSchema,
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;

// --------------------------------------------------
// Change status
// --------------------------------------------------

export const ChangeCourseStatusSchema = z.object({
    status: statusSchema,
});

export type ChangeCourseStatusInput = z.infer<typeof ChangeCourseStatusSchema>;

// --------------------------------------------------
// List / filter courses
// --------------------------------------------------

export const ListCoursesQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().min(1).optional(),
    status: statusSchema.optional(),
});

export type ListCoursesQuery = z.infer<typeof ListCoursesQuerySchema>;