/**
 * notification.service.ts - Notification business logic.
 *
 * Responsibilities:
 *   - List notifications for the current user (own only)
 *   - Unread count
 *   - Mark one or all as read
 *
 * Enforces:
 *   - Notifications are always scoped to `req.user.id`
 *   - No cross-user access (even super_admin only sees their own)
 *   - No create/delete via API — creation is service-side via notify()
 */

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';
import type { ListNotificationsQuery } from './notification.schema.js';

// --------------------------------------------------
// Public shape
// --------------------------------------------------

export interface SafeNotification {
    id: string;
    userId: string;
    partnerId: string | null;
    type: string;
    title: string;
    message: string;
    referenceType: string | null;
    referenceId: string | null;
    readAt: Date | null;
    createdAt: Date;
}

const toSafe = (row: {
    id: string;
    userId: string;
    partnerId: string | null;
    type: string;
    title: string;
    message: string;
    referenceType: string | null;
    referenceId: string | null;
    readAt: Date | null;
    createdAt: Date;
}): SafeNotification => ({
    id: row.id,
    userId: row.userId,
    partnerId: row.partnerId,
    type: row.type,
    title: row.title,
    message: row.message,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    readAt: row.readAt,
    createdAt: row.createdAt,
});

// --------------------------------------------------
// List
// --------------------------------------------------

export interface ListNotificationsResult {
    data: SafeNotification[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    unreadCount: number;
}

export const listNotifications = async (
    actor: ScopeUser,
    query: ListNotificationsQuery,
): Promise<ListNotificationsResult> => {
    // Notifications are always scoped to the current user
    const where: Record<string, unknown> = { userId: actor.id };

    if (query.read === true) where.readAt = { not: null };
    else if (query.read === false) where.readAt = null;

    if (query.type) where.type = query.type;

    const skip = (query.page - 1) * query.limit;

    const [total, rows, unreadCount] = await prisma.$transaction([
        prisma.notification.count({ where }),
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
        prisma.notification.count({
            where: { userId: actor.id, readAt: null },
        }),
    ]);

    return {
        data: rows.map(toSafe),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
        unreadCount,
    };
};

// --------------------------------------------------
// Unread count
// --------------------------------------------------

export const getUnreadCount = async (actor: ScopeUser): Promise<number> => {
    return prisma.notification.count({
        where: { userId: actor.id, readAt: null },
    });
};

// --------------------------------------------------
// Mark one read
// --------------------------------------------------

export const markNotificationRead = async (
    actor: ScopeUser,
    notificationId: string,
): Promise<SafeNotification> => {
    const row = await prisma.notification.findUnique({
        where: { id: notificationId },
    });

    if (!row) throw NotFoundError('Notification not found');

    // Scope: users can only mark their own notifications
    if (row.userId !== actor.id) {
        throw NotFoundError('Notification not found');
    }

    // Idempotent: if already read, return as-is
    if (row.readAt !== null) {
        return toSafe(row);
    }

    const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
    });

    logger.info(
        { actorId: actor.id, notificationId },
        'notification marked read',
    );

    return toSafe(updated);
};

// --------------------------------------------------
// Mark all read
// --------------------------------------------------

export interface MarkAllReadResult {
    updated: number;
}

export const markAllNotificationsRead = async (
    actor: ScopeUser,
): Promise<MarkAllReadResult> => {
    const result = await prisma.notification.updateMany({
        where: { userId: actor.id, readAt: null },
        data: { readAt: new Date() },
    });

    logger.info(
        { actorId: actor.id, count: result.count },
        'all notifications marked read',
    );

    return { updated: result.count };
};