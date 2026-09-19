/**
 * test-db.ts - Test database helpers.
 *
 * Responsibilities:
 *   - Reset all tables between test files (clean slate).
 *   - Create fixture users, roles, and permissions.
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
import { RoleName } from '@prisma/client';

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
// Fixtures
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

/**
 * Seeds the minimum data required for auth tests.
 * Idempotent because we always resetDatabase first.
 */
export const seedAuthFixtures = async (): Promise<{
    superAdminId: string;
    partnerAdminId: string;
}> => {
    assertTestEnv();

    // Roles
    const superAdminRole = await prisma.role.create({
        data: { name: RoleName.SUPER_ADMIN, description: 'Test super admin' },
    });
    const partnerAdminRole = await prisma.role.create({
        data: { name: RoleName.PARTNER_ADMIN, description: 'Test partner admin' },
    });

    // Users
    const superAdmin = await prisma.user.create({
        data: {
            email: TEST_SUPER_ADMIN.email,
            name: TEST_SUPER_ADMIN.name,
            passwordHash: await bcrypt.hash(TEST_SUPER_ADMIN.password, 10),
            roleId: superAdminRole.id,
            status: 'ACTIVE',
        },
    });

    const partnerAdmin = await prisma.user.create({
        data: {
            email: TEST_PARTNER_ADMIN.email,
            name: TEST_PARTNER_ADMIN.name,
            passwordHash: await bcrypt.hash(TEST_PARTNER_ADMIN.password, 10),
            roleId: partnerAdminRole.id,
            status: 'ACTIVE',
        },
    });

    return {
        superAdminId: superAdmin.id,
        partnerAdminId: partnerAdmin.id,
    };
};

// --------------------------------------------------
// Teardown
// --------------------------------------------------

export const disconnectTestDb = async (): Promise<void> => {
    await prisma.$disconnect();
};