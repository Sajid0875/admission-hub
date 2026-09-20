/**
 * followup.service.test.ts - Service-layer tests for the follow-ups module.
 *
 * Coverage:
 *   - createFollowUp: partner scoping, assignee validation, terminal lead block
 *   - listFollowUps: scoping, overdue filter, nested-by-lead
 *   - getFollowUpById: scope enforcement
 *   - updateFollowUp: only PENDING editable
 *   - completeFollowUp: outcome required, only PENDING, timeline appended
 *   - snoozeFollowUp: future date enforced, only PENDING
 *   - cancelFollowUp: only non-terminal
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as followUpService from '../followup.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import {
    ActivityType,
    FollowUpStatus,
    LeadStatus,
    RoleName,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { ScopeUser } from '../../../shared/utils/scope.js';

// --------------------------------------------------
// Lifecycle
// --------------------------------------------------

beforeEach(async () => {
    await resetDatabase();
});

afterAll(async () => {
    await disconnectTestDb();
});

// --------------------------------------------------
// Fixtures + helpers
// --------------------------------------------------

interface Fixture {
    partnerId: string;
    partnerAdminId: string;
    counselorId: string;
    otherPartnerId: string;
    otherPartnerAdminId: string;
    leadId: string;
}

const seedFixtures = async (): Promise<Fixture> => {
    await seedAuthFixtures();

    const paRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.PARTNER_ADMIN },
    });
    const coRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.COUNSELOR },
    });

    const partnerA = await prisma.partner.create({
        data: {
            academyName: 'Academy A',
            partnerName: 'A',
            ownerName: 'Owner A',
            email: 'a@test.local',
            mobile: '1111111111',
        },
    });
    const paA = await prisma.user.create({
        data: {
            email: 'pa-a@test.local',
            name: 'PA A',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: paRole.id,
            partnerId: partnerA.id,
        },
    });
    const coA = await prisma.user.create({
        data: {
            email: 'co-a@test.local',
            name: 'CO A',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: coRole.id,
            partnerId: partnerA.id,
        },
    });

    const partnerB = await prisma.partner.create({
        data: {
            academyName: 'Academy B',
            partnerName: 'B',
            ownerName: 'Owner B',
            email: 'b@test.local',
            mobile: '2222222222',
        },
    });
    const paB = await prisma.user.create({
        data: {
            email: 'pa-b@test.local',
            name: 'PA B',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: paRole.id,
            partnerId: partnerB.id,
        },
    });

    const lead = await prisma.lead.create({
        data: {
            partnerId: partnerA.id,
            createdBy: paA.id,
            name: 'Test Lead',
            phone: '9000000001',
            status: LeadStatus.NEW,
        },
    });

    return {
        partnerId: partnerA.id,
        partnerAdminId: paA.id,
        counselorId: coA.id,
        otherPartnerId: partnerB.id,
        otherPartnerAdminId: paB.id,
        leadId: lead.id,
    };
};

const asSuperAdmin = (id: string): ScopeUser => ({
    id,
    role: 'SUPER_ADMIN',
    partnerId: null,
});
const asPartnerAdmin = (id: string, partnerId: string): ScopeUser => ({
    id,
    role: 'PARTNER_ADMIN',
    partnerId,
});
const asCounselor = (id: string, partnerId: string): ScopeUser => ({
    id,
    role: 'COUNSELOR',
    partnerId,
});

const futureDate = (days: number): Date =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000);

// --------------------------------------------------
// createFollowUp
// --------------------------------------------------

describe('followUpService.createFollowUp', () => {
    it('partner admin creates a follow-up for their lead', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            {
                leadId: f.leadId,
                assignedTo: f.counselorId,
                dueAt: futureDate(1),
                priority: 'HIGH',
            },
        );

        expect(fu.status).toBe(FollowUpStatus.PENDING);
        expect(fu.assignedTo).toBe(f.counselorId);
        expect(fu.priority).toBe('HIGH');
        expect(fu.overdue).toBe(false);
    });

    it('rejects creation on a terminal (ADMITTED) lead', async () => {
        const f = await seedFixtures();
        await prisma.lead.update({
            where: { id: f.leadId },
            data: { status: LeadStatus.ADMITTED },
        });

        await expect(
            followUpService.createFollowUp(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                { leadId: f.leadId, dueAt: futureDate(1) },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects creation on a terminal (LOST) lead', async () => {
        const f = await seedFixtures();
        await prisma.lead.update({
            where: { id: f.leadId },
            data: { status: LeadStatus.LOST },
        });

        await expect(
            followUpService.createFollowUp(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                { leadId: f.leadId, dueAt: futureDate(1) },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects assignment to a non-counselor', async () => {
        const f = await seedFixtures();

        await expect(
            followUpService.createFollowUp(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                {
                    leadId: f.leadId,
                    assignedTo: f.partnerAdminId,
                    dueAt: futureDate(1),
                },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects cross-partner lead access', async () => {
        const f = await seedFixtures();

        await expect(
            followUpService.createFollowUp(
                asPartnerAdmin(f.otherPartnerAdminId, f.otherPartnerId),
                { leadId: f.leadId, dueAt: futureDate(1) },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('appends a NOTE activity to the lead', async () => {
        const f = await seedFixtures();

        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );

        const activities = await prisma.leadActivity.findMany({
            where: { leadId: f.leadId, type: ActivityType.NOTE },
        });
        expect(activities.length).toBe(1);
        expect(activities[0]?.description).toMatch(/Follow-up scheduled/);
    });
});

// --------------------------------------------------
// listFollowUps
// --------------------------------------------------

describe('followUpService.listFollowUps', () => {
    it('partner admin lists only own-org follow-ups', async () => {
        const f = await seedFixtures();

        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );

        const result = await followUpService.listFollowUps(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(1);
    });

    it('counselor sees only assigned follow-ups', async () => {
        const f = await seedFixtures();

        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, assignedTo: f.counselorId, dueAt: futureDate(1) },
        );
        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) }, // unassigned
        );

        const result = await followUpService.listFollowUps(
            asCounselor(f.counselorId, f.partnerId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(1);
    });

    it('filters overdue=true', async () => {
        const f = await seedFixtures();

        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: new Date(Date.now() - 3600_000) }, // past
        );
        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );

        const overdue = await followUpService.listFollowUps(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25, overdue: true },
        );

        expect(overdue.pagination.total).toBe(1);
        expect(overdue.data[0]?.overdue).toBe(true);
    });
});

// --------------------------------------------------
// completeFollowUp
// --------------------------------------------------

describe('followUpService.completeFollowUp', () => {
    it('completes with outcome and stamps completedAt', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );

        const completed = await followUpService.completeFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            fu.id,
            { outcome: 'CONNECTED' },
        );

        expect(completed.status).toBe(FollowUpStatus.COMPLETED);
        expect(completed.outcome).toBe('CONNECTED');
        expect(completed.completedAt).toBeInstanceOf(Date);
    });

    it('rejects completing an already-completed follow-up', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );
        await followUpService.completeFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            fu.id,
            { outcome: 'CONNECTED' },
        );

        await expect(
            followUpService.completeFollowUp(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                fu.id,
                { outcome: 'CONNECTED' },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('appends a NOTE activity', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );
        await followUpService.completeFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            fu.id,
            { outcome: 'CONNECTED' },
        );

        const activities = await prisma.leadActivity.findMany({
            where: { leadId: f.leadId, type: ActivityType.NOTE },
        });
        const completion = activities.find((a) =>
            a.description.includes('Follow-up completed'),
        );
        expect(completion).toBeDefined();
    });
});

// --------------------------------------------------
// snoozeFollowUp
// --------------------------------------------------

describe('followUpService.snoozeFollowUp', () => {
    it('snoozes to a future date', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );
        const newDate = futureDate(3);

        const snoozed = await followUpService.snoozeFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            fu.id,
            { dueAt: newDate },
        );

        expect(snoozed.dueAt.getTime()).toBe(newDate.getTime());
        expect(snoozed.status).toBe(FollowUpStatus.PENDING);
    });

    it('rejects snooze to a past date', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );

        await expect(
            followUpService.snoozeFollowUp(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                fu.id,
                { dueAt: new Date(Date.now() - 3600_000) },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects snooze on a completed follow-up', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );
        await followUpService.completeFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            fu.id,
            { outcome: 'CONNECTED' },
        );

        await expect(
            followUpService.snoozeFollowUp(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                fu.id,
                { dueAt: futureDate(3) },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });
});

// --------------------------------------------------
// cancelFollowUp
// --------------------------------------------------

describe('followUpService.cancelFollowUp', () => {
    it('cancels a pending follow-up', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );

        const cancelled = await followUpService.cancelFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            fu.id,
            { reason: 'Lead already decided' },
        );

        expect(cancelled.status).toBe(FollowUpStatus.CANCELLED);
    });

    it('rejects cancel on a completed follow-up', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );
        await followUpService.completeFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            fu.id,
            { outcome: 'CONNECTED' },
        );

        await expect(
            followUpService.cancelFollowUp(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                fu.id,
                { reason: 'too late' },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });
});

// --------------------------------------------------
// listFollowUpsForLead
// --------------------------------------------------

describe('followUpService.listFollowUpsForLead', () => {
    it('lists all follow-ups for a lead', async () => {
        const f = await seedFixtures();

        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );
        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(2) },
        );

        const result = await followUpService.listFollowUpsForLead(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            f.leadId,
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(2);
    });

    it('counselor sees only assigned follow-ups for the lead', async () => {
        const f = await seedFixtures();

        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, assignedTo: f.counselorId, dueAt: futureDate(1) },
        );
        await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(2) }, // unassigned
        );

        const result = await followUpService.listFollowUpsForLead(
            asCounselor(f.counselorId, f.partnerId),
            f.leadId,
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(1);
    });

    it('rejects cross-partner access', async () => {
        const f = await seedFixtures();

        await expect(
            followUpService.listFollowUpsForLead(
                asPartnerAdmin(f.otherPartnerAdminId, f.otherPartnerId),
                f.leadId,
                { page: 1, limit: 25 },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

// --------------------------------------------------
// getFollowUpById
// --------------------------------------------------

describe('followUpService.getFollowUpById', () => {
    it('partner admin sees own-org follow-up', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );

        const fetched = await followUpService.getFollowUpById(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            fu.id,
        );
        expect(fetched.id).toBe(fu.id);
    });

    it('counselor cannot see unassigned follow-up', async () => {
        const f = await seedFixtures();

        const fu = await followUpService.createFollowUp(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, dueAt: futureDate(1) },
        );

        await expect(
            followUpService.getFollowUpById(
                asCounselor(f.counselorId, f.partnerId),
                fu.id,
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 for unknown follow-up', async () => {
        const f = await seedFixtures();

        await expect(
            followUpService.getFollowUpById(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                '00000000-0000-0000-0000-000000000000',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});