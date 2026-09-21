/**
 * notification.controller.ts - Notification HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to notification.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect`. Every user sees only their own
 * notifications — scope is enforced in the service layer via `req.user.id`.
 */

import type { Request, Response } from 'express';
import { ListNotificationsQuerySchema } from './notification.schema.js';
import * as notificationService from './notification.service.js';
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
// GET /api/v1/notifications
// --------------------------------------------------

export const listNotificationsHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListNotificationsQuerySchema.parse(req.query);

    const result = await notificationService.listNotifications(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/notifications/unread-count
// --------------------------------------------------

export const unreadCountHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);

    const count = await notificationService.getUnreadCount(actor);

    res.status(200).json({ unreadCount: count });
};

// --------------------------------------------------
// PATCH /api/v1/notifications/:id/read
// --------------------------------------------------

export const markNotificationReadHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const notification = await notificationService.markNotificationRead(
        actor,
        id as string,
    );

    res.status(200).json({ notification });
};

// --------------------------------------------------
// PATCH /api/v1/notifications/read-all
// --------------------------------------------------

export const markAllNotificationsReadHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);

    const result = await notificationService.markAllNotificationsRead(actor);

    res.status(200).json(result);
};