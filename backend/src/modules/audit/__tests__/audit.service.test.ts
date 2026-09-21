/**
 * audit.service.test.ts - Service-layer tests for the audit module.
 *
 * Coverage:
 *   - listAuditLogs: super_admin only; filters by actor/partner/action/entity; date range
 *   - getAuditLogById: super_admin only; 404 for unknown
 *   - Access control: partner_admin/counselor blocked
 *   - logAction: appends a record; oldValue/newValue JSON preserved
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as auditService from '../audit.service.js';
import { logAction } from '../../../shared/utils/audit.js';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import { RoleName } from '@prisma/client';
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
const asCounselor = (id: string, partnerId: string): ScopeUser => ({
    id,
    role: 'COUNSELOR',
    partnerId,
});

// --------------------------------------------------
// Access control
// --------------------------------------------------

describe('auditService access control', () => {
    it('partner_admin cannot list audit logs', async () => {
        const f = await seedFx();

        await expect(
            auditService.listAuditLogs(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                { page: 1, limit: 50 },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('counselor cannot list audit logs', async () => {
        const f = await seedFx();

        await expect(
            auditService.listAuditLogs(asCounselor('x', f.partnerId), {
                page: 1,
                limit: 50,
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('partner_admin cannot get a single audit log', async () => {
        const f = await seedFx();

        await expect(
            auditService.getAuditLogById(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                '00000000-0000-0000-0000-000000000000',
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

// --------------------------------------------------
// logAction helper
// --------------------------------------------------

describe('logAction helper', () => {
    it('writes an audit record with oldValue and newValue', async () => {
        const f = await seedFx();

        await logAction({
            actorId: f.superAdminId,
            partnerId: f.partnerId,
            action: 'PARTNER_APPROVED',
            entityType: 'partner',
            entityId: f.partnerId,
            oldValue: { status: 'PENDING' },
            newValue: { status: 'ACTIVE' },
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
        });

        const rows = await prisma.auditLog.findMany();
        expect(rows.length).toBe(1);
        expect(rows[0]?.action).toBe('PARTNER_APPROVED');
        expect(rows[0]?.ipAddress).toBe('127.0.0.1');
        expect(rows[0]?.oldValue).toEqual({ status: 'PENDING' });
        expect(rows[0]?.newValue).toEqual({ status: 'ACTIVE' });
    });

    it('never throws when input is malformed', async () => {
        const f = await seedFx();

        // Pass a non-existent entityId — should still succeed (no FK on entityId)
        await expect(
            logAction({
                actorId: f.superAdminId,
                partnerId: null,
                action: 'SOMETHING',
                entityType: 'test',
                entityId: 'not-a-uuid',
            }),
        ).resolves.toBeUndefined();
    });
});

// --------------------------------------------------
// listAuditLogs
// --------------------------------------------------

describe('auditService.listAuditLogs', () => {
    it('returns empty list when no records', async () => {
        const f = await seedFx();

        const result = await auditService.listAuditLogs(
            asSuperAdmin(f.superAdminId),
            { page: 1, limit: 50 },
        );

        expect(result.pagination.total).toBe(0);
        expect(result.data.length).toBe(0);
    });

    it('returns records newest-first', async () => {
        const f = await seedFx();

        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'FIRST',
                entityType: 'test',
                entityId: 'a',
                createdAt: new Date('2026-09-01T00:00:00Z'),
            },
        });
        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'SECOND',
                entityType: 'test',
                entityId: 'b',
                createdAt: new Date('2026-09-02T00:00:00Z'),
            },
        });

        const result = await auditService.listAuditLogs(
            asSuperAdmin(f.superAdminId),
            { page: 1, limit: 50 },
        );

        expect(result.data[0]?.action).toBe('SECOND');
        expect(result.data[1]?.action).toBe('FIRST');
    });

    it('filters by action', async () => {
        const f = await seedFx();

        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'PARTNER_APPROVED',
                entityType: 'partner',
                entityId: 'a',
            },
        });
        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'USER_CREATED',
                entityType: 'user',
                entityId: 'b',
            },
        });

        const result = await auditService.listAuditLogs(
            asSuperAdmin(f.superAdminId),
            { page: 1, limit: 50, action: 'PARTNER_APPROVED' },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.action).toBe('PARTNER_APPROVED');
    });

    it('filters by entityType', async () => {
        const f = await seedFx();

        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'PARTNER_APPROVED',
                entityType: 'partner',
                entityId: 'a',
            },
        });
        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'USER_CREATED',
                entityType: 'user',
                entityId: 'b',
            },
        });

        const result = await auditService.listAuditLogs(
            asSuperAdmin(f.superAdminId),
            { page: 1, limit: 50, entityType: 'user' },
        );

        expect(result.pagination.total).toBe(1);
    });

    it('filters by actorId', async () => {
        const f = await seedFx();

        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'A',
                entityType: 'test',
                entityId: 'a',
            },
        });
        await prisma.auditLog.create({
            data: {
                userId: f.partnerAdminId,
                action: 'B',
                entityType: 'test',
                entityId: 'b',
            },
        });

        const result = await auditService.listAuditLogs(
            asSuperAdmin(f.superAdminId),
            { page: 1, limit: 50, actorId: f.partnerAdminId },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.userId).toBe(f.partnerAdminId);
    });

    it('filters by partnerId', async () => {
        const f = await seedFx();

        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                partnerId: f.partnerId,
                action: 'A',
                entityType: 'test',
                entityId: 'a',
            },
        });
        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'B',
                entityType: 'test',
                entityId: 'b',
            },
        });

        const result = await auditService.listAuditLogs(
            asSuperAdmin(f.superAdminId),
            { page: 1, limit: 50, partnerId: f.partnerId },
        );

        expect(result.pagination.total).toBe(1);
    });

    it('filters by date range', async () => {
        const f = await seedFx();

        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'OLD',
                entityType: 'test',
                entityId: 'a',
                createdAt: new Date('2026-01-01T00:00:00Z'),
            },
        });
        await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'NEW',
                entityType: 'test',
                entityId: 'b',
                createdAt: new Date('2026-06-01T00:00:00Z'),
            },
        });

        const result = await auditService.listAuditLogs(
            asSuperAdmin(f.superAdminId),
            {
                page: 1,
                limit: 50,
                from: new Date('2026-03-01T00:00:00Z'),
                to: new Date('2026-09-01T00:00:00Z'),
            },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.action).toBe('NEW');
    });
});

// --------------------------------------------------
// getAuditLogById
// --------------------------------------------------

describe('auditService.getAuditLogById', () => {
    it('returns the record by id', async () => {
        const f = await seedFx();

        const created = await prisma.auditLog.create({
            data: {
                userId: f.superAdminId,
                action: 'TEST',
                entityType: 'test',
                entityId: 'x',
            },
        });

        const result = await auditService.getAuditLogById(
            asSuperAdmin(f.superAdminId),
            created.id,
        );

        expect(result.id).toBe(created.id);
        expect(result.action).toBe('TEST');
    });

    it('throws 404 for unknown id', async () => {
        const f = await seedFx();

        await expect(
            auditService.getAuditLogById(
                asSuperAdmin(f.superAdminId),
                '00000000-0000-0000-0000-000000000000',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});