/**
 * test-db.ts - Test database helpers.
 *
 * Responsibilities:
 *   - Reset all tables between test files (clean slate).
 *   - Create fixture users, roles, permissions, partners.
 *   - Force the DB into a known state before each test file runs.
 *
 * Safety:
 *   - Refuses to run if NODE_ENV !== 'test'.
 *   - Refuses to run if DATABASE_URL is not the test DB.
 *
 * Uses only Prisma — no raw SQL. Keeps helpers future-proof against schema changes.
 */

import { prisma } from '../../src/config/prisma.js';
import bcrypt from 'bcryptjs';
import { RoleName, PartnerStatus, CommissionType, UserStatus } from '@prisma/client';

// --------------------------------------------------
// Safety guards
// --------------------------------------------------

const assertTestEnv = (): void => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error(
            `[test-db] Refusing to run: NODE_ENV="${process.env.NODE_ENV}", expected "test".`,
        );
    }
    const dbUrl = process.env.DATABASE_URL ?? '';
    if (!dbUrl.includes('admission_hub_test')) {
        throw new Error(
            `[test-db] Refusing to run: DATABASE_URL does not point at admission_hub_test.`,
        );
    }
};

// --------------------------------------------------
// Reset
// --------------------------------------------------

/**
 * Truncates all data tables in dependency-safe order.
 * Does NOT touch `_prisma_migrations`.
 */
export const resetDatabase = async (): Promise<void> => {
    assertTestEnv();

    // Order matters: children before parents to satisfy FK constraints.
    await prisma.$transaction([
        prisma.auditLog.deleteMany(),
        prisma.notification.deleteMany(),
        prisma.commissionRecord.deleteMany(),
        prisma.commissionRule.deleteMany(),
        prisma.payment.deleteMany(),
        prisma.admission.deleteMany(),
        prisma.followUp.deleteMany(),
        prisma.leadActivity.deleteMany(),
        prisma.lead.deleteMany(),
        prisma.marketingAsset.deleteMany(),
        prisma.course.deleteMany(),
        prisma.refreshToken.deleteMany(),
        prisma.rolePermission.deleteMany(),
        prisma.user.deleteMany(),
        prisma.permission.deleteMany(),
        prisma.role.deleteMany(),
        prisma.partner.deleteMany(),
    ]);
};

// --------------------------------------------------
// Fixture constants
// --------------------------------------------------

export const TEST_SUPER_ADMIN = {
    email: 'test-super-admin@admission-hub.test',
    password: 'TestPass!Super1',
    name: 'Test Super Admin',
} as const;

export const TEST_PARTNER_ADMIN = {
    email: 'test-partner-admin@admission-hub.test',
    password: 'TestPass!Partner1',
    name: 'Test Partner Admin',
} as const;

export const TEST_PARTNER_FIXTURE_ADMIN = {
    email: 'test-partner-fixture-admin@admission-hub.test',
    password: 'TestPass!PartnerFixture1',
    name: 'Test Partner Fixture Admin',
} as const;

export const TEST_PARTNER = {
    academyName: 'Test Academy',
    partnerName: 'Test Partner',
    ownerName: 'Test Owner',
    email: 'test-partner@admission-hub.test',
    mobile: '9999999999',
} as const;

// --------------------------------------------------
// Fixtures — Auth
// --------------------------------------------------

/**
 * Seeds the minimum data required for auth tests.
 * Idempotent because we always resetDatabase first.
 */
export const seedAuthFixtures = async (): Promise<{
    superAdminId: string;
    partnerAdminId: string;
}> => {
    assertTestEnv();

    // Roles — seed all four so tests can reference any of them
    const superAdminRole = await prisma.role.create({
        data: { name: RoleName.SUPER_ADMIN, description: 'Test super admin' },
    });
    const partnerAdminRole = await prisma.role.create({
        data: { name: RoleName.PARTNER_ADMIN, description: 'Test partner admin' },
    });
    await prisma.role.create({
        data: { name: RoleName.COUNSELOR, description: 'Test counselor' },
    });
    await prisma.role.create({
        data: { name: RoleName.SUPPORT, description: 'Test support' },
    });

    // Users
    const superAdmin = await prisma.user.create({
        data: {
            email: TEST_SUPER_ADMIN.email,
            name: TEST_SUPER_ADMIN.name,
            passwordHash: await bcrypt.hash(TEST_SUPER_ADMIN.password, 10),
            roleId: superAdminRole.id,
            status: UserStatus.ACTIVE,
        },
    });

    const partnerAdmin = await prisma.user.create({
        data: {
            email: TEST_PARTNER_ADMIN.email,
            name: TEST_PARTNER_ADMIN.name,
            passwordHash: await bcrypt.hash(TEST_PARTNER_ADMIN.password, 10),
            roleId: partnerAdminRole.id,
            status: UserStatus.ACTIVE,
        },
    });

    return {
        superAdminId: superAdmin.id,
        partnerAdminId: partnerAdmin.id,
    };
};

// --------------------------------------------------
// Fixtures — Partners
// --------------------------------------------------

/**
 * Seeds a Partner + a partner_admin user attached to it.
 *
 * Assumes `seedAuthFixtures` has NOT been called (this function creates
 * the PARTNER_ADMIN role fresh). Call it after `resetDatabase`.
 */
export const seedPartnerFixture = async (): Promise<{
    partnerId: string;
    partnerAdminId: string;
}> => {
    assertTestEnv();

    // Ensure PARTNER_ADMIN role exists
    const partnerAdminRole = await prisma.role.upsert({
        where: { name: RoleName.PARTNER_ADMIN },
        update: {},
        create: { name: RoleName.PARTNER_ADMIN, description: 'Test partner admin' },
    });

    // Ensure PARTNER_ADMIN role exists
    const partner = await prisma.partner.create({
        data: {
            academyName: TEST_PARTNER.academyName,
            partnerName: TEST_PARTNER.partnerName,
            ownerName: TEST_PARTNER.ownerName,
            email: TEST_PARTNER.email,
            mobile: TEST_PARTNER.mobile,
            commissionType: CommissionType.PERCENTAGE,
            status: PartnerStatus.ACTIVE,
        },
    });

    const partnerAdmin = await prisma.user.create({
        data: {
            email: TEST_PARTNER_FIXTURE_ADMIN.email,
            name: TEST_PARTNER_FIXTURE_ADMIN.name,
            passwordHash: await bcrypt.hash(TEST_PARTNER_FIXTURE_ADMIN.password, 10),
            roleId: partnerAdminRole.id,
            partnerId: partner.id,
            status: UserStatus.ACTIVE,
        },
    });

    return {
        partnerId: partner.id,
        partnerAdminId: partnerAdmin.id,
    };
};

// --------------------------------------------------
// Teardown
// --------------------------------------------------

export const disconnectTestDb = async (): Promise<void> => {
    await prisma.$disconnect();
};