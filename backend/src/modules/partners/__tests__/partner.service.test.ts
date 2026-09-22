/**
 * partner.service.test.ts - Service-layer tests for the partners module.
 *
 * Coverage:
 *   - listPartners: super_admin only; filters, pagination, search
 *   - getPartnerById: super_admin sees any; partner_admin sees own only; suspended/pending blocked for partner_admin
 *   - createPartner: super_admin creates; starts PENDING; duplicate email → 409
 *   - updatePartner: super_admin only; profile fields
 *   - changePartnerStatus: valid transitions; invalid transitions blocked; approval metadata stamped
 *
 * Uses the real test DB (admission_hub_test), reset before each test.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as partnerService from '../partner.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    seedPartnerFixture,
    disconnectTestDb,
    TEST_PARTNER,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
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

// --------------------------------------------------
// listPartners
// --------------------------------------------------

describe('partnerService.listPartners', () => {
    it('super admin sees all partners', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId } = await seedPartnerFixture();

        const result = await partnerService.listPartners(asSuperAdmin(superAdminId), {
            page: 1,
            limit: 25,
        });

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.id).toBe(partnerId);
    });

    it('partner admin cannot call listPartners', async () => {
        await seedAuthFixtures();
        const { partnerAdminId, partnerId } = await seedPartnerFixture();

        await expect(
            partnerService.listPartners(asPartnerAdmin(partnerAdminId, partnerId), {
                page: 1,
                limit: 25,
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('filters by status', async () => {
        const { superAdminId } = await seedAuthFixtures();
        await seedPartnerFixture(); // creates an ACTIVE partner

        const active = await partnerService.listPartners(asSuperAdmin(superAdminId), {
            page: 1,
            limit: 25,
            status: 'ACTIVE',
        });
        expect(active.pagination.total).toBe(1);

        const pending = await partnerService.listPartners(asSuperAdmin(superAdminId), {
            page: 1,
            limit: 25,
            status: 'PENDING',
        });
        expect(pending.pagination.total).toBe(0);
    });

    it('search matches academyName', async () => {
        const { superAdminId } = await seedAuthFixtures();
        await seedPartnerFixture();

        const result = await partnerService.listPartners(asSuperAdmin(superAdminId), {
            page: 1,
            limit: 25,
            search: 'Test Academy',
        });

        expect(result.pagination.total).toBe(1);
    });

    it('search returns nothing for unmatched query', async () => {
        const { superAdminId } = await seedAuthFixtures();
        await seedPartnerFixture();

        const result = await partnerService.listPartners(asSuperAdmin(superAdminId), {
            page: 1,
            limit: 25,
            search: 'DoesNotExist',
        });

        expect(result.pagination.total).toBe(0);
    });

    it('paginates correctly', async () => {
        const { superAdminId } = await seedAuthFixtures();
        await seedPartnerFixture();

        // Create 2 more partners
        await prisma.partner.create({
            data: {
                academyName: 'P2',
                partnerName: 'P2',
                ownerName: 'O2',
                email: 'p2@test.local',
                mobile: '1111111111',
            },
        });
        await prisma.partner.create({
            data: {
                academyName: 'P3',
                partnerName: 'P3',
                ownerName: 'O3',
                email: 'p3@test.local',
                mobile: '2222222222',
            },
        });

        const page1 = await partnerService.listPartners(asSuperAdmin(superAdminId), {
            page: 1,
            limit: 2,
        });

        expect(page1.data.length).toBe(2);
        expect(page1.pagination.total).toBe(3);
        expect(page1.pagination.totalPages).toBe(2);
    });
});

// --------------------------------------------------
// getPartnerById
// --------------------------------------------------

describe('partnerService.getPartnerById', () => {
    it('super admin can fetch any partner', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId } = await seedPartnerFixture();

        const partner = await partnerService.getPartnerById(
            asSuperAdmin(superAdminId),
            partnerId,
        );

        expect(partner.id).toBe(partnerId);
        expect(partner.status).toBe('ACTIVE');
    });

    it('partner admin can fetch own partner when ACTIVE', async () => {
        await seedAuthFixtures();
        const { partnerAdminId, partnerId } = await seedPartnerFixture();

        const partner = await partnerService.getPartnerById(
            asPartnerAdmin(partnerAdminId, partnerId),
            partnerId,
        );

        expect(partner.id).toBe(partnerId);
    });

    it('partner admin cannot fetch another partner', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId: otherPartnerId } = await seedPartnerFixture();

        await expect(
            partnerService.getPartnerById(
                asPartnerAdmin('fake-id', 'different-partner-id'),
                otherPartnerId,
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('partner admin cannot fetch own partner when status is PENDING', async () => {
        await seedAuthFixtures();
        const { partnerAdminId, partnerId } = await seedPartnerFixture();

        await prisma.partner.update({
            where: { id: partnerId },
            data: { status: 'PENDING' },
        });

        await expect(
            partnerService.getPartnerById(
                asPartnerAdmin(partnerAdminId, partnerId),
                partnerId,
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('super admin can fetch PENDING partner', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId } = await seedPartnerFixture();

        await prisma.partner.update({
            where: { id: partnerId },
            data: { status: 'PENDING' },
        });

        const partner = await partnerService.getPartnerById(
            asSuperAdmin(superAdminId),
            partnerId,
        );

        expect(partner.status).toBe('PENDING');
    });

    it('throws 404 for unknown partner', async () => {
        const { superAdminId } = await seedAuthFixtures();

        await expect(
            partnerService.getPartnerById(
                asSuperAdmin(superAdminId),
                '00000000-0000-0000-0000-000000000000',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

// --------------------------------------------------
// createPartner
// --------------------------------------------------

describe('partnerService.createPartner', () => {
    it('super admin creates a partner with PENDING status', async () => {
        const { superAdminId } = await seedAuthFixtures();

        const partner = await partnerService.createPartner(asSuperAdmin(superAdminId), {
            academyName: 'New Academy',
            partnerName: 'New',
            ownerName: 'New Owner',
            email: 'new@partner.test',
            mobile: '1111111111',
        });

        expect(partner.status).toBe('PENDING');
        expect(partner.email).toBe('new@partner.test');
        expect(partner.approvedAt).toBeNull();
        expect(partner.approvedBy).toBeNull();
    });

    it('partner admin cannot create partners', async () => {
        await seedAuthFixtures();
        const { partnerAdminId, partnerId } = await seedPartnerFixture();

        await expect(
            partnerService.createPartner(asPartnerAdmin(partnerAdminId, partnerId), {
                academyName: 'Sneaky',
                partnerName: 'Sneaky',
                ownerName: 'Sneaky',
                email: 'sneaky@partner.test',
                mobile: '1111111111',
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects duplicate email with 409', async () => {
        const { superAdminId } = await seedAuthFixtures();
        await seedPartnerFixture();

        await expect(
            partnerService.createPartner(asSuperAdmin(superAdminId), {
                academyName: 'Duplicate',
                partnerName: 'Duplicate',
                ownerName: 'Duplicate',
                email: TEST_PARTNER.email,
                mobile: '9999999999',
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('defaults commissionType to PERCENTAGE when not provided', async () => {
        const { superAdminId } = await seedAuthFixtures();

        const partner = await partnerService.createPartner(asSuperAdmin(superAdminId), {
            academyName: 'Defaults Academy',
            partnerName: 'Defaults',
            ownerName: 'Defaults',
            email: 'defaults@partner.test',
            mobile: '1111111111',
        });

        expect(partner.commissionType).toBe('PERCENTAGE');
    });
});

// --------------------------------------------------
// updatePartner
// --------------------------------------------------

describe('partnerService.updatePartner', () => {
    it('super admin can update partner fields', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId } = await seedPartnerFixture();

        const updated = await partnerService.updatePartner(
            asSuperAdmin(superAdminId),
            partnerId,
            { academyName: 'Renamed Academy', mobile: '8888888888' },
        );

        expect(updated.academyName).toBe('Renamed Academy');
        expect(updated.mobile).toBe('8888888888');
    });

    it('partner admin cannot update', async () => {
        await seedAuthFixtures();
        const { partnerAdminId, partnerId } = await seedPartnerFixture();

        await expect(
            partnerService.updatePartner(
                asPartnerAdmin(partnerAdminId, partnerId),
                partnerId,
                { academyName: 'Hacked' },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 for unknown partner', async () => {
        const { superAdminId } = await seedAuthFixtures();

        await expect(
            partnerService.updatePartner(
                asSuperAdmin(superAdminId),
                '00000000-0000-0000-0000-000000000000',
                { academyName: 'Nothing' },
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

// --------------------------------------------------
// changePartnerStatus
// --------------------------------------------------

describe('partnerService.changePartnerStatus', () => {
    it('approving a PENDING partner stamps approval metadata', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId } = await seedPartnerFixture();

        // Reset to PENDING so we can approve
        await prisma.partner.update({
            where: { id: partnerId },
            data: { status: 'PENDING', approvedAt: null, approvedBy: null },
        });

        const updated = await partnerService.changePartnerStatus(
            asSuperAdmin(superAdminId),
            partnerId,
            { status: 'ACTIVE' },
        );

        expect(updated.status).toBe('ACTIVE');
        expect(updated.approvedAt).toBeInstanceOf(Date);
        expect(updated.approvedBy).toBe(superAdminId);
    });

    it('rejects PENDING → SUSPENDED (invalid transition)', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId } = await seedPartnerFixture();

        await prisma.partner.update({
            where: { id: partnerId },
            data: { status: 'PENDING' },
        });

        await expect(
            partnerService.changePartnerStatus(
                asSuperAdmin(superAdminId),
                partnerId,
                { status: 'SUSPENDED' },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects ACTIVE → REJECTED (invalid transition)', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId } = await seedPartnerFixture(); // creates ACTIVE

        await expect(
            partnerService.changePartnerStatus(
                asSuperAdmin(superAdminId),
                partnerId,
                { status: 'REJECTED' },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('allows ACTIVE → SUSPENDED', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId } = await seedPartnerFixture();

        const updated = await partnerService.changePartnerStatus(
            asSuperAdmin(superAdminId),
            partnerId,
            { status: 'SUSPENDED' },
        );

        expect(updated.status).toBe('SUSPENDED');
    });

    it('allows SUSPENDED → ACTIVE (reactivate)', async () => {
        const { superAdminId } = await seedAuthFixtures();
        const { partnerId } = await seedPartnerFixture();

        await prisma.partner.update({
            where: { id: partnerId },
            data: { status: 'SUSPENDED' },
        });

        const updated = await partnerService.changePartnerStatus(
            asSuperAdmin(superAdminId),
            partnerId,
            { status: 'ACTIVE' },
        );

        expect(updated.status).toBe('ACTIVE');
    });

    it('partner admin cannot change status', async () => {
        await seedAuthFixtures();
        const { partnerAdminId, partnerId } = await seedPartnerFixture();

        await expect(
            partnerService.changePartnerStatus(
                asPartnerAdmin(partnerAdminId, partnerId),
                partnerId,
                { status: 'SUSPENDED' },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 for unknown partner', async () => {
        const { superAdminId } = await seedAuthFixtures();

        await expect(
            partnerService.changePartnerStatus(
                asSuperAdmin(superAdminId),
                '00000000-0000-0000-0000-000000000000',
                { status: 'ACTIVE' },
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});