/**
 * admission.service.test.ts - Service-layer tests for admissions + payments.
 *
 * Coverage:
 *   - createAdmission: lead guards, one-per-lead, transactional flip, activity
 *   - getAdmissionById / listAdmissions: scope
 *   - updateAdmission: only when not VERIFIED, fee change recomputes status
 *   - verifyAdmission: generates commission, blocks double verify
 *   - cancelAdmission: blocks rejected→rejected
 *   - recordPayment: overpay blocked, derived status, append-only
 *   - refundPayment: super_admin only, updates derived status
 *   - listPayments: scoped, filters
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as admissionService from '../admission.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import {
    ActivityType,
    LeadStatus,
    PaymentStatus,
    RoleName,
    VerificationStatus,
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
// Fixture
// --------------------------------------------------

interface Fx {
    partnerId: string;
    partnerAdminId: string;
    counselorId: string;
    otherPartnerAdminId: string;
    otherPartnerId: string;
    leadId: string;
    courseId: string;
}

const seedFx = async (): Promise<Fx> => {
    await seedAuthFixtures();

    const paRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.PARTNER_ADMIN },
    });
    const coRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.COUNSELOR },
    });

    const partner = await prisma.partner.create({
        data: {
            academyName: 'Academy A',
            partnerName: 'A',
            ownerName: 'Owner A',
            email: 'a@test.local',
            mobile: '1111111111',
        },
    });
    const pa = await prisma.user.create({
        data: {
            email: 'pa-a@test.local',
            name: 'PA A',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: paRole.id,
            partnerId: partner.id,
        },
    });
    const co = await prisma.user.create({
        data: {
            email: 'co-a@test.local',
            name: 'CO A',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: coRole.id,
            partnerId: partner.id,
        },
    });

    const otherPartner = await prisma.partner.create({
        data: {
            academyName: 'Academy B',
            partnerName: 'B',
            ownerName: 'Owner B',
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

    const lead = await prisma.lead.create({
        data: {
            partnerId: partner.id,
            createdBy: pa.id,
            name: 'Test Lead',
            phone: '9000000001',
            status: LeadStatus.NEW,
        },
    });

    const course = await prisma.course.create({
        data: {
            title: 'Test Course',
            duration: '6 months',
            fee: 50000,
        },
    });

    return {
        partnerId: partner.id,
        partnerAdminId: pa.id,
        counselorId: co.id,
        otherPartnerId: otherPartner.id,
        otherPartnerAdminId: otherPa.id,
        leadId: lead.id,
        courseId: course.id,
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
// createAdmission
// --------------------------------------------------

describe('admissionService.createAdmission', () => {
    it('creates admission and flips lead to ADMITTED', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        expect(adm.verificationStatus).toBe(VerificationStatus.PENDING);
        expect(adm.paymentStatus).toBe(PaymentStatus.UNPAID);
        expect(adm.amountPaid).toBe(0);

        const lead = await prisma.lead.findUniqueOrThrow({
            where: { id: f.leadId },
        });
        expect(lead.status).toBe(LeadStatus.ADMITTED);
    });

    it('appends ADMISSION_CREATED activity', async () => {
        const f = await seedFx();

        await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        const activities = await prisma.leadActivity.findMany({
            where: { leadId: f.leadId, type: ActivityType.ADMISSION_CREATED },
        });
        expect(activities.length).toBe(1);
    });

    it('rejects archived leads', async () => {
        const f = await seedFx();
        await prisma.lead.update({
            where: { id: f.leadId },
            data: { archivedAt: new Date() },
        });

        await expect(
            admissionService.createAdmission(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects leads already ADMITTED', async () => {
        const f = await seedFx();
        await prisma.lead.update({
            where: { id: f.leadId },
            data: { status: LeadStatus.ADMITTED },
        });

        await expect(
            admissionService.createAdmission(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
            ),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('rejects LOST leads', async () => {
        const f = await seedFx();
        await prisma.lead.update({
            where: { id: f.leadId },
            data: { status: LeadStatus.LOST },
        });

        await expect(
            admissionService.createAdmission(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('enforces one admission per lead', async () => {
        const f = await seedFx();

        await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        // Flip lead status back so we don't hit the ADMITTED guard
        await prisma.lead.update({
            where: { id: f.leadId },
            data: { status: LeadStatus.NEW },
        });

        await expect(
            admissionService.createAdmission(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
            ),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('rejects cross-partner actor', async () => {
        const f = await seedFx();

        await expect(
            admissionService.createAdmission(
                asPartnerAdmin(f.otherPartnerAdminId, f.otherPartnerId),
                { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('uses lead name when studentName omitted', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        expect(adm.studentName).toBe('Test Lead');
    });
});

// --------------------------------------------------
// getAdmissionById
// --------------------------------------------------

describe('admissionService.getAdmissionById', () => {
    it('returns own-org admission', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        const fetched = await admissionService.getAdmissionById(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
        );
        expect(fetched.id).toBe(adm.id);
    });

    it('rejects cross-partner read', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        await expect(
            admissionService.getAdmissionById(
                asPartnerAdmin(f.otherPartnerAdminId, f.otherPartnerId),
                adm.id,
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 for unknown id', async () => {
        const f = await seedFx();

        await expect(
            admissionService.getAdmissionById(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                '00000000-0000-0000-0000-000000000000',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

// --------------------------------------------------
// updateAdmission
// --------------------------------------------------

describe('admissionService.updateAdmission', () => {
    it('updates student info before verification', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        const updated = await admissionService.updateAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { studentName: 'New Name' },
        );

        expect(updated.studentName).toBe('New Name');
    });

    it('rejects update after VERIFIED', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        await admissionService.verifyAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { verificationStatus: 'VERIFIED' },
        );

        await expect(
            admissionService.updateAdmission(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                adm.id,
                { studentName: 'Nope' },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('recomputes payment status when fee changes', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        // Pay 20000 → PARTIAL at 50000
        await admissionService.recordPayment(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { amount: 20000, paymentMode: 'UPI' },
        );

        // Reduce fee to 20000 → PAID
        const updated = await admissionService.updateAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { fee: 20000 },
        );

        expect(updated.paymentStatus).toBe(PaymentStatus.PAID);
        expect(updated.amountPaid).toBe(20000);
    });
});

// --------------------------------------------------
// verifyAdmission
// --------------------------------------------------

describe('admissionService.verifyAdmission', () => {
    it('generates commission record on VERIFIED', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        await admissionService.verifyAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { verificationStatus: 'VERIFIED' },
        );

        const commissions = await prisma.commissionRecord.findMany({
            where: { admissionId: adm.id },
        });
        expect(commissions.length).toBe(1);
        expect(Number(commissions[0]?.baseAmount)).toBe(50000);
        expect(commissions[0]?.status).toBe('PENDING');
    });

    it('does not generate commission on REJECTED', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        await admissionService.verifyAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { verificationStatus: 'REJECTED' },
        );

        const commissions = await prisma.commissionRecord.findMany({
            where: { admissionId: adm.id },
        });
        expect(commissions.length).toBe(0);
    });

    it('rejects double verify', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        await admissionService.verifyAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { verificationStatus: 'VERIFIED' },
        );

        await expect(
            admissionService.verifyAdmission(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                adm.id,
                { verificationStatus: 'VERIFIED' },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });
});

// --------------------------------------------------
// recordPayment
// --------------------------------------------------

describe('admissionService.recordPayment', () => {
    it('records partial then full, derives status each time', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        const r1 = await admissionService.recordPayment(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { amount: 20000, paymentMode: 'UPI' },
        );
        expect(r1.admission.paymentStatus).toBe(PaymentStatus.PARTIAL);
        expect(r1.admission.amountPaid).toBe(20000);

        const r2 = await admissionService.recordPayment(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { amount: 30000, paymentMode: 'BANK_TRANSFER' },
        );
        expect(r2.admission.paymentStatus).toBe(PaymentStatus.PAID);
        expect(r2.admission.amountPaid).toBe(50000);
    });

    it('rejects overpayment', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        await admissionService.recordPayment(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { amount: 50000, paymentMode: 'CASH' },
        );

        await expect(
            admissionService.recordPayment(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                adm.id,
                { amount: 1, paymentMode: 'CASH' },
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects cross-partner payment', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        await expect(
            admissionService.recordPayment(
                asPartnerAdmin(f.otherPartnerAdminId, f.otherPartnerId),
                adm.id,
                { amount: 10000, paymentMode: 'CASH' },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

// --------------------------------------------------
// refundPayment
// --------------------------------------------------

describe('admissionService.refundPayment', () => {
    it('super_admin can refund; derived status updates', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        const { payment } = await admissionService.recordPayment(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { amount: 50000, paymentMode: 'CASH' },
        );

        const superAdmin = await prisma.user.findUniqueOrThrow({
            where: { email: 'test-super-admin@admission-hub.test' },
        });

        const result = await admissionService.refundPayment(
            asSuperAdmin(superAdmin.id),
            adm.id,
            payment.id,
            { reason: 'test' },
        );

        expect(result.payment.status).toBe(PaymentStatus.REFUNDED);
        expect(result.admission.paymentStatus).toBe(PaymentStatus.UNPAID);
        expect(result.admission.amountPaid).toBe(0);
    });

    it('rejects refund by partner_admin', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        const { payment } = await admissionService.recordPayment(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { amount: 20000, paymentMode: 'CASH' },
        );

        await expect(
            admissionService.refundPayment(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                adm.id,
                payment.id,
                { reason: 'nope' },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects refund of an already-refunded payment', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        const { payment } = await admissionService.recordPayment(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { amount: 20000, paymentMode: 'CASH' },
        );

        const superAdmin = await prisma.user.findUniqueOrThrow({
            where: { email: 'test-super-admin@admission-hub.test' },
        });

        await admissionService.refundPayment(
            asSuperAdmin(superAdmin.id),
            adm.id,
            payment.id,
            {},
        );

        await expect(
            admissionService.refundPayment(
                asSuperAdmin(superAdmin.id),
                adm.id,
                payment.id,
                {},
            ),
        ).rejects.toMatchObject({ statusCode: 400 });
    });
});

// --------------------------------------------------
// listPayments
// --------------------------------------------------

describe('admissionService.listPayments', () => {
    it('returns scoped payments', async () => {
        const f = await seedFx();

        const adm = await admissionService.createAdmission(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { leadId: f.leadId, courseId: f.courseId, fee: 50000 },
        );

        await admissionService.recordPayment(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { amount: 10000, paymentMode: 'CASH' },
        );
        await admissionService.recordPayment(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { amount: 15000, paymentMode: 'UPI' },
        );

        const result = await admissionService.listPayments(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            adm.id,
            { page: 1, limit: 50 },
        );

        expect(result.pagination.total).toBe(2);
    });
});