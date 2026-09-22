/**
 * report.service.test.ts - Service-layer tests for the reports module.
 *
 * Coverage:
 *   - resolveScope behavior via getDashboard (super_admin vs partner_admin)
 *   - Access control: counselor/support blocked
 *   - getDashboard: aggregate counts, funnel, trend
 *   - getLeadsReport / getAdmissionsReport / getRevenueReport
 *   - getConversionReport: funnel + rate
 *   - getCommissionsReport: totals by status
 *   - getPartnersReport: super_admin only
 *   - getCoursesReport: per-course aggregation
 *   - exportReport: CSV format + headers
 *   - Scope isolation: partner_admin sees only own org
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as reportService from '../report.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import {
    CommissionStatus,
    LeadStatus,
    PaymentStatus,
    RoleName,
    VerificationStatus,
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
// Fixture: two partners, each with leads + admissions + payments + commissions
// --------------------------------------------------

interface Fx {
    superAdminId: string;
    partnerAdminAId: string;
    partnerAId: string;
    partnerAdminBId: string;
    partnerBId: string;
    courseId: string;
    leadAId: string;
    admissionAId: string;
    otherAdmissionAId: string;
    leadBId: string;
    admissionBId: string;
}

const seedFx = async (): Promise<Fx> => {
    await seedAuthFixtures();

    const paRole = await prisma.role.findUniqueOrThrow({
        where: { name: RoleName.PARTNER_ADMIN },
    });

    // Partner A
    const partnerA = await prisma.partner.create({
        data: {
            academyName: 'Academy A',
            partnerName: 'A',
            ownerName: 'OwnerA',
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

    // Partner B
    const partnerB = await prisma.partner.create({
        data: {
            academyName: 'Academy B',
            partnerName: 'B',
            ownerName: 'OwnerB',
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

    // Course
    const course = await prisma.course.create({
        data: { title: 'Test Course', duration: '3 months', fee: 50000 },
    });

    // Lead + admission for partner A (ADMITTED, VERIFIED, PARTIAL)
    const leadA = await prisma.lead.create({
        data: {
            partnerId: partnerA.id,
            createdBy: paA.id,
            name: 'Lead A',
            phone: '9000000001',
            status: LeadStatus.ADMITTED,
        },
    });
    const admissionA = await prisma.admission.create({
        data: {
            leadId: leadA.id,
            partnerId: partnerA.id,
            courseId: course.id,
            createdBy: paA.id,
            studentName: 'Lead A',
            fee: 50000,
            verificationStatus: VerificationStatus.VERIFIED,
            paymentStatus: PaymentStatus.PARTIAL,
        },
    });
    await prisma.payment.create({
        data: {
            admissionId: admissionA.id,
            createdBy: paA.id,
            amount: 20000,
            paymentMode: 'UPI',
            status: PaymentStatus.PAID,
        },
    });
    await prisma.commissionRecord.create({
        data: {
            partnerId: partnerA.id,
            admissionId: admissionA.id,
            baseAmount: 50000,
            commissionRate: 20,
            commissionAmount: 10000,
            status: CommissionStatus.PAID,
        },
    });

    // Second lead + admission for partner A (UNPAID)
    const otherAdmissionLead = await prisma.lead.create({
        data: {
            partnerId: partnerA.id,
            createdBy: paA.id,
            name: 'Lead A2',
            phone: '9000000002',
            status: LeadStatus.ADMITTED,
        },
    });
    const otherAdmissionA = await prisma.admission.create({
        data: {
            leadId: otherAdmissionLead.id,
            partnerId: partnerA.id,
            courseId: course.id,
            createdBy: paA.id,
            studentName: 'Lead A2',
            fee: 30000,
            verificationStatus: VerificationStatus.PENDING,
            paymentStatus: PaymentStatus.UNPAID,
        },
    });

    // Lead + admission for partner B (ADMITTED, VERIFIED, PAID)
    const leadB = await prisma.lead.create({
        data: {
            partnerId: partnerB.id,
            createdBy: paB.id,
            name: 'Lead B',
            phone: '9000000003',
            status: LeadStatus.ADMITTED,
        },
    });
    const admissionB = await prisma.admission.create({
        data: {
            leadId: leadB.id,
            partnerId: partnerB.id,
            courseId: course.id,
            createdBy: paB.id,
            studentName: 'Lead B',
            fee: 40000,
            verificationStatus: VerificationStatus.VERIFIED,
            paymentStatus: PaymentStatus.PAID,
        },
    });
    await prisma.payment.create({
        data: {
            admissionId: admissionB.id,
            createdBy: paB.id,
            amount: 40000,
            paymentMode: 'CASH',
            status: PaymentStatus.PAID,
        },
    });

    const superUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test-super-admin@admission-hub.test' },
    });

    return {
        superAdminId: superUser.id,
        partnerAdminAId: paA.id,
        partnerAId: partnerA.id,
        partnerAdminBId: paB.id,
        partnerBId: partnerB.id,
        courseId: course.id,
        leadAId: leadA.id,
        admissionAId: admissionA.id,
        otherAdmissionAId: otherAdmissionA.id,
        leadBId: leadB.id,
        admissionBId: admissionB.id,
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
// Access control
// --------------------------------------------------

describe('reportService access control', () => {
    it('counselor cannot view reports', async () => {
        const f = await seedFx();

        await expect(
            reportService.getDashboard(
                asCounselor('counselor-id', f.partnerAId),
                { groupBy: 'day' },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('partner_admin must have a partnerId', async () => {
        const f = await seedFx();

        await expect(
            reportService.getDashboard(
                { id: f.partnerAdminAId, role: 'PARTNER_ADMIN', partnerId: null },
                { groupBy: 'day' },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('partner_admin cannot view partners report', async () => {
        const f = await seedFx();

        await expect(
            reportService.getPartnersReport(
                asPartnerAdmin(f.partnerAdminAId, f.partnerAId),
                { groupBy: 'day' },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

// --------------------------------------------------
// Dashboard
// --------------------------------------------------

describe('reportService.getDashboard', () => {
    it('super_admin sees all data', async () => {
        const f = await seedFx();

        const result = await reportService.getDashboard(
            asSuperAdmin(f.superAdminId),
            { groupBy: 'day' },
        );

        expect(result.summary.totalLeads).toBe(3);
        expect(result.summary.totalAdmissions).toBe(3);
        expect(result.summary.verifiedAdmissions).toBe(2);
        expect(result.summary.unpaidAdmissions).toBe(1);
        expect(result.summary.totalRevenue).toBe(60000); // 20000 + 40000
        expect(result.summary.paidCommission).toBe(10000);
    });

    it('partner_admin sees only own org', async () => {
        const f = await seedFx();

        const result = await reportService.getDashboard(
            asPartnerAdmin(f.partnerAdminAId, f.partnerAId),
            { groupBy: 'day' },
        );

        expect(result.summary.totalLeads).toBe(2);
        expect(result.summary.totalAdmissions).toBe(2);
        expect(result.summary.totalRevenue).toBe(20000); // only partner A's payment
    });

    it('funnel returns status counts', async () => {
        const f = await seedFx();

        const result = await reportService.getDashboard(
            asSuperAdmin(f.superAdminId),
            { groupBy: 'day' },
        );

        const admitted = result.funnel.find((f) => f.status === 'ADMITTED');
        expect(admitted?.count).toBe(3);
    });
});

// --------------------------------------------------
// Leads report
// --------------------------------------------------

describe('reportService.getLeadsReport', () => {
    it('super_admin sees all leads grouped by status', async () => {
        const f = await seedFx();

        const result = await reportService.getLeadsReport(
            asSuperAdmin(f.superAdminId),
            { groupBy: 'day' },
        );

        const admitted = result.byStatus.find((r) => r.status === 'ADMITTED');
        expect(admitted?.count).toBe(3);
    });

    it('partner_admin sees only own org', async () => {
        const f = await seedFx();

        const result = await reportService.getLeadsReport(
            asPartnerAdmin(f.partnerAdminAId, f.partnerAId),
            { groupBy: 'day' },
        );

        const admitted = result.byStatus.find((r) => r.status === 'ADMITTED');
        expect(admitted?.count).toBe(2);
    });
});

// --------------------------------------------------
// Admissions report
// --------------------------------------------------

describe('reportService.getAdmissionsReport', () => {
    it('returns totals + byStatus + byVerification', async () => {
        const f = await seedFx();

        const result = await reportService.getAdmissionsReport(
            asSuperAdmin(f.superAdminId),
            { groupBy: 'day' },
        );

        expect(result.total).toBe(3);

        const verified = result.byVerification.find(
            (r) => r.verification === 'VERIFIED',
        );
        expect(verified?.count).toBe(2);

        const unpaid = result.byStatus.find((r) => r.status === 'UNPAID');
        expect(unpaid?.count).toBe(1);
    });
});

// --------------------------------------------------
// Revenue report
// --------------------------------------------------

describe('reportService.getRevenueReport', () => {
    it('super_admin sees total received across both partners', async () => {
        const f = await seedFx();

        const result = await reportService.getRevenueReport(
            asSuperAdmin(f.superAdminId),
            { groupBy: 'day' },
        );

        expect(result.totalReceived).toBe(60000);
    });

    it('partner_admin sees only own payment', async () => {
        const f = await seedFx();

        const result = await reportService.getRevenueReport(
            asPartnerAdmin(f.partnerAdminAId, f.partnerAId),
            { groupBy: 'day' },
        );

        expect(result.totalReceived).toBe(20000);
        expect(result.byPaymentMode).toHaveLength(1);
        expect(result.byPaymentMode[0]?.mode).toBe('UPI');
    });
});

// --------------------------------------------------
// Conversion report
// --------------------------------------------------

describe('reportService.getConversionReport', () => {
    it('calculates conversion rate', async () => {
        const f = await seedFx();

        const result = await reportService.getConversionReport(
            asSuperAdmin(f.superAdminId),
            { groupBy: 'day' },
        );

        expect(result.totalLeads).toBe(3);
        expect(result.totalAdmissions).toBe(3);
        expect(result.conversionRate).toBeCloseTo(1.0, 2);
        expect(result.funnel).toHaveLength(8); // all 8 funnel stages present
    });
});

// --------------------------------------------------
// Commissions report
// --------------------------------------------------

describe('reportService.getCommissionsReport', () => {
    it('returns totals per status', async () => {
        const f = await seedFx();

        const result = await reportService.getCommissionsReport(
            asSuperAdmin(f.superAdminId),
            { groupBy: 'day' },
        );

        expect(result.totalPaid).toBe(10000);
        expect(result.totalPending).toBe(0);
        expect(result.totalApproved).toBe(0);
        expect(result.totalCancelled).toBe(0);
    });

    it('partner_admin sees only own commissions', async () => {
        const f = await seedFx();

        const result = await reportService.getCommissionsReport(
            asPartnerAdmin(f.partnerAdminAId, f.partnerAId),
            { groupBy: 'day' },
        );

        expect(result.totalPaid).toBe(10000);
    });
});

// --------------------------------------------------
// Partners report
// --------------------------------------------------

describe('reportService.getPartnersReport', () => {
    it('super_admin sees both partners with per-partner numbers', async () => {
        const f = await seedFx();

        const result = await reportService.getPartnersReport(
            asSuperAdmin(f.superAdminId),
            { groupBy: 'day' },
        );

        expect(result.partners).toHaveLength(2);

        const partnerA = result.partners.find((p) => p.partnerId === f.partnerAId);
        expect(partnerA?.admissions).toBe(2);
        expect(partnerA?.revenue).toBe(20000);
        expect(partnerA?.commissionEarned).toBe(10000);

        const partnerB = result.partners.find((p) => p.partnerId === f.partnerBId);
        expect(partnerB?.admissions).toBe(1);
        expect(partnerB?.revenue).toBe(40000);
    });
});

// --------------------------------------------------
// Courses report
// --------------------------------------------------

describe('reportService.getCoursesReport', () => {
    it('returns per-course aggregation', async () => {
        const f = await seedFx();

        const result = await reportService.getCoursesReport(
            asSuperAdmin(f.superAdminId),
            { groupBy: 'day' },
        );

        expect(result.courses).toHaveLength(1);
        expect(result.courses[0]?.courseId).toBe(f.courseId);
        expect(result.courses[0]?.admissions).toBe(3);
        expect(result.courses[0]?.revenue).toBe(120000); // 50000 + 30000 + 40000
    });
});

// --------------------------------------------------
// CSV export
// --------------------------------------------------

describe('reportService.exportReport', () => {
    it('exports leads as CSV with headers', async () => {
        const f = await seedFx();

        const result = await reportService.exportReport(
            asSuperAdmin(f.superAdminId),
            { report: 'leads', groupBy: 'day' },
        );

        expect(result.contentType).toBe('text/csv; charset=utf-8');
        expect(result.filename).toMatch(/^leads-.*\.csv$/);
        expect(String(result.body).split('\n')[0]).toContain('id,name,phone,email');
    });

    it('exports admissions as CSV with headers', async () => {
        const f = await seedFx();

        const result = await reportService.exportReport(
            asSuperAdmin(f.superAdminId),
            { report: 'admissions', groupBy: 'day' },
        );

        expect(result.filename).toMatch(/^admissions-.*\.csv$/);
        expect(String(result.body).split('\n')[0]).toContain(
            'id,studentName,fee,paymentStatus',
        );
    });

    it('partner_admin export includes only own org rows', async () => {
        const f = await seedFx();

        const result = await reportService.exportReport(
            asPartnerAdmin(f.partnerAdminAId, f.partnerAId),
            { report: 'admissions', groupBy: 'day' },
        );

        // Count data rows (excluding header)
        const lines = String(result.body)
            .split('\n')
            .filter((l) => l.trim() !== '');
        expect(lines.length - 1).toBe(2); // 2 admissions for partner A
    });

    it('exports leads as PDF when format=pdf', async () => {
        const f = await seedFx();

        const result = await reportService.exportReport(
            asSuperAdmin(f.superAdminId),
            { report: 'leads', groupBy: 'day', format: 'pdf' },
        );

        expect(result.contentType).toBe('application/pdf');
        expect(result.filename).toMatch(/^leads-.*\.pdf$/);
        expect(Buffer.isBuffer(result.body)).toBe(true);
        expect((result.body as Buffer).subarray(0, 5).toString('utf8')).toBe('%PDF-');
    });
});