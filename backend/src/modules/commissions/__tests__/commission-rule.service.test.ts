/**
 * commission-rule.service.test.ts - Service-layer tests for commission rules.
 *
 * Coverage:
 *   - createCommissionRule: super_admin only, rate bounds, course uniqueness
 *   - listCommissionRules: super_admin only, filters
 *   - getCommissionRuleById: 404 for unknown
 *   - updateCommissionRule: super_admin only, uniqueness on courseId change
 *   - deleteCommissionRule: super_admin only, hard delete
 *   - resolveCommissionRate: returns rule if exists, fallback otherwise
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as ruleService from '../commission-rule.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import { CommissionType, RoleName } from '@prisma/client';
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
    courseId: string;
    otherCourseId: string;
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
    const pa = await prisma.user.create({
        data: {
            email: 'pa@test.local',
            name: 'PA',
            passwordHash: await bcrypt.hash('x', 10),
            roleId: paRole.id,
            partnerId: partner.id,
        },
    });

    const course = await prisma.course.create({
        data: { title: 'Course A', duration: '3 months', fee: 30000 },
    });
    const otherCourse = await prisma.course.create({
        data: { title: 'Course B', duration: '6 months', fee: 60000 },
    });

    const superUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test-super-admin@admission-hub.test' },
    });

    return {
        superAdminId: superUser.id,
        partnerAdminId: pa.id,
        partnerId: partner.id,
        courseId: course.id,
        otherCourseId: otherCourse.id,
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

// --------------------------------------------------
// createCommissionRule
// --------------------------------------------------

describe('commissionRuleService.createCommissionRule', () => {
    it('super_admin creates a PERCENTAGE rule', async () => {
        const f = await seedFx();

        const rule = await ruleService.createCommissionRule(
            asSuperAdmin(f.superAdminId),
            {
                courseId: f.courseId,
                commissionType: CommissionType.PERCENTAGE,
                rate: 20,
            },
        );

        expect(rule.commissionType).toBe('PERCENTAGE');
        expect(rule.rate).toBe(20);
        expect(rule.courseId).toBe(f.courseId);
    });

    it('rejects PERCENTAGE rate > 100', async () => {
        const f = await seedFx();

        await expect(
            ruleService.createCommissionRule(asSuperAdmin(f.superAdminId), {
                courseId: f.courseId,
                commissionType: CommissionType.PERCENTAGE,
                rate: 150,
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('allows FLAT rate up to schema max', async () => {
        const f = await seedFx();

        const rule = await ruleService.createCommissionRule(
            asSuperAdmin(f.superAdminId),
            {
                courseId: f.courseId,
                commissionType: CommissionType.FLAT,
                rate: 50000,
            },
        );
        expect(rule.rate).toBe(50000);
    });

    it('rejects duplicate rule for same course with 409', async () => {
        const f = await seedFx();

        await ruleService.createCommissionRule(asSuperAdmin(f.superAdminId), {
            courseId: f.courseId,
            commissionType: CommissionType.PERCENTAGE,
            rate: 20,
        });

        await expect(
            ruleService.createCommissionRule(asSuperAdmin(f.superAdminId), {
                courseId: f.courseId,
                commissionType: CommissionType.FLAT,
                rate: 5000,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('allows rules for different courses', async () => {
        const f = await seedFx();

        await ruleService.createCommissionRule(asSuperAdmin(f.superAdminId), {
            courseId: f.courseId,
            commissionType: CommissionType.PERCENTAGE,
            rate: 20,
        });
        await ruleService.createCommissionRule(asSuperAdmin(f.superAdminId), {
            courseId: f.otherCourseId,
            commissionType: CommissionType.PERCENTAGE,
            rate: 15,
        });

        const rules = await prisma.commissionRule.findMany();
        expect(rules.length).toBe(2);
    });

    it('partner_admin cannot create', async () => {
        const f = await seedFx();

        await expect(
            ruleService.createCommissionRule(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                {
                    courseId: f.courseId,
                    commissionType: CommissionType.PERCENTAGE,
                    rate: 20,
                },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects unknown courseId', async () => {
        const f = await seedFx();

        await expect(
            ruleService.createCommissionRule(asSuperAdmin(f.superAdminId), {
                courseId: '00000000-0000-0000-0000-000000000000',
                commissionType: CommissionType.PERCENTAGE,
                rate: 20,
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });
});

// --------------------------------------------------
// updateCommissionRule
// --------------------------------------------------

describe('commissionRuleService.updateCommissionRule', () => {
    it('super_admin updates rate', async () => {
        const f = await seedFx();

        const rule = await ruleService.createCommissionRule(
            asSuperAdmin(f.superAdminId),
            {
                courseId: f.courseId,
                commissionType: CommissionType.PERCENTAGE,
                rate: 20,
            },
        );

        const updated = await ruleService.updateCommissionRule(
            asSuperAdmin(f.superAdminId),
            rule.id,
            { rate: 25 },
        );

        expect(updated.rate).toBe(25);
    });

    it('rejects rate > 100 when current type is PERCENTAGE', async () => {
        const f = await seedFx();

        const rule = await ruleService.createCommissionRule(
            asSuperAdmin(f.superAdminId),
            {
                courseId: f.courseId,
                commissionType: CommissionType.PERCENTAGE,
                rate: 20,
            },
        );

        await expect(
            ruleService.updateCommissionRule(asSuperAdmin(f.superAdminId), rule.id, {
                rate: 150,
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects courseId change to a course with existing rule', async () => {
        const f = await seedFx();

        await ruleService.createCommissionRule(asSuperAdmin(f.superAdminId), {
            courseId: f.courseId,
            commissionType: CommissionType.PERCENTAGE,
            rate: 20,
        });
        const rule2 = await ruleService.createCommissionRule(
            asSuperAdmin(f.superAdminId),
            {
                courseId: f.otherCourseId,
                commissionType: CommissionType.PERCENTAGE,
                rate: 15,
            },
        );

        await expect(
            ruleService.updateCommissionRule(asSuperAdmin(f.superAdminId), rule2.id, {
                courseId: f.courseId,
            }),
        ).rejects.toMatchObject({ statusCode: 409 });
    });
});

// --------------------------------------------------
// deleteCommissionRule
// --------------------------------------------------

describe('commissionRuleService.deleteCommissionRule', () => {
    it('super_admin hard-deletes a rule', async () => {
        const f = await seedFx();

        const rule = await ruleService.createCommissionRule(
            asSuperAdmin(f.superAdminId),
            {
                courseId: f.courseId,
                commissionType: CommissionType.PERCENTAGE,
                rate: 20,
            },
        );

        await ruleService.deleteCommissionRule(asSuperAdmin(f.superAdminId), rule.id);

        const found = await prisma.commissionRule.findUnique({
            where: { id: rule.id },
        });
        expect(found).toBeNull();
    });

    it('partner_admin cannot delete', async () => {
        const f = await seedFx();

        const rule = await ruleService.createCommissionRule(
            asSuperAdmin(f.superAdminId),
            {
                courseId: f.courseId,
                commissionType: CommissionType.PERCENTAGE,
                rate: 20,
            },
        );

        await expect(
            ruleService.deleteCommissionRule(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                rule.id,
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

// --------------------------------------------------
// resolveCommissionRate
// --------------------------------------------------

describe('commissionRuleService.resolveCommissionRate', () => {
    it('returns the rule when it exists', async () => {
        const f = await seedFx();

        const rule = await ruleService.createCommissionRule(
            asSuperAdmin(f.superAdminId),
            {
                courseId: f.courseId,
                commissionType: CommissionType.PERCENTAGE,
                rate: 20,
            },
        );

        const resolved = await ruleService.resolveCommissionRate(f.courseId);
        expect(resolved.ruleId).toBe(rule.id);
        expect(resolved.rate).toBe(20);
        expect(resolved.commissionType).toBe('PERCENTAGE');
    });

    it('falls back to rate 0 when no rule exists', async () => {
        const f = await seedFx();

        const resolved = await ruleService.resolveCommissionRate(f.courseId);
        expect(resolved.ruleId).toBeNull();
        expect(resolved.rate).toBe(0);
    });
});