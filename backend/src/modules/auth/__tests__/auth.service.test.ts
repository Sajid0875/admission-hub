/**
 * auth.service.test.ts - Service-layer tests for the auth module.
 *
 * Scope:
 *   - login: happy path, wrong password, unknown email, inactive account
 *   - SafeUser shape: no passwordHash leak
 *   - getCurrentUser: happy path, unknown id, inactive account
 *
 * Uses a real Postgres test DB (admission_hub_test), reset before each test.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as authService from '../auth.service.js';
import {
  resetDatabase,
  seedAuthFixtures,
  disconnectTestDb,
  TEST_SUPER_ADMIN,
  TEST_PARTNER_ADMIN,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';

// --------------------------------------------------
// Lifecycle
// --------------------------------------------------

beforeEach(async () => {
  await resetDatabase();
  await seedAuthFixtures();
});

afterAll(async () => {
  await disconnectTestDb();
});

// --------------------------------------------------
// login
// --------------------------------------------------

describe('authService.login', () => {
  it('returns a token and safe user for valid credentials', async () => {
    const result = await authService.login({
      email: TEST_SUPER_ADMIN.email,
      password: TEST_SUPER_ADMIN.password,
    });

    expect(result.token).toBeTypeOf('string');
    expect(result.token.length).toBeGreaterThan(20);
    expect(result.user.email).toBe(TEST_SUPER_ADMIN.email);
    expect(result.user.role).toBe('SUPER_ADMIN');
    expect(result.user.status).toBe('ACTIVE');
  });

  it('never returns passwordHash in the user payload', async () => {
    const result = await authService.login({
      email: TEST_SUPER_ADMIN.email,
      password: TEST_SUPER_ADMIN.password,
    });

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(result.user)).not.toContain('$2a$');
    expect(JSON.stringify(result.user)).not.toContain('$2b$');
  });

  it('lowercases and trims the email', async () => {
    const result = await authService.login({
      email: `  ${TEST_SUPER_ADMIN.email.toUpperCase()}  `,
      password: TEST_SUPER_ADMIN.password,
    });

    expect(result.user.email).toBe(TEST_SUPER_ADMIN.email);
  });

  it('throws Unauthorized for a wrong password', async () => {
    await expect(
      authService.login({
        email: TEST_SUPER_ADMIN.email,
        password: 'wrong-password-here',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
    });
  });

  it('throws Unauthorized for an unknown email', async () => {
    await expect(
      authService.login({
        email: 'does-not-exist@admission-hub.test',
        password: 'whatever',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid email or password',
    });
  });

  it('throws Forbidden for a suspended account', async () => {
    // Suspend the super admin
    await prisma.user.update({
      where: { email: TEST_SUPER_ADMIN.email },
      data: { status: 'SUSPENDED' },
    });

    await expect(
      authService.login({
        email: TEST_SUPER_ADMIN.email,
        password: TEST_SUPER_ADMIN.password,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Account is not active',
    });
  });

  it('updates lastLoginAt on successful login', async () => {
    const before = await prisma.user.findUnique({
      where: { email: TEST_SUPER_ADMIN.email },
      select: { lastLoginAt: true },
    });

    expect(before?.lastLoginAt).toBeNull();

    await authService.login({
      email: TEST_SUPER_ADMIN.email,
      password: TEST_SUPER_ADMIN.password,
    });

    // lastLoginAt update is fire-and-forget; poll briefly
    const after = await prisma.user.findUnique({
      where: { email: TEST_SUPER_ADMIN.email },
      select: { lastLoginAt: true },
    });

    // Wait up to ~500ms for the async update to land
    let attempts = 0;
    while (!after?.lastLoginAt && attempts < 10) {
      await new Promise((r) => setTimeout(r, 50));
      const polled = await prisma.user.findUnique({
        where: { email: TEST_SUPER_ADMIN.email },
        select: { lastLoginAt: true },
      });
      if (polled?.lastLoginAt) {
        expect(polled.lastLoginAt).toBeInstanceOf(Date);
        return;
      }
      attempts += 1;
    }

    // If we got here, the update never landed
    const finalCheck = await prisma.user.findUnique({
      where: { email: TEST_SUPER_ADMIN.email },
      select: { lastLoginAt: true },
    });
    expect(finalCheck?.lastLoginAt).toBeInstanceOf(Date);
  });

  it('works for the partner admin user too', async () => {
    const result = await authService.login({
      email: TEST_PARTNER_ADMIN.email,
      password: TEST_PARTNER_ADMIN.password,
    });

    expect(result.user.role).toBe('PARTNER_ADMIN');
    expect(result.user.email).toBe(TEST_PARTNER_ADMIN.email);
  });

  it('returns a refreshToken and persists a hashed row', async () => {
    const result = await authService.login({
      email: TEST_SUPER_ADMIN.email,
      password: TEST_SUPER_ADMIN.password,
    });

    expect(result.refreshToken).toBeTypeOf('string');
    expect(result.refreshToken.length).toBeGreaterThan(20);

    const rows = await prisma.refreshToken.findMany();
    expect(rows).toHaveLength(1);
    // Raw token must never be stored — only the hash
    expect(rows[0]?.token).not.toBe(result.refreshToken);
  });
});

// --------------------------------------------------
// refresh / logout
// --------------------------------------------------

describe('authService.refresh', () => {
  it('rotates tokens and invalidates the old refresh token', async () => {
    const loginResult = await authService.login({
      email: TEST_SUPER_ADMIN.email,
      password: TEST_SUPER_ADMIN.password,
    });

    const refreshed = await authService.refresh(loginResult.refreshToken);

    expect(refreshed.token).toBeTypeOf('string');
    expect(refreshed.refreshToken).toBeTypeOf('string');
    expect(refreshed.refreshToken).not.toBe(loginResult.refreshToken);

    await expect(
      authService.refresh(loginResult.refreshToken),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid refresh token',
    });
  });

  it('throws Unauthorized for a garbage refresh token', async () => {
    await expect(
      authService.refresh('not-a-real-refresh-token'),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Invalid refresh token',
    });
  });
});

describe('authService.logout', () => {
  it('revokes the refresh token so it cannot be reused', async () => {
    const loginResult = await authService.login({
      email: TEST_SUPER_ADMIN.email,
      password: TEST_SUPER_ADMIN.password,
    });

    await authService.logout(loginResult.refreshToken);

    expect(await prisma.refreshToken.count()).toBe(0);

    await expect(
      authService.refresh(loginResult.refreshToken),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('is idempotent for unknown tokens', async () => {
    await expect(
      authService.logout('already-gone-token'),
    ).resolves.toBeUndefined();
  });
});

// --------------------------------------------------
// getCurrentUser
// --------------------------------------------------

describe('authService.getCurrentUser', () => {
  it('returns a safe user for a valid id', async () => {
    const superAdmin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_SUPER_ADMIN.email },
      select: { id: true },
    });

    const user = await authService.getCurrentUser(superAdmin.id);

    expect(user.id).toBe(superAdmin.id);
    expect(user.email).toBe(TEST_SUPER_ADMIN.email);
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('throws Unauthorized for an unknown user id', async () => {
    await expect(
      authService.getCurrentUser('00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'User not found',
    });
  });

  it('throws Forbidden for an inactive user', async () => {
    await prisma.user.update({
      where: { email: TEST_SUPER_ADMIN.email },
      data: { status: 'SUSPENDED' },
    });

    const superAdmin = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_SUPER_ADMIN.email },
      select: { id: true },
    });

    await expect(
      authService.getCurrentUser(superAdmin.id),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Account is not active',
    });
  });
});