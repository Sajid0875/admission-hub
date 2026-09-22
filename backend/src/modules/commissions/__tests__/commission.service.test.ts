/**
 * commission.service.test.ts - Service-layer tests for commission records.
 *
 * Coverage:
 *   - listCommissions: super_admin sees all; partner_admin sees own; other roles 403
 *   - getCommissionById: scope enforcement
 *   - changeCommissionStatus: state machine, paidAt stamp, super_admin only
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as commissionService from '../commission.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import {
    CommissionStatus,
    CommissionType,
    RoleName,
} from '@prisma/client';
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
    partnerAdminId: string;
    partnerId: string;
    otherPartnerId: string;
    otherPartnerAdminId: string;
    commissionId: string;
}> => {
    await seedAuthFixtures();

    const paRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.PARTNER_ADMIN },
    });

    // Partner A
    const partner = await prisma.partner.create({
        data: {
            academyName: 'A',
            partnerName: 'A',
            ownerName: 'A',
            email: 'a@test.local',
            mobile: '1111111111',
        },
    });
    const pa = await prisma.user.create({
        data: {
            email: 'pa@test.local',
            name: 'PA',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: paRole.id,
            partnerId: partner.id,
        },
    });

    // Partner B
    const otherPartner = await prisma.partner.create({
        data: {
            academyName: 'B',
            partnerName: 'B',
            ownerName: 'B',
            email: 'b@test.local',
            mobile: '2222222222',
        },
    });
    const otherPa = await prisma.user.create({
        data: {
            email: 'pa-b@test.local',
            name: 'PA B',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: paRole.id,
            partnerId: otherPartner.id,
        },
    });

    // Course + admission + commission for partner A
    const course = await prisma.course.create({
        data: { title: 'Course A', duration: '3 months', fee: 50000 },
    });
    const lead = await prisma.lead.create({
        data: {
            partnerId: partner.id,
            createdBy: pa.id,
            name: 'L',
            phone: '9000000001',
            status: 'ADMITTED',
        },
    });
    const admission = await prisma.admission.create({
        data: {
            leadId: lead.id,
            partnerId: partner.id,
            courseId: course.id,
            createdBy: pa.id,
            studentName: 'L',
            fee: 50000,
        },
    });
    const commission = await prisma.commissionRecord.create({
        data: {
            partnerId: partner.id,
            admissionId: admission.id,
            baseAmount: 50000,
            commissionRate: 20,
            commissionAmount: 10000,
            status: CommissionStatus.PENDING,
        },
    });

    const superUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test-super-admin@admission-hub.test' },
    });

    return {
        superAdminId: superUser.id,
        partnerAdminId: pa.id,
        partnerId: partner.id,
        otherPartnerId: otherPartner.id,
        otherPartnerAdminId: otherPa.id,
        commissionId: commission.id,
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

// --------------------------------------------------
// listCommissions
// --------------------------------------------------

describe('commissionService.listCommissions', () => {
    it('super_admin sees all commission records', async () => {
        const f = await seedFx();

        const result = await commissionService.listCommissions(
            asSuperAdmin(f.superAdminId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.commissionAmount).toBe(10000);
    });

    it('partner_admin sees own org records only', async () => {
        const f = await seedFx();

        const result = await commissionService.listCommissions(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.partnerId).toBe(f.partnerId);
    });

    it('partner_admin in other org sees nothing', async () => {
        const f = await seedFx();

        const result = await commissionService.listCommissions(
            asPartnerAdmin(f.otherPartnerAdminId, f.otherPartnerId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(0);
    });

    it('counselor cannot list commissions', async () => {
        const f = await seedFx();

        await expect(
            commissionService.listCommissions(
                asCounselor('counselor-id', f.partnerId),
                { page: 1, limit: 25 },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('partner_admin cannot filter by partnerId', async () => {
        const f = await seedFx();

        await expect(
            commissionService.listCommissions(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                { page: 1, limit: 25, partnerId: f.otherPartnerId },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('super_admin can filter by partnerId', async () => {
        const f = await seedFx();

        const result = await commissionService.listCommissions(
            asSuperAdmin(f.superAdminId),
            { page: 1, limit: 25, partnerId: f.otherPartnerId },
        );

        expect(result.pagination.total).toBe(0);
    });
});

// --------------------------------------------------
// getCommissionById
// --------------------------------------------------

describe('commissionService.getCommissionById', () => {
    it('super_admin fetches any record', async () => {
        const f = await seedFx();

        const fetched = await commissionService.getCommissionById(
            asSuperAdmin(f.superAdminId),
            f.commissionId,
        );
        expect(fetched.id).toBe(f.commissionId);
    });

    it('partner_admin fetches own record', async () => {
        const f = await seedFx();

        const fetched = await commissionService.getCommissionById(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            f.commissionId,
        );
        expect(fetched.id).toBe(f.commissionId);
    });

    it('partner_admin in other org cannot fetch', async () => {
        const f = await seedFx();

        await expect(
            commissionService.getCommissionById(
                asPartnerAdmin(f.otherPartnerAdminId, f.otherPartnerId),
                f.commissionId,
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

// --------------------------------------------------
// changeCommissionStatus
// --------------------------------------------------

describe('commissionService.changeCommissionStatus', () => {
    it('PENDING → APPROVED', async () => {
        const f = await seedFx();

        const updated = await commissionService.changeCommissionStatus(
            asSuperAdmin(f.superAdminId),
            f.commissionId,
            { status: CommissionStatus.APPROVED },
        );

        expect(updated.status).toBe('APPROVED');
        expect(updated.paidAt).toBeNull();
    });

    it('APPROVED → PAID stamps paidAt', async () => {
        const f = await seedFx();

        await commissionService.changeCommissionStatus(
            asSuperAdmin(f.superAdminId),
            f.commissionId,
            { status: CommissionStatus.APPROVED },
        );

        const paid = await commissionService.changeCommissionStatus(
            asSuperAdmin(f.superAdminId),
            f.commissionId,
            { status: CommissionStatus.PAID },
        );

        expect(paid.status).toBe('PAID');
        expect(paid.paidAt).toBeInstanceOf(Date);
    });

    it('PENDING → CANCELLED', async () => {
        const f = await seedFx();

        const cancelled = await commissionService.changeCommissionStatus(
            asSuperAdmin(f.superAdminId),
            f.commissionId,
            { status: CommissionStatus.CANCELLED },
        );
        expect(cancelled.status).toBe('CANCELLED');
    });

    it('rejects invalid transition', async () => {
        const f = await seedFx();

        await commissionService.changeCommissionStatus(
            asSuperAdmin(f.superAdminId),
            f.commissionId,
            { status: CommissionStatus.APPROVED },
        );
        await commissionService.changeCommissionStatus(
            asSuperAdmin(f.superAdminId),
            f.commissionId,
            { status: CommissionStatus.PAID },
        );

        await expect(
            commissionService.changeCommissionStatus(
                asSuperAdmin(f.superAdminId),
                f.commissionId,
                { status: CommissionStatus.APPROVED },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('partner_admin cannot change status', async () => {
        const f = await seedFx();

        await expect(
            commissionService.changeCommissionStatus(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                f.commissionId,
                { status: CommissionStatus.APPROVED },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});
// --------------------------------------------------
// getCommissionSummary
// --------------------------------------------------

describe('commissionService.getCommissionSummary', () => {
    it('aggregates pending amount for partner scope', async () => {
        // Happy path: one PENDING row → pendingPayout equals commissionAmount.
        const f = await seedFx();

        const summary = await commissionService.getCommissionSummary(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
        );

        expect(summary.totalEarned).toBe(10000);
        expect(summary.pendingPayout).toBe(10000);
        expect(summary.totalPaid).toBe(0);
        expect(summary.lastPayoutDate).toBeNull();
        expect(summary.counts.pending).toBe(1);
        expect(summary.counts.paid).toBe(0);
    });

    it('moves amount into totalPaid after APPROVED → PAID', async () => {
        const f = await seedFx();

        await commissionService.changeCommissionStatus(
            asSuperAdmin(f.superAdminId),
            f.commissionId,
            { status: CommissionStatus.APPROVED },
        );
        await commissionService.changeCommissionStatus(
            asSuperAdmin(f.superAdminId),
            f.commissionId,
            { status: CommissionStatus.PAID },
        );

        const summary = await commissionService.getCommissionSummary(
            asSuperAdmin(f.superAdminId),
        );

        expect(summary.pendingPayout).toBe(0);
        expect(summary.totalPaid).toBe(10000);
        expect(summary.lastPayoutDate).toBeTruthy();
        expect(summary.counts.paid).toBe(1);
    });

    it('partner_admin cannot filter by another partnerId', async () => {
        const f = await seedFx();

        await expect(
            commissionService.getCommissionSummary(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                { partnerId: f.otherPartnerId },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('counselor cannot view summary', async () => {
        const f = await seedFx();

        await expect(
            commissionService.getCommissionSummary(
                asCounselor(f.partnerAdminId, f.partnerId),
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});
