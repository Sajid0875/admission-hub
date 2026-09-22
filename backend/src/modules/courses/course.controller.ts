/**
 * course.controller.ts - Course HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to course.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect`. Role gating is applied in course.routes.ts
 * via `authorize(...)`. Services re-check `SUPER_ADMIN` on write.
 */

import type { Request, Response } from 'express';
import {
    CreateCourseSchema,
    UpdateCourseSchema,
    ChangeCourseStatusSchema,
    ListCoursesQuerySchema,
} from './course.schema.js';
import * as courseService from './course.service.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';

// --------------------------------------------------
// Helper — read actor from req.user
// --------------------------------------------------

const requireActor = (req: Request): ScopeUser => {
    if (!req.user) {
        throw UnauthorizedError('Authentication required');
    }
    return req.user;
};

// --------------------------------------------------
// GET /api/v1/courses
// --------------------------------------------------

export const listCoursesHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListCoursesQuerySchema.parse(req.query);

    const result = await courseService.listCourses(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/courses/:id
// --------------------------------------------------

export const getCourseHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const course = await courseService.getCourseById(actor, id as string);

    res.status(200).json({ course });
};

// --------------------------------------------------
// POST /api/v1/courses
// --------------------------------------------------

export const createCourseHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const input = CreateCourseSchema.parse(req.body);

    const course = await courseService.createCourse(actor, input);

    res.status(201).json({ course });
};

// --------------------------------------------------
// PATCH /api/v1/courses/:id
// --------------------------------------------------

export const updateCourseHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = UpdateCourseSchema.parse(req.body);

    const course = await courseService.updateCourse(actor, id as string, input);

    res.status(200).json({ course });
};

// --------------------------------------------------
// PATCH /api/v1/courses/:id/status
// --------------------------------------------------

export const changeCourseStatusHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = ChangeCourseStatusSchema.parse(req.body);

    const course = await courseService.changeCourseStatus(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ course });
};