/**
 * course.routes.ts - Course route definitions.
 *
 * Mounts under /api/v1/courses (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list courses (any authenticated)
 *   GET    /:id                   get one course (any authenticated)
 *   POST   /                      create course (super_admin)
 *   PATCH  /:id                   update course (super_admin)
 *   PATCH  /:id/status            change status (super_admin)
 *
 * Every route is behind `protect`.
 * Catalog is globally readable — write access is super_admin only.
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listCoursesHandler,
    getCourseHandler,
    createCourseHandler,
    updateCourseHandler,
    changeCourseStatusHandler,
} from './course.controller.js';

export const courseRouter: Router = Router();

// All course routes require authentication
courseRouter.use(protect);

// --- Read (any authenticated user) ---
courseRouter.get(
    '/',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(listCoursesHandler),
);

courseRouter.get(
    '/:id',
    authorize('SUPER_ADMIN', 'PARTNER_ADMIN', 'COUNSELOR', 'SUPPORT'),
    asyncHandler(getCourseHandler),
);

// --- Write (super_admin only) ---
courseRouter.post(
    '/',
    authorize('SUPER_ADMIN'),
    asyncHandler(createCourseHandler),
);

courseRouter.patch(
    '/:id',
    authorize('SUPER_ADMIN'),
    asyncHandler(updateCourseHandler),
);

courseRouter.patch(
    '/:id/status',
    authorize('SUPER_ADMIN'),
    asyncHandler(changeCourseStatusHandler),
);