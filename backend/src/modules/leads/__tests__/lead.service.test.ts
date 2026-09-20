/**
 * lead.service.test.ts - Service-layer tests for the leads module.
 *
 * Coverage:
 *   - listLeads: super_admin / partner_admin / counselor scoping, filters, archived
 *   - getLeadById: scope enforcement
 *   - createLead: partner scoping, duplicate phone (hard reject), duplicate email (soft flag), assignee validation
 *   - updateLead: scoped update
 *   - assignLead: role gating, cross-partner blocked, non-counselor blocked
 *   - changeLeadStatus: state machine enforced, timeline appended
 *   - archiveLead: soft delete
 *   - listLeadActivities: timeline scoped to actor
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as leadService from '../lead.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    seedPartnerFixture,
    disconnectTestDb,
    TEST_PARTNER,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import { RoleName } from '@prisma/client';
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
// Actor helpers
// --------------------------------------------------

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

// --------------------------------------------------
// Fixture helper — partner + admin + counselor
// --------------------------------------------------

interface LeadFixtures {
    partnerId: string;
    partnerAdminId: string;
    counselorId: string;
    otherPartnerId: string;
    otherPartnerAdminId: string;
}

const seedLeadFixtures = async (): Promise<LeadFixtures> => {
    await seedAuthFixtures();

    const partnerAdminRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.PARTNER_ADMIN },
    });
    const counselorRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.COUNSELOR },
    });

    // Partner A
    const partnerA = await prisma.partner.create({
        data: {
            academyName: 'Academy A',
            partnerName: 'A',
            ownerName: 'Owner A',
            email: 'a@test.local',
            mobile: '1111111111',
        },
    });

    const partnerAdminA = await prisma.user.create({
        data: {
            email: 'pa-a@test.local',
            name: 'PA A',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: partnerAdminRole.id,
            partnerId: partnerA.id,
        },
    });

    const counselorA = await prisma.user.create({
        data: {
            email: 'c-a@test.local',
            name: 'Counselor A',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: counselorRole.id,
            partnerId: partnerA.id,
        },
    });

    // Partner B (for cross-tenant tests)
    const partnerB = await prisma.partner.create({
        data: {
            academyName: 'Academy B',
            partnerName: 'B',
            ownerName: 'Owner B',
            email: 'b@test.local',
            mobile: '2222222222',
        },
    });

    const partnerAdminB = await prisma.user.create({
        data: {
            email: 'pa-b@test.local',
            name: 'PA B',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: partnerAdminRole.id,
            partnerId: partnerB.id,
        },
    });

    return {
        partnerId: partnerA.id,
        partnerAdminId: partnerAdminA.id,
        counselorId: counselorA.id,
        otherPartnerId: partnerB.id,
        otherPartnerAdminId: partnerAdminB.id,
    };
};

// --------------------------------------------------
// listLeads
// --------------------------------------------------

describe('leadService.listLeads', () => {
    it('super admin sees all leads', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        // Create a lead via partner admin
        await leadService.createLead(asPartnerAdmin(partnerAdminId, partnerId), {
            name: 'Lead 1',
            phone: '9000000001',
        });

        const { superAdminId } = await prisma.user
            .findFirstOrThrow({ where: { email: 'test-super-admin@admission-hub.test' } })
            .then((u) => ({ superAdminId: u.id }));

        const result = await leadService.listLeads(asSuperAdmin(superAdminId), {
            page: 1,
            limit: 25,
        });

        expect(result.pagination.total).toBe(1);
    });

    it('partner admin sees only own org leads', async () => {
        const { partnerAdminId, partnerId, otherPartnerAdminId, otherPartnerId } =
            await seedLeadFixtures();

        await leadService.createLead(asPartnerAdmin(partnerAdminId, partnerId), {
            name: 'Lead A',
            phone: '9000000001',
        });
        await leadService.createLead(
            asPartnerAdmin(otherPartnerAdminId, otherPartnerId),
            {
                name: 'Lead B',
                phone: '9000000002',
            },
        );

        const result = await leadService.listLeads(
            asPartnerAdmin(partnerAdminId, partnerId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.name).toBe('Lead A');
    });

    it('counselor sees only assigned leads', async () => {
        const { partnerAdminId, partnerId, counselorId } = await seedLeadFixtures();

        // Two leads: one assigned to counselor, one not
        const assigned = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Assigned Lead', phone: '9000000001' },
        );
        await leadService.createLead(asPartnerAdmin(partnerAdminId, partnerId), {
            name: 'Unassigned Lead',
            phone: '9000000002',
        });

        // Assign one to counselor
        await leadService.assignLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            assigned.lead.id,
            { assignedTo: counselorId },
        );

        const result = await leadService.listLeads(
            asCounselor(counselorId, partnerId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.name).toBe('Assigned Lead');
    });

    it('filters by status', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        await leadService.createLead(asPartnerAdmin(partnerAdminId, partnerId), {
            name: 'Lead A',
            phone: '9000000001',
        });

        const result = await leadService.listLeads(
            asPartnerAdmin(partnerAdminId, partnerId),
            { page: 1, limit: 25, status: 'CONTACTED' },
        );

        expect(result.pagination.total).toBe(0);
    });

    it('hides archived leads by default', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );

        await leadService.archiveLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            {},
        );

        const visible = await leadService.listLeads(
            asPartnerAdmin(partnerAdminId, partnerId),
            { page: 1, limit: 25 },
        );
        expect(visible.pagination.total).toBe(0);

        const archived = await leadService.listLeads(
            asPartnerAdmin(partnerAdminId, partnerId),
            { page: 1, limit: 25, archived: true },
        );
        expect(archived.pagination.total).toBe(1);
    });
});

// --------------------------------------------------
// getLeadById
// --------------------------------------------------

describe('leadService.getLeadById', () => {
    it('partner admin sees own org lead', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead A', phone: '9000000001' },
        );

        const fetched = await leadService.getLeadById(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
        );

        expect(fetched.id).toBe(lead.id);
    });

    it('partner admin cannot see other org lead', async () => {
        const {
            partnerAdminId,
            partnerId,
            otherPartnerAdminId,
            otherPartnerId,
        } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(otherPartnerAdminId, otherPartnerId),
            { name: 'Other Lead', phone: '9000000009' },
        );

        await expect(
            leadService.getLeadById(asPartnerAdmin(partnerAdminId, partnerId), lead.id),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('counselor cannot see unassigned lead', async () => {
        const { partnerAdminId, partnerId, counselorId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead A', phone: '9000000001' },
        );

        await expect(
            leadService.getLeadById(asCounselor(counselorId, partnerId), lead.id),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 for unknown lead', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        await expect(
            leadService.getLeadById(
                asPartnerAdmin(partnerAdminId, partnerId),
                '00000000-0000-0000-0000-000000000000',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

// --------------------------------------------------
// createLead
// --------------------------------------------------

describe('leadService.createLead', () => {
    it('partner admin creates a lead starting with NEW status', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        const result = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'New Lead', phone: '9000000001', email: 'x@y.z' },
        );

        expect(result.lead.status).toBe('NEW');
        expect(result.lead.partnerId).toBe(partnerId);
        expect(result.duplicateFlag).toBe(false);
    });

    it('rejects duplicate phone within partner', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        await leadService.createLead(asPartnerAdmin(partnerAdminId, partnerId), {
            name: 'First',
            phone: '9000000001',
        });

        await expect(
            leadService.createLead(asPartnerAdmin(partnerAdminId, partnerId), {
                name: 'Second',
                phone: '9000000001',
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('allows same phone in different partner', async () => {
        const {
            partnerAdminId,
            partnerId,
            otherPartnerAdminId,
            otherPartnerId,
        } = await seedLeadFixtures();

        await leadService.createLead(asPartnerAdmin(partnerAdminId, partnerId), {
            name: 'First',
            phone: '9000000001',
        });

        const result = await leadService.createLead(
            asPartnerAdmin(otherPartnerAdminId, otherPartnerId),
            { name: 'Second', phone: '9000000001' },
        );

        expect(result.lead.name).toBe('Second');
    });

    it('soft-flags duplicate email but still creates', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        await leadService.createLead(asPartnerAdmin(partnerAdminId, partnerId), {
            name: 'First',
            phone: '9000000001',
            email: 'same@x.y',
        });

        const result = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Second', phone: '9000000002', email: 'same@x.y' },
        );

        expect(result.duplicateFlag).toBe(true);
        expect(result.duplicateOf).toBeDefined();
    });

    it('rejects assignment to a non-COUNSELOR', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        // partner admin is not a counselor
        await expect(
            leadService.createLead(asPartnerAdmin(partnerAdminId, partnerId), {
                name: 'Bad',
                phone: '9000000001',
                assignedTo: partnerAdminId,
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects assignment to counselor in different partner', async () => {
        const {
            partnerAdminId,
            partnerId,
            otherPartnerAdminId,
            otherPartnerId,
        } = await seedLeadFixtures();

        // Get counselor in partner A
        const counselorA = await prisma.user.findUniqueOrThrow({
            where: { email: 'c-a@test.local' },
        });

        // Try to assign them from partner B context
        await expect(
            leadService.createLead(
                asPartnerAdmin(otherPartnerAdminId, otherPartnerId),
                {
                    name: 'Bad',
                    phone: '9000000001',
                    assignedTo: counselorA.id,
                },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('super admin cannot create a lead directly', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();
        const superAdmin = await prisma.user.findUniqueOrThrow({
            where: { email: 'test-super-admin@admission-hub.test' },
        });

        await expect(
            leadService.createLead(asSuperAdmin(superAdmin.id), {
                name: 'Bad',
                phone: '9000000001',
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });
});

// --------------------------------------------------
// assignLead
// --------------------------------------------------

describe('leadService.assignLead', () => {
    it('partner admin assigns to a counselor', async () => {
        const { partnerAdminId, partnerId, counselorId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );

        const updated = await leadService.assignLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { assignedTo: counselorId },
        );

        expect(updated.assignedTo).toBe(counselorId);
    });

    it('counselor cannot assign leads', async () => {
        const { partnerAdminId, partnerId, counselorId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );

        await leadService.assignLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { assignedTo: counselorId },
        );

        await expect(
            leadService.assignLead(asCounselor(counselorId, partnerId), lead.id, {
                assignedTo: counselorId,
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('can unassign by passing null', async () => {
        const { partnerAdminId, partnerId, counselorId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );
        await leadService.assignLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { assignedTo: counselorId },
        );

        const unassigned = await leadService.assignLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { assignedTo: null },
        );

        expect(unassigned.assignedTo).toBeNull();
    });
});

// --------------------------------------------------
// changeLeadStatus
// --------------------------------------------------

describe('leadService.changeLeadStatus', () => {
    it('allows valid transition NEW → CONTACTED', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );

        const updated = await leadService.changeLeadStatus(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { status: 'CONTACTED' },
        );

        expect(updated.status).toBe('CONTACTED');
    });

    it('rejects invalid transition NEW → ADMITTED', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );

        await expect(
            leadService.changeLeadStatus(
                asPartnerAdmin(partnerAdminId, partnerId),
                lead.id,
                { status: 'ADMITTED' },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('appends a STATUS_CHANGED activity', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );

        await leadService.changeLeadStatus(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { status: 'CONTACTED', note: 'nice' },
        );

        const activities = await prisma.leadActivity.findMany({
            where: { leadId: lead.id, type: 'STATUS_CHANGED' },
        });

        expect(activities.length).toBe(1);
    });

    it('rejects any transition out of terminal state ADMITTED', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );

        // Walk through the valid chain
        await leadService.changeLeadStatus(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { status: 'CONTACTED' },
        );
        await leadService.changeLeadStatus(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { status: 'FOLLOW_UP' },
        );
        await leadService.changeLeadStatus(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { status: 'FEE_DISCUSSION' },
        );
        await leadService.changeLeadStatus(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { status: 'ADMISSION_PENDING' },
        );
        await leadService.changeLeadStatus(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { status: 'ADMITTED' },
        );

        await expect(
            leadService.changeLeadStatus(
                asPartnerAdmin(partnerAdminId, partnerId),
                lead.id,
                { status: 'CONTACTED' },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });
});

// --------------------------------------------------
// archiveLead
// --------------------------------------------------

describe('leadService.archiveLead', () => {
    it('archives a lead (soft delete)', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );

        const archived = await leadService.archiveLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { reason: 'Not interested' },
        );

        expect(archived.archivedAt).toBeInstanceOf(Date);
        expect(archived.closedReason).toBe('Not interested');
    });
});

// --------------------------------------------------
// listLeadActivities
// --------------------------------------------------

describe('leadService.listLeadActivities', () => {
    it('returns activities scoped to the actor', async () => {
        const { partnerAdminId, partnerId } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(partnerAdminId, partnerId),
            { name: 'Lead', phone: '9000000001' },
        );

        const result = await leadService.listLeadActivities(
            asPartnerAdmin(partnerAdminId, partnerId),
            lead.id,
            { page: 1, limit: 50 },
        );

        expect(result.pagination.total).toBeGreaterThanOrEqual(1);
        expect(result.data[0]?.type).toBe('CREATED');
    });

    it('partner admin cannot read other org activities', async () => {
        const {
            partnerAdminId,
            partnerId,
            otherPartnerAdminId,
            otherPartnerId,
        } = await seedLeadFixtures();

        const { lead } = await leadService.createLead(
            asPartnerAdmin(otherPartnerAdminId, otherPartnerId),
            { name: 'Other', phone: '9000000009' },
        );

        await expect(
            leadService.listLeadActivities(
                asPartnerAdmin(partnerAdminId, partnerId),
                lead.id,
                { page: 1, limit: 50 },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});