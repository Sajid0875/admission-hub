/**
 * followupReminders.test.ts - Reminder scanner idempotency + notify wiring.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../tests/helpers/test-db.js';
import { prisma } from '../../config/prisma.js';
import {
    FollowUpStatus,
    LeadPriority,
    LeadStatus,
    RoleName,
} from '@prisma/client';
import { runFollowUpRemindersOnce } from '../followupReminders.js';
import { NotificationType } from '../../shared/utils/notify.js';
import { env } from '../../config/env.js';

beforeEach(async () => {
    await resetDatabase();
});

afterAll(async () => {
    await disconnectTestDb();
});

describe('runFollowUpRemindersOnce', () => {
    it('no-ops when reminders are disabled', async () => {
        // Verifies: test env keeps FOLLOWUP_REMINDERS_ENABLED=false so scanners stay quiet.
        expect(env.FOLLOWUP_REMINDERS_ENABLED).toBe(false);
        const summary = await runFollowUpRemindersOnce();
        expect(summary.scanned).toBe(0);
        expect(summary.dueSoonNotified).toBe(0);
        expect(summary.overdueNotified).toBe(0);
    });

    it('notifies overdue follow-ups once when enabled', async () => {
        // Verifies happy path + idempotency for FOLLOWUP_OVERDUE notifications.
        await seedAuthFixtures();

        const paRole = await prisma.role.findUniqueOrThrow({
            where: { name: RoleName.PARTNER_ADMIN },
        });
        const coRole = await prisma.role.findUniqueOrThrow({
            where: { name: RoleName.COUNSELOR },
        });

        const partner = await prisma.partner.create({
            data: {
                academyName: 'Reminder Academy',
                partnerName: 'Reminder Partner',
                ownerName: 'Owner',
                email: 'reminder-partner@test.local',
                mobile: '9111111111',
            },
        });

        const partnerAdmin = await prisma.user.create({
            data: {
                email: 'reminder-pa@test.local',
                name: 'Reminder PA',
                passwordHash: await bcrypt.hash('x', 10),
                roleId: paRole.id,
                partnerId: partner.id,
            },
        });

        const counselor = await prisma.user.create({
            data: {
                email: 'reminder-co@test.local',
                name: 'Reminder CO',
                passwordHash: await bcrypt.hash('x', 10),
                roleId: coRole.id,
                partnerId: partner.id,
                phone: '+919888877766',
            },
        });

        const lead = await prisma.lead.create({
            data: {
                partnerId: partner.id,
                createdBy: partnerAdmin.id,
                assignedTo: counselor.id,
                name: 'Reminder Lead',
                phone: '+919999000011',
                whatsapp: '+919999000011',
                status: LeadStatus.CONTACTED,
                priority: LeadPriority.HIGH,
            },
        });

        const followUp = await prisma.followUp.create({
            data: {
                leadId: lead.id,
                assignedTo: counselor.id,
                dueAt: new Date(Date.now() - 60_000),
                status: FollowUpStatus.PENDING,
                priority: LeadPriority.HIGH,
                notes: 'overdue test',
            },
        });

        const first = await runFollowUpRemindersOnce({ enabled: true });
        expect(first.scanned).toBeGreaterThanOrEqual(1);
        expect(first.overdueNotified).toBe(1);

        const notes = await prisma.notification.findMany({
            where: {
                referenceId: followUp.id,
                type: NotificationType.FOLLOWUP_OVERDUE,
            },
        });
        expect(notes).toHaveLength(1);

        // Second pass must not create a duplicate notification.
        const second = await runFollowUpRemindersOnce({ enabled: true });
        expect(second.overdueNotified).toBe(0);

        const notesAfter = await prisma.notification.count({
            where: {
                referenceId: followUp.id,
                type: NotificationType.FOLLOWUP_OVERDUE,
            },
        });
        expect(notesAfter).toBe(1);
    });
});
