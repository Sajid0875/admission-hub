/**
 * user.schema.ts - Zod schemas for user endpoints.
 *
 * Endpoints covered:
 *   - Create user            (POST /users)
 *   - Update user            (PATCH /users/:id)
 *   - Change status          (PATCH /users/:id/status)
 *   - Change role            (PATCH /users/:id/role)
 *   - List / filter          (GET /users)
 *
 * Password is NOT accepted on create — the service generates a temporary
 * password and returns it once. Password change is a separate flow.
 */

import { z } from 'zod';
import { RoleName, UserStatus } from '@prisma/client';

// --------------------------------------------------
// Shared
// --------------------------------------------------

const emailSchema = z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .transform((v) => v.trim().toLowerCase());

const nameSchema = z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name is too long')
    .transform((v) => v.trim());

const phoneSchema = z
    .string()
    .trim()
    .max(30, 'Phone number is too long')
    .optional()
    .nullable();

const roleSchema = z.nativeEnum(RoleName);
const statusSchema = z.nativeEnum(UserStatus);

const partnerIdSchema = z
    .string()
    .uuid('partnerId must be a UUID')
    .optional()
    .nullable();

// --------------------------------------------------
// Create user
// --------------------------------------------------

export const CreateUserSchema = z.object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    role: roleSchema,
    partnerId: partnerIdSchema,
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// --------------------------------------------------
// Update user (name, phone only — role/status via dedicated routes)
// --------------------------------------------------

export const UpdateUserSchema = z
    .object({
        name: nameSchema.optional(),
        phone: phoneSchema,
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field must be provided',
    });

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// --------------------------------------------------
// Change status
// --------------------------------------------------

export const ChangeStatusSchema = z.object({
    status: statusSchema,
});

export type ChangeStatusInput = z.infer<typeof ChangeStatusSchema>;

// --------------------------------------------------
// Change role
// --------------------------------------------------

export const ChangeRoleSchema = z.object({
    role: roleSchema,
});

export type ChangeRoleInput = z.infer<typeof ChangeRoleSchema>;

// --------------------------------------------------
// List / filter users
// --------------------------------------------------

export const ListUsersQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    search: z.string().trim().min(1).optional(),
    role: roleSchema.optional(),
    status: statusSchema.optional(),
    partnerId: z.string().uuid().optional(),
});

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;