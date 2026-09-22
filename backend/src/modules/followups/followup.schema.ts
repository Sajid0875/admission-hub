/**
 * followup.schema.ts - Zod schemas for follow-up endpoints.
 *
 * Endpoints covered:
 *   - Create follow-up         (POST /followups)
 *   - Update follow-up         (PATCH /followups/:id)
 *   - Complete follow-up       (POST /followups/:id/complete)
 *   - Snooze follow-up         (POST /followups/:id/snooze)
 *   - Cancel follow-up         (POST /followups/:id/cancel)
 *   - List / filter            (GET /followups)
 *   - List for a lead          (GET /leads/:id/followups)
 *
 * Notes:
 *   - Outcomes are only set on completion.
 *   - Overdue is computed on the fly, not stored.
 *   - Snooze requires a future dueAt.
 */

import { z } from 'zod';
import { FollowUpStatus, FollowUpOutcome, LeadPriority } from '@prisma/client';

// --------------------------------------------------
// Shared field schemas
// --------------------------------------------------

const dueAtSchema = z
    .string()
    .datetime({ message: 'dueAt must be an ISO 8601 datetime' })
    .transform((v) => new Date(v));

const prioritySchema = z.nativeEnum(LeadPriority);
const statusSchema = z.nativeEnum(FollowUpStatus);
const outcomeSchema = z.nativeEnum(FollowUpOutcome);

const notesSchema = z
    .string()
    .trim()
    .max(2000, 'Notes are too long')
    .optional()
    .nullable();

// --------------------------------------------------
// Create follow-up
// --------------------------------------------------

export const CreateFollowUpSchema = z.object({
    leadId: z.string().uuid('leadId must be a UUID'),
    assignedTo: z.string().uuid().optional().nullable(),
    dueAt: dueAtSchema,
    priority: prioritySchema.optional(),
    notes: notesSchema,
});

export type CreateFollowUpInput = z.infer<typeof CreateFollowUpSchema>;

// --------------------------------------------------
// Update follow-up (dueAt, priority, notes only)
// --------------------------------------------------

export const UpdateFollowUpSchema = z
    .object({
        dueAt: dueAtSchema.optional(),
        priority: prioritySchema.optional(),
        notes: notesSchema,
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export type UpdateFollowUpInput = z.infer<typeof UpdateFollowUpSchema>;

// --------------------------------------------------
// Complete
// --------------------------------------------------

export const CompleteFollowUpSchema = z.object({
    outcome: outcomeSchema,
    notes: notesSchema,
});

export type CompleteFollowUpInput = z.infer<typeof CompleteFollowUpSchema>;

// --------------------------------------------------
// Snooze
// --------------------------------------------------

export const SnoozeFollowUpSchema = z.object({
    dueAt: dueAtSchema,
    notes: notesSchema,
});

export type SnoozeFollowUpInput = z.infer<typeof SnoozeFollowUpSchema>;

// --------------------------------------------------
// Cancel
// --------------------------------------------------

export const CancelFollowUpSchema = z.object({
    reason: z.string().trim().max(500).optional().nullable(),
});

export type CancelFollowUpInput = z.infer<typeof CancelFollowUpSchema>;

// --------------------------------------------------
// List / filter
// --------------------------------------------------

export const ListFollowUpsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    outcome: outcomeSchema.optional(),
    assignedTo: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    from: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
    to: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
    overdue: z
        .union([z.literal('true'), z.literal('false')])
        .optional()
        .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export type ListFollowUpsQuery = z.infer<typeof ListFollowUpsQuerySchema>;

// --------------------------------------------------
// Nested — list follow-ups for a lead
// --------------------------------------------------

export const ListLeadFollowUpsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    status: statusSchema.optional(),
});

export type ListLeadFollowUpsQuery = z.infer<typeof ListLeadFollowUpsQuerySchema>;