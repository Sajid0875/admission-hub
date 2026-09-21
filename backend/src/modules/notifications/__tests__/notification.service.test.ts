/**
 * notification.service.test.ts - Service-layer tests for notifications.
 *
 * Coverage:
 *   - listNotifications: scoped to own user only; filters; unreadCount
 *   - getUnreadCount: only current user's unread
 *   - markNotificationRead: idempotent, cross-user blocked with 404
 *   - markAllNotificationsRead: bulk scoped to own user only
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as notificationService from '../notification.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import { RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { ScopeUser } from '../../../shared/utils/scope.js';

beforeEach(async () => {
    await resetDatabase();
});

afterAll(async () => {
    await disconnectTestDb();
});

// --------------------------------------------------
// Fixture
// --------------------------------------------------

const seedFx = async (): Promise<{
    superAdminId: string;
    otherUserId: string;
    superNotifId: string;
    superUnreadId: string;
    otherNotifId: string;
}> => {
    await seedAuthFixtures();

    const paRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.PARTNER_ADMIN },
    });

    const partner = await prisma.partner.create({
        data: {
            academyName: 'Test Academy',
            partnerName: 'TA',
            ownerName: 'Owner',
            email: 'ta@test.local',
            mobile: '1111111111',
        },
    });
    const other = await prisma.user.create({
        data: {
            email: 'other@test.local',
            name: 'Other',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: paRole.id,
            partnerId: partner.id,
        },
    });

    const superUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test-super-admin@admission-hub.test' },
    });

    // Notifications for super
    const n1 = await prisma.notification.create({
        data: {
            userId: superUser.id,
            type: 'lead_assigned',
            title: 'New lead assigned',
            message: 'A lead was assigned to you',
        },
    });
    const n2 = await prisma.notification.create({
        data: {
            userId: superUser.id,
            type: 'commission_paid',
            title: 'Commission paid',
            message: 'Your commission was paid',
            readAt: new Date(), // already read
        },
    });

    // Notification for other user
    const n3 = await prisma.notification.create({
        data: {
            userId: other.id,
            type: 'admission_verified',
            title: 'Admission verified',
            message: 'A student admission was verified',
        },
    });

    return {
        superAdminId: superUser.id,
        otherUserId: other.id,
        superNotifId: n1.id,
        superUnreadId: n2.id,
        otherNotifId: n3.id,
    };
};

const asUser = (id: string): ScopeUser => ({
    id,
    role: 'SUPER_ADMIN',
    partnerId: null,
});

// --------------------------------------------------
// listNotifications
// --------------------------------------------------

describe('notificationService.listNotifications', () => {
    it('returns only own notifications', async () => {
        const f = await seedFx();

        const result = await notificationService.listNotifications(
            asUser(f.superAdminId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(2);
        expect(result.data.every((n) => n.userId === f.superAdminId)).toBe(true);
    });

    it('returns unreadCount scoped to own user', async () => {
        const f = await seedFx();

        const result = await notificationService.listNotifications(
            asUser(f.superAdminId),
            { page: 1, limit: 25 },
        );

        expect(result.unreadCount).toBe(1); // only n1 is unread
    });

    it('other user sees only their own notification', async () => {
        const f = await seedFx();

        const result = await notificationService.listNotifications(
            asUser(f.otherUserId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.userId).toBe(f.otherUserId);
    });

    it('filters by read=true', async () => {
        const f = await seedFx();

        const result = await notificationService.listNotifications(
            asUser(f.superAdminId),
            { page: 1, limit: 25, read: true },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.id).toBe(f.superUnreadId);
    });

    it('filters by read=false', async () => {
        const f = await seedFx();

        const result = await notificationService.listNotifications(
            asUser(f.superAdminId),
            { page: 1, limit: 25, read: false },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.id).toBe(f.superNotifId);
    });

    it('filters by type', async () => {
        const f = await seedFx();

        const result = await notificationService.listNotifications(
            asUser(f.superAdminId),
            { page: 1, limit: 25, type: 'lead_assigned' },
        );

        expect(result.pagination.total).toBe(1);
    });
});

// --------------------------------------------------
// getUnreadCount
// --------------------------------------------------

describe('notificationService.getUnreadCount', () => {
    it('returns count scoped to own user', async () => {
        const f = await seedFx();

        const count = await notificationService.getUnreadCount(
            asUser(f.superAdminId),
        );
        expect(count).toBe(1);

        const otherCount = await notificationService.getUnreadCount(
            asUser(f.otherUserId),
        );
        expect(otherCount).toBe(1);
    });
});

// --------------------------------------------------
// markNotificationRead
// --------------------------------------------------

describe('notificationService.markNotificationRead', () => {
    it('marks unread notification read and stamps readAt', async () => {
        const f = await seedFx();

        const updated = await notificationService.markNotificationRead(
            asUser(f.superAdminId),
            f.superNotifId,
        );

        expect(updated.readAt).toBeInstanceOf(Date);
    });

    it('is idempotent for already-read notification', async () => {
        const f = await seedFx();

        const updated = await notificationService.markNotificationRead(
            asUser(f.superAdminId),
            f.superUnreadId,
        );

        // Already had a readAt set; unchanged but returns valid object
        expect(updated.readAt).toBeInstanceOf(Date);
    });

    it('cross-user access returns 404', async () => {
        const f = await seedFx();

        await expect(
            notificationService.markNotificationRead(
                asUser(f.superAdminId),
                f.otherNotifId,
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('unknown id returns 404', async () => {
        const f = await seedFx();

        await expect(
            notificationService.markNotificationRead(
                asUser(f.superAdminId),
                '00000000-0000-0000-0000-000000000000',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

// --------------------------------------------------
// markAllNotificationsRead
// --------------------------------------------------

describe('notificationService.markAllNotificationsRead', () => {
    it('marks all unread notifications for current user', async () => {
        const f = await seedFx();

        const result = await notificationService.markAllNotificationsRead(
            asUser(f.superAdminId),
        );

        expect(result.updated).toBe(1);

        const remaining = await notificationService.getUnreadCount(
            asUser(f.superAdminId),
        );
        expect(remaining).toBe(0);
    });

    it('does not affect other users notifications', async () => {
        const f = await seedFx();

        await notificationService.markAllNotificationsRead(
            asUser(f.superAdminId),
        );

        const otherUnread = await notificationService.getUnreadCount(
            asUser(f.otherUserId),
        );
        expect(otherUnread).toBe(1); // still unread
    });

    it('returns 0 when nothing to mark', async () => {
        const f = await seedFx();

        // First call marks all for super
        await notificationService.markAllNotificationsRead(
            asUser(f.superAdminId),
        );
        // Second call has nothing to do
        const result = await notificationService.markAllNotificationsRead(
            asUser(f.superAdminId),
        );
        expect(result.updated).toBe(0);
    });
});