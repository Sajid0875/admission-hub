/**
 * user.controller.ts - User HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to user.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect`. Role gating is applied in user.routes.ts
 * via `authorize(...)`. Services still re-check tenant scope.
 */

import type { Request, Response } from 'express';
import {
    CreateUserSchema,
    UpdateUserSchema,
    ChangeStatusSchema,
    ChangeRoleSchema,
    ListUsersQuerySchema,
} from './user.schema.js';
import * as userService from './user.service.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';

// --------------------------------------------------
// Helper — read actor from req.user, fail if missing
// --------------------------------------------------

const requireActor = (req: Request): ScopeUser => {
    if (!req.user) {
        throw UnauthorizedError('Authentication required');
    }
    return req.user;
};

// --------------------------------------------------
// GET /api/v1/users
// --------------------------------------------------

export const listUsersHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListUsersQuerySchema.parse(req.query);

    const result = await userService.listUsers(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/users/:id
// --------------------------------------------------

export const getUserHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const user = await userService.getUserById(actor, id as string);

    res.status(200).json({ user });
};

// --------------------------------------------------
// POST /api/v1/users
// --------------------------------------------------

export const createUserHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const input = CreateUserSchema.parse(req.body);

    const result = await userService.createUser(actor, input);

    res.status(201).json({
        user: result.user,
        temporaryPassword: result.temporaryPassword,
    });
};

// --------------------------------------------------
// PATCH /api/v1/users/:id
// --------------------------------------------------

export const updateUserHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = UpdateUserSchema.parse(req.body);

    const user = await userService.updateUser(actor, id as string, input);

    res.status(200).json({ user });
};

// --------------------------------------------------
// PATCH /api/v1/users/:id/status
// --------------------------------------------------

export const changeStatusHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = ChangeStatusSchema.parse(req.body);

    const user = await userService.changeStatus(actor, id as string, input);

    res.status(200).json({ user });
};

// --------------------------------------------------
// PATCH /api/v1/users/:id/role
// --------------------------------------------------

export const changeRoleHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = ChangeRoleSchema.parse(req.body);

    const user = await userService.changeRole(actor, id as string, input);

    res.status(200).json({ user });
};