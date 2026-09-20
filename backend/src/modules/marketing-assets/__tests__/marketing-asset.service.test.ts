/**
 * marketing-asset.service.test.ts - Service-layer tests for marketing assets.
 *
 * Coverage:
 *   - createMarketingAsset: super_admin only, optional courseId validation
 *   - listMarketingAssets: global read, hides ARCHIVED, filters
 *   - getMarketingAssetById: 404 for unknown
 *   - updateMarketingAsset: super_admin only, courseId revalidation
 *   - archiveMarketingAsset: soft delete, blocks double archive
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as assetService from '../marketing-asset.service.js';
import {
    resetDatabase,
    seedAuthFixtures,
    disconnectTestDb,
} from '../../../../tests/helpers/test-db.js';
import { prisma } from '../../../config/prisma.js';
import { AssetStatus, RoleName } from '@prisma/client';
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
        data: {
            title: 'Test Course',
            duration: '3 months',
            fee: 30000,
        },
    });

    const superUser = await prisma.user.findUniqueOrThrow({
        where: { email: 'test-super-admin@admission-hub.test' },
    });

    return {
        superAdminId: superUser.id,
        partnerAdminId: pa.id,
        partnerId: partner.id,
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

// --------------------------------------------------
// createMarketingAsset
// --------------------------------------------------

describe('marketingAssetService.createMarketingAsset', () => {
    it('super_admin creates an ACTIVE asset', async () => {
        const f = await seedFx();

        const asset = await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Poster',
            type: 'POSTER',
            fileUrl: 'https://example.com/p.jpg',
            courseId: f.courseId,
        });

        expect(asset.status).toBe(AssetStatus.ACTIVE);
        expect(asset.type).toBe('POSTER');
        expect(asset.language).toBe('English');
        expect(asset.courseId).toBe(f.courseId);
    });

    it('partner_admin cannot create', async () => {
        const f = await seedFx();

        await expect(
            assetService.createMarketingAsset(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                {
                    title: 'Poster',
                    type: 'POSTER',
                    fileUrl: 'https://example.com/p.jpg',
                },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('rejects unknown courseId', async () => {
        const f = await seedFx();

        await expect(
            assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
                title: 'Poster',
                type: 'POSTER',
                fileUrl: 'https://example.com/p.jpg',
                courseId: '00000000-0000-0000-0000-000000000000',
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('creates asset without courseId (generic asset)', async () => {
        const f = await seedFx();

        const asset = await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Academy Brand Poster',
            type: 'POSTER',
            fileUrl: 'https://example.com/brand.jpg',
        });

        expect(asset.courseId).toBeNull();
        expect(asset.status).toBe(AssetStatus.ACTIVE);
    });
});

// --------------------------------------------------
// listMarketingAssets
// --------------------------------------------------

describe('marketingAssetService.listMarketingAssets', () => {
    it('lists active assets', async () => {
        const f = await seedFx();

        await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Poster A',
            type: 'POSTER',
            fileUrl: 'https://example.com/a.jpg',
        });
        await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Banner B',
            type: 'BANNER',
            fileUrl: 'https://example.com/b.jpg',
        });

        const result = await assetService.listMarketingAssets(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25 },
        );

        expect(result.pagination.total).toBe(2);
    });

    it('hides ARCHIVED by default', async () => {
        const f = await seedFx();

        const asset = await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'To Archive',
            type: 'POSTER',
            fileUrl: 'https://example.com/a.jpg',
        });
        await assetService.archiveMarketingAsset(asSuperAdmin(f.superAdminId), asset.id, {});

        const def = await assetService.listMarketingAssets(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25 },
        );
        expect(def.pagination.total).toBe(0);

        const explicit = await assetService.listMarketingAssets(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25, status: AssetStatus.ARCHIVED },
        );
        expect(explicit.pagination.total).toBe(1);
    });

    it('filters by type', async () => {
        const f = await seedFx();

        await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Poster',
            type: 'POSTER',
            fileUrl: 'https://example.com/p.jpg',
        });
        await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Video',
            type: 'VIDEO',
            fileUrl: 'https://example.com/v.mp4',
        });

        const result = await assetService.listMarketingAssets(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25, type: 'VIDEO' },
        );

        expect(result.pagination.total).toBe(1);
        expect(result.data[0]?.title).toBe('Video');
    });

    it('filters by courseId', async () => {
        const f = await seedFx();

        await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'For Course',
            type: 'POSTER',
            fileUrl: 'https://example.com/a.jpg',
            courseId: f.courseId,
        });
        await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Generic',
            type: 'POSTER',
            fileUrl: 'https://example.com/b.jpg',
        });

        const result = await assetService.listMarketingAssets(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            { page: 1, limit: 25, courseId: f.courseId },
        );

        expect(result.pagination.total).toBe(1);
    });
});

// --------------------------------------------------
// getMarketingAssetById
// --------------------------------------------------

describe('marketingAssetService.getMarketingAssetById', () => {
    it('returns asset for any authenticated role', async () => {
        const f = await seedFx();

        const asset = await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Poster',
            type: 'POSTER',
            fileUrl: 'https://example.com/p.jpg',
        });

        const fetched = await assetService.getMarketingAssetById(
            asPartnerAdmin(f.partnerAdminId, f.partnerId),
            asset.id,
        );
        expect(fetched.id).toBe(asset.id);
    });

    it('throws 404 for unknown id', async () => {
        const f = await seedFx();

        await expect(
            assetService.getMarketingAssetById(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                '00000000-0000-0000-0000-000000000000',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

// --------------------------------------------------
// updateMarketingAsset
// --------------------------------------------------

describe('marketingAssetService.updateMarketingAsset', () => {
    it('super_admin updates asset', async () => {
        const f = await seedFx();

        const asset = await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Old Title',
            type: 'POSTER',
            fileUrl: 'https://example.com/p.jpg',
        });

        const updated = await assetService.updateMarketingAsset(
            asSuperAdmin(f.superAdminId),
            asset.id,
            { title: 'New Title', language: 'Hindi' },
        );

        expect(updated.title).toBe('New Title');
        expect(updated.language).toBe('Hindi');
    });

    it('partner_admin cannot update', async () => {
        const f = await seedFx();

        const asset = await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Poster',
            type: 'POSTER',
            fileUrl: 'https://example.com/p.jpg',
        });

        await expect(
            assetService.updateMarketingAsset(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                asset.id,
                { title: 'Nope' },
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});

// --------------------------------------------------
// archiveMarketingAsset
// --------------------------------------------------

describe('marketingAssetService.archiveMarketingAsset', () => {
    it('soft-archives the asset', async () => {
        const f = await seedFx();

        const asset = await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Poster',
            type: 'POSTER',
            fileUrl: 'https://example.com/p.jpg',
        });

        const archived = await assetService.archiveMarketingAsset(
            asSuperAdmin(f.superAdminId),
            asset.id,
            {},
        );

        expect(archived.status).toBe(AssetStatus.ARCHIVED);

        // Row still exists in DB
        const dbRow = await prisma.marketingAsset.findUnique({
            where: { id: asset.id },
        });
        expect(dbRow).not.toBeNull();
        expect(dbRow?.status).toBe(AssetStatus.ARCHIVED);
    });

    it('rejects double-archive', async () => {
        const f = await seedFx();

        const asset = await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Poster',
            type: 'POSTER',
            fileUrl: 'https://example.com/p.jpg',
        });

        await assetService.archiveMarketingAsset(
            asSuperAdmin(f.superAdminId),
            asset.id,
            {},
        );

        await expect(
            assetService.archiveMarketingAsset(asSuperAdmin(f.superAdminId), asset.id, {}),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('partner_admin cannot archive', async () => {
        const f = await seedFx();

        const asset = await assetService.createMarketingAsset(asSuperAdmin(f.superAdminId), {
            title: 'Poster',
            type: 'POSTER',
            fileUrl: 'https://example.com/p.jpg',
        });

        await expect(
            assetService.archiveMarketingAsset(
                asPartnerAdmin(f.partnerAdminId, f.partnerId),
                asset.id,
                {},
            ),
        ).rejects.toMatchObject({ statusCode: 403 });
    });
});