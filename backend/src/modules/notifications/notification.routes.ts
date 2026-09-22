/**
 * notification.routes.ts - Notification route definitions.
 *
 * Mounts under /api/v1/notifications (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list notifications (any authenticated)
 *   GET    /unread-count          unread badge count (any authenticated)
 *   PATCH  /:id/read              mark one read (any authenticated)
 *   PATCH  /read-all              mark all read (any authenticated)
 *
 * Every route is behind `protect`.
 * Every user sees only their own notifications — scope is enforced
 * in the service layer via `req.user.id`.
 *
 * Note: `/read-all` MUST come before `/:id/read` in route registration
 * order, otherwise Express may match `/read-all` against `/:id`.
 */

import { Router } from 'express';
import { protect } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listNotificationsHandler,
    unreadCountHandler,
    markNotificationReadHandler,
    markAllNotificationsReadHandler,
} from './notification.controller.js';

export const notificationRouter: Router = Router();

// All notification routes require authentication
notificationRouter.use(protect);

// --- Literal routes first (before `/:id/*` patterns) ---
notificationRouter.get('/', asyncHandler(listNotificationsHandler));
notificationRouter.get('/unread-count', asyncHandler(unreadCountHandler));
notificationRouter.patch(
    '/read-all',
    asyncHandler(markAllNotificationsReadHandler),
);

// --- Param routes ---
notificationRouter.patch(
    '/:id/read',
    asyncHandler(markNotificationReadHandler),
);