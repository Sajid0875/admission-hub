/**
 * user.service.test.ts - Service-layer tests for the users module.
 *
 * Coverage:
 *   - listUsers: super admin sees all, partner admin sees own org, filters, pagination
 *   - getUserById: scope enforcement (super vs partner)
 *   - createUser: super admin capabilities, partner admin limits, SUPER_ADMIN block, email conflict
 *   - updateUser: name + phone, scope enforcement
 *   - changeStatus: super admin only, cannot suspend self
 *   - changeRole: super admin only, cannot promote to SUPER_ADMIN, cannot change self
 *
 * Uses the real test DB (admission_hub_test), reset before each test.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as userService from '../user.service.js';
import {
  resetDatabase,
  seedAuthFixtures,
  seedPartnerFixture,
  disconnectTestDb,
  TEST_SUPER_ADMIN,
  TEST_PARTNER_ADMIN,
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
// Helpers
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
// listUsers
// --------------------------------------------------

describe('userService.listUsers', () => {
  it('super admin sees all users across all partners', async () => {
    const { superAdminId } = await seedAuthFixtures();
    const { partnerAdminId } = await seedPartnerFixture();

    const result = await userService.listUsers(asSuperAdmin(superAdminId), {
      page: 1,
      limit: 25,
    });

    expect(result.pagination.total).toBe(3);
    const ids = result.data.map((u) => u.id).sort();
    expect(ids).toContain(superAdminId);
    expect(ids).toContain(partnerAdminId);
  });

  it('partner admin sees only own org users', async () => {
    const { superAdminId } = await seedAuthFixtures();
    const { partnerAdminId, partnerId } = await seedPartnerFixture();

    const result = await userService.listUsers(
      asPartnerAdmin(partnerAdminId, partnerId),
      { page: 1, limit: 25 },
    );

    expect(result.pagination.total).toBe(1);
    expect(result.data[0]?.id).toBe(partnerAdminId);
    expect(result.data.find((u) => u.id === superAdminId)).toBeUndefined();
  });

  it('filters by role', async () => {
    const { superAdminId } = await seedAuthFixtures();
    await seedPartnerFixture();

    const result = await userService.listUsers(asSuperAdmin(superAdminId), {
      page: 1,
      limit: 25,
      role: 'PARTNER_ADMIN',
    });

    expect(result.pagination.total).toBe(2);
    expect(result.data.every((u) => u.role === 'PARTNER_ADMIN')).toBe(true);
  });

  it('filters by status', async () => {
    const { superAdminId } = await seedAuthFixtures();
    await seedPartnerFixture();

    const result = await userService.listUsers(asSuperAdmin(superAdminId), {
      page: 1,
      limit: 25,
      status: 'SUSPENDED',
    });

    expect(result.pagination.total).toBe(0);
  });

  it('paginates correctly', async () => {
    const { superAdminId } = await seedAuthFixtures();
    await seedPartnerFixture();

    const page1 = await userService.listUsers(asSuperAdmin(superAdminId), {
      page: 1,
      limit: 1,
    });

    expect(page1.data.length).toBe(1);
    expect(page1.pagination.total).toBe(3);
    expect(page1.pagination.totalPages).toBe(3);
  });
});

// --------------------------------------------------
// getUserById
// --------------------------------------------------

describe('userService.getUserById', () => {
  it('super admin can fetch any user', async () => {
    const { superAdminId } = await seedAuthFixtures();
    const { partnerAdminId } = await seedPartnerFixture();

    const user = await userService.getUserById(
      asSuperAdmin(superAdminId),
      partnerAdminId,
    );

    expect(user.id).toBe(partnerAdminId);
  });

  it('partner admin can fetch own org user', async () => {
    await seedAuthFixtures();
    const { partnerAdminId, partnerId } = await seedPartnerFixture();

    const user = await userService.getUserById(
      asPartnerAdmin(partnerAdminId, partnerId),
      partnerAdminId,
    );

    expect(user.id).toBe(partnerAdminId);
  });

  it('partner admin cannot fetch another org user', async () => {
    const { superAdminId } = await seedAuthFixtures();
    const { partnerId } = await seedPartnerFixture();

    // Actor is a partner admin from a *different* org
    await expect(
      userService.getUserById(asPartnerAdmin('other-id', 'other-partner'), superAdminId),
    ).rejects.toMatchObject({ statusCode: 403 });

    // Same thing but with a real partnerId, to make the scope check fire
    await expect(
      userService.getUserById(asPartnerAdmin('other-id', partnerId), superAdminId),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// --------------------------------------------------
// createUser
// --------------------------------------------------

describe('userService.createUser', () => {
  it('super admin can create a partner admin', async () => {
    const { superAdminId } = await seedAuthFixtures();
    const { partnerId } = await seedPartnerFixture();

    const result = await userService.createUser(asSuperAdmin(superAdminId), {
      name: 'New Admin',
      email: 'new-admin@admission-hub.test',
      role: 'PARTNER_ADMIN',
      partnerId,
    });

    expect(result.user.email).toBe('new-admin@admission-hub.test');
    expect(result.user.role).toBe('PARTNER_ADMIN');
    expect(result.user.partnerId).toBe(partnerId);
    expect(result.temporaryPassword).toBeTypeOf('string');
    expect(result.temporaryPassword.length).toBeGreaterThan(8);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('nobody can create a SUPER_ADMIN', async () => {
    const { superAdminId } = await seedAuthFixtures();

    await expect(
      userService.createUser(asSuperAdmin(superAdminId), {
        name: 'Should Fail',
        email: 'should-fail@admission-hub.test',
        role: 'SUPER_ADMIN',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Cannot create or assign SUPER_ADMIN via the API',
    });
  });

  it('partner admin cannot create a PARTNER_ADMIN', async () => {
    await seedAuthFixtures();
    const { partnerAdminId, partnerId } = await seedPartnerFixture();

    await expect(
      userService.createUser(asPartnerAdmin(partnerAdminId, partnerId), {
        name: 'Another Admin',
        email: 'another-admin@admission-hub.test',
        role: 'PARTNER_ADMIN',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('partner admin cannot create users in another partner', async () => {
    await seedAuthFixtures();
    const { partnerAdminId, partnerId } = await seedPartnerFixture();

    await expect(
      userService.createUser(asPartnerAdmin(partnerAdminId, partnerId), {
        name: 'Cross Tenant',
        email: 'cross-tenant@admission-hub.test',
        role: 'COUNSELOR',
        partnerId: 'other-partner-uuid',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects duplicate email with 409', async () => {
    const { superAdminId } = await seedAuthFixtures();

    // Create first user
    await userService.createUser(asSuperAdmin(superAdminId), {
      name: 'First',
      email: 'dup@admission-hub.test',
      role: 'COUNSELOR',
      partnerId: null,
    }).catch(() => {
      // Ignore — actually can't create COUNSELOR without partner; we'll use a different role
    });

    // Create a real user
    const { partnerId } = await seedPartnerFixture();
    await userService.createUser(asSuperAdmin(superAdminId), {
      name: 'Original',
      email: 'dup-real@admission-hub.test',
      role: 'PARTNER_ADMIN',
      partnerId,
    });

    await expect(
      userService.createUser(asSuperAdmin(superAdminId), {
        name: 'Duplicate',
        email: 'dup-real@admission-hub.test',
        role: 'PARTNER_ADMIN',
        partnerId,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

// --------------------------------------------------
// updateUser
// --------------------------------------------------

describe('userService.updateUser', () => {
  it('super admin can update any user', async () => {
    const { superAdminId } = await seedAuthFixtures();

    const updated = await userService.updateUser(
      asSuperAdmin(superAdminId),
      superAdminId,
      { name: 'Renamed Super' },
    );

    expect(updated.name).toBe('Renamed Super');
  });

  it('partner admin can update own org user', async () => {
    await seedAuthFixtures();
    const { partnerAdminId, partnerId } = await seedPartnerFixture();

    const updated = await userService.updateUser(
      asPartnerAdmin(partnerAdminId, partnerId),
      partnerAdminId,
      { phone: '8888888888' },
    );

    expect(updated.phone).toBe('8888888888');
  });

  it('partner admin cannot update another org user', async () => {
    const { superAdminId } = await seedAuthFixtures();
    const { partnerId } = await seedPartnerFixture();

    await expect(
      userService.updateUser(
        asPartnerAdmin('other', partnerId),
        superAdminId,
        { name: 'Hacked' },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// --------------------------------------------------
// changeStatus
// --------------------------------------------------

describe('userService.changeStatus', () => {
  it('super admin can suspend another user', async () => {
    const { superAdminId } = await seedAuthFixtures();
    const { partnerAdminId } = await seedPartnerFixture();

    const updated = await userService.changeStatus(
      asSuperAdmin(superAdminId),
      partnerAdminId,
      { status: 'SUSPENDED' },
    );

    expect(updated.status).toBe('SUSPENDED');
  });

  it('super admin cannot suspend self', async () => {
    const { superAdminId } = await seedAuthFixtures();

    await expect(
      userService.changeStatus(asSuperAdmin(superAdminId), superAdminId, {
        status: 'SUSPENDED',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('partner admin cannot change status', async () => {
    await seedAuthFixtures();
    const { partnerAdminId, partnerId } = await seedPartnerFixture();

    await expect(
      userService.changeStatus(
        asPartnerAdmin(partnerAdminId, partnerId),
        partnerAdminId,
        { status: 'SUSPENDED' },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// --------------------------------------------------
// changeRole
// --------------------------------------------------

describe('userService.changeRole', () => {
  it('super admin can change another user role', async () => {
    const { superAdminId } = await seedAuthFixtures();
    const { partnerAdminId } = await seedPartnerFixture();

    const updated = await userService.changeRole(
      asSuperAdmin(superAdminId),
      partnerAdminId,
      { role: 'COUNSELOR' },
    );

    expect(updated.role).toBe('COUNSELOR');
  });

  it('nobody can promote to SUPER_ADMIN', async () => {
    const { superAdminId } = await seedAuthFixtures();
    const { partnerAdminId } = await seedPartnerFixture();

    await expect(
      userService.changeRole(asSuperAdmin(superAdminId), partnerAdminId, {
        role: 'SUPER_ADMIN',
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('super admin cannot change own role', async () => {
    const { superAdminId } = await seedAuthFixtures();

    await expect(
      userService.changeRole(asSuperAdmin(superAdminId), superAdminId, {
        role: 'PARTNER_ADMIN',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('partner admin cannot change role', async () => {
    await seedAuthFixtures();
    const { partnerAdminId, partnerId } = await seedPartnerFixture();

    await expect(
      userService.changeRole(
        asPartnerAdmin(partnerAdminId, partnerId),
        partnerAdminId,
        { role: 'COUNSELOR' },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});