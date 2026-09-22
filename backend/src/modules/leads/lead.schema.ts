/**
 * lead.schema.ts - Zod schemas for lead endpoints.
 *
 * Endpoints covered:
 *   - Create lead            (POST /leads)
 *   - Update lead            (PATCH /leads/:id)
 *   - Assign lead            (PATCH /leads/:id/assign)
 *   - Change status          (PATCH /leads/:id/status)
 *   - Archive lead           (POST /leads/:id/archive)
 *   - List / filter          (GET /leads)
 *   - Activities timeline    (GET /leads/:id/activities)
 *
 * Notes:
 *   - Duplicate detection runs in the service layer (phone exact, email soft).
 *   - Status transitions enforced by the service via a state machine.
 *   - Assignment is to COUNSELOR users only, within the same partner.
 */

import { z } from 'zod';
import { LeadPriority, LeadStatus, ActivityType } from '@prisma/client';

// --------------------------------------------------
// Shared field schemas
// --------------------------------------------------

const nameSchema = z
    .string()
    .min(2, 'Lead name must be at least 2 characters')
    .max(200, 'Lead name is too long')
    .transform((v) => v.trim());

const phoneSchema = z
    .string()
    .min(6, 'Phone is too short')
    .max(30, 'Phone is too long')
    .transform((v) => v.trim());

const optionalPhoneSchema = z
    .string()
    .trim()
    .max(30, 'WhatsApp number is too long')
    .optional()
    .nullable();

const emailSchema = z
    .string()
    .email('Invalid email format')
    .transform((v) => v.trim().toLowerCase())
    .optional()
    .nullable();

const citySchema = z
    .string()
    .trim()
    .max(120, 'City is too long')
    .optional()
    .nullable();

const sourceSchema = z
    .string()
    .trim()
    .max(120, 'Source is too long')
    .optional()
    .nullable();

const budgetSchema = z
    .number()
    .nonnegative('Budget cannot be negative')
    .optional()
    .nullable();

const notesSchema = z
    .string()
    .trim()
    .max(5000, 'Notes are too long')
    .optional()
    .nullable();

const courseIdSchema = z.string().uuid('courseId must be a UUID').optional().nullable();

const prioritySchema = z.nativeEnum(LeadPriority);
const statusSchema = z.nativeEnum(LeadStatus);

const followUpDateSchema = z
    .string()
    .datetime({ message: 'followUpDate must be an ISO 8601 datetime' })
    .optional()
    .nullable()
    .transform((v) => (v ? new Date(v) : v));

// --------------------------------------------------
// Create lead
// --------------------------------------------------

export const CreateLeadSchema = z.object({
    name: nameSchema,
    phone: phoneSchema,
    whatsapp: optionalPhoneSchema,
    email: emailSchema,
    city: citySchema,
    courseId: courseIdSchema,
    source: sourceSchema,
    budget: budgetSchema,
    priority: prioritySchema.optional(),
    notes: notesSchema,
    followUpDate: followUpDateSchema,
    assignedTo: z.string().uuid().optional().nullable(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;

// --------------------------------------------------
// Update lead (fields that don't have dedicated routes)
// --------------------------------------------------

export const UpdateLeadSchema = z
    .object({
        name: nameSchema.optional(),
        phone: phoneSchema.optional(),
        whatsapp: optionalPhoneSchema,
        email: emailSchema,
        city: citySchema,
        courseId: courseIdSchema,
        source: sourceSchema,
        budget: budgetSchema,
        priority: prioritySchema.optional(),
        notes: notesSchema,
        followUpDate: followUpDateSchema,
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;

// --------------------------------------------------
// Assign lead
// --------------------------------------------------

export const AssignLeadSchema = z.object({
    assignedTo: z.string().uuid('assignedTo must be a UUID').nullable(),
});

export type AssignLeadInput = z.infer<typeof AssignLeadSchema>;

// --------------------------------------------------
// Change status
// --------------------------------------------------

export const ChangeLeadStatusSchema = z.object({
    status: statusSchema,
    note: z.string().trim().max(500).optional(),
});

export type ChangeLeadStatusInput = z.infer<typeof ChangeLeadStatusSchema>;

// --------------------------------------------------
// Archive lead
// --------------------------------------------------

export const ArchiveLeadSchema = z.object({
    reason: z.string().trim().max(500).optional(),
});

export type ArchiveLeadInput = z.infer<typeof ArchiveLeadSchema>;

// --------------------------------------------------
// List / filter leads
// --------------------------------------------------

export const ListLeadsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().min(1).optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    assignedTo: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    archived: z
        .union([z.literal('true'), z.literal('false')])
        .optional()
        .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export type ListLeadsQuery = z.infer<typeof ListLeadsQuerySchema>;

// --------------------------------------------------
// Activities query
// --------------------------------------------------

export const ListActivitiesQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    type: z.nativeEnum(ActivityType).optional(),
});

export type ListActivitiesQuery = z.infer<typeof ListActivitiesQuerySchema>;