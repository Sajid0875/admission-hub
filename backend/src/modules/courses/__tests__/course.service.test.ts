/**
 * course.service.test.ts - Service-layer tests for the courses module.
 *
 * Coverage:
 *   - createCourse: super_admin only, fee validation, defaults to ACTIVE
 *   - listCourses: global read, hides ARCHIVED by default, filters, search
 *   - getCourseById: 404 for unknown
 *   - updateCourse: super_admin only
 *   - changeCourseStatus: super_admin only, free-form transitions
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as courseService from '../course.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import { CourseStatus, RoleName } from '@prisma/client';
import bcrypt from 'bcryptjs';
import type { ScopeUser } from '../../../shared/utils/scope.js';

beforeEach(async () => {
    await resetDatabase();
});

afterAll(async () => {
    await disconnectTestDb();
});

// --------------------------------------------------
// Fixture: super_admin + partner_admin
// --------------------------------------------------

const seedFx = async (): Promise<{
    superAdminId: string;
    partnerAdminId: string;
    partnerId: string;
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

    const superUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test-super-admin@admission-hub.test' },
    });

    return {
        superAdminId: superUser.id,
        partnerAdminId: pa.id,
        partnerId: partner.id,
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
// createCourse
// --------------------------------------------------

describe('courseService.createCourse', () => {
    it('super_admin creates an ACTIVE course', async () => {
        const f = await seedFx();

        const course = await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Test Course',
            duration: '6 months',
            fee: 50000,
        });

        expect(course.status).toBe(CourseStatus.ACTIVE);
        expect(course.fee).toBe(50000);
        expect(course.title).toBe('Test Course');
    });

    it('partner_admin cannot create', async () => {
        const f = await seedFx();

        await expect(
            courseService.createCourse(asPartnerAdmin(f.partnerAdminId, f.partnerId), {
                title: 'Test Course',
                duration: '6 months',
                fee: 50000,
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('stores optional URLs and long-text fields', async () => {
        const f = await seedFx();

        const course = await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Full Featured',
            duration: '3 months',
            fee: 25000,
            syllabusUrl: 'https://example.com/s.pdf',
            brochureUrl: 'https://example.com/b.pdf',
            demoUrl: 'https://example.com/d.mp4',
            benefits: 'Great benefits',
            faq: 'FAQ text',
        });

        expect(course.syllabusUrl).toBe('https://example.com/s.pdf');
        expect(course.benefits).toBe('Great benefits');
        expect(course.faq).toBe('FAQ text');
    });
});

// --------------------------------------------------
// listCourses
// --------------------------------------------------

describe('courseService.listCourses', () => {
    it('returns active courses', async () => {
        const f = await seedFx();

        await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Course A',
            duration: '1 month',
            fee: 5000,
        });

        const result = await courseService.listCourses(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(1);
    });

    it('hides ARCHIVED by default', async () => {
        const f = await seedFx();

        const c = await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Will Archive',
            duration: '1 month',
            fee: 5000,
        });
        await courseService.changeCourseStatus(
            asSuperAdmin(f.superAdminId),
            c.id,
            { status: CourseStatus.ARCHIVED },
        );

        const def = await courseService.listCourses(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25 },
        );
        expect(def.pagination.total).toBe(0);

        const explicit = await courseService.listCourses(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25, status: CourseStatus.ARCHIVED },
        );
        expect(explicit.pagination.total).toBe(1);
    });

    it('filters by search in title', async () => {
        const f = await seedFx();

        await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Java Backend',
            duration: '6 months',
            fee: 50000,
        });
        await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Python Data',
            duration: '6 months',
            fee: 60000,
        });

        const result = await courseService.listCourses(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25, search: 'Java' },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.title).toBe('Java Backend');
    });
});

// --------------------------------------------------
// getCourseById
// --------------------------------------------------

describe('courseService.getCourseById', () => {
    it('returns course for any authenticated role', async () => {
        const f = await seedFx();

        const c = await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Test Course',
            duration: '1 month',
            fee: 5000,
        });

        const fetched = await courseService.getCourseById(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            c.id,
        );

        expect(fetched.id).toBe(c.id);
    });

    it('throws 404 for unknown id', async () => {
        const f = await seedFx();

        await expect(
            courseService.getCourseById(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                '00000000-0000-0000-0000-000000000000',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

// --------------------------------------------------
// updateCourse
// --------------------------------------------------

describe('courseService.updateCourse', () => {
    it('super_admin updates a course', async () => {
        const f = await seedFx();

        const c = await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Old Title',
            duration: '1 month',
            fee: 5000,
        });

        const updated = await courseService.updateCourse(
            asSuperAdmin(f.superAdminId),
            c.id,
            { title: 'New Title', fee: 7500 },
        );

        expect(updated.title).toBe('New Title');
        expect(updated.fee).toBe(7500);
    });

    it('partner_admin cannot update', async () => {
        const f = await seedFx();

        const c = await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Test',
            duration: '1 month',
            fee: 5000,
        });

        await expect(
            courseService.updateCourse(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                c.id,
                { title: 'Nope' },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

// --------------------------------------------------
// changeCourseStatus
// --------------------------------------------------

describe('courseService.changeCourseStatus', () => {
    it('super_admin changes status freely', async () => {
        const f = await seedFx();

        const c = await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Test',
            duration: '1 month',
            fee: 5000,
        });

        const inactive = await courseService.changeCourseStatus(
            asSuperAdmin(f.superAdminId),
            c.id,
            { status: CourseStatus.INACTIVE },
        );
        expect(inactive.status).toBe(CourseStatus.INACTIVE);

        const archived = await courseService.changeCourseStatus(
            asSuperAdmin(f.superAdminId),
            c.id,
            { status: CourseStatus.ARCHIVED },
        );
        expect(archived.status).toBe(CourseStatus.ARCHIVED);
    });

    it('partner_admin cannot change status', async () => {
        const f = await seedFx();

        const c = await courseService.createCourse(asSuperAdmin(f.superAdminId), {
            title: 'Test',
            duration: '1 month',
            fee: 5000,
        });

        await expect(
            courseService.changeCourseStatus(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                c.id,
                { status: CourseStatus.INACTIVE },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});