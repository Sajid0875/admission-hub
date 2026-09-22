/**
 * marketing-asset.service.ts - Marketing asset business logic.
 *
 * Responsibilities:
 *   - List / get assets (global read)
 *   - Create / update / archive (super_admin only)
 *   - Validate course existence when courseId provided
 *   - Soft-archive instead of hard delete
 *
 * Enforces:
 *   - Only super_admin can write
 *   - Assets are globally readable
 *   - Archived assets hidden from default list
 */

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError,
} from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';
import { AssetStatus } from '@prisma/client';
import type {
    ArchiveMarketingAssetInput,
    CreateMarketingAssetInput,
    ListMarketingAssetsQuery,
    UpdateMarketingAssetInput,
} from './marketing-asset.schema.js';

// --------------------------------------------------
// Public shape
// --------------------------------------------------

export interface SafeMarketingAsset {
    id: string;
    courseId: string | null;
    title: string;
    type: string;
    fileUrl: string;
    thumbnailUrl: string | null;
    language: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const toSafeMarketingAsset = (row: {
    id: string;
    courseId: string | null;
    title: string;
    type: string;
    fileUrl: string;
    thumbnailUrl: string | null;
    language: string;
    status: AssetStatus;
    createdAt: Date;
    updatedAt: Date;
}): SafeMarketingAsset => ({
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    type: row.type,
    fileUrl: row.fileUrl,
    thumbnailUrl: row.thumbnailUrl,
    language: row.language,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

// --------------------------------------------------
// Permission helper
// --------------------------------------------------

const assertSuperAdmin = (actor: ScopeUser): void => {
    if (actor.role !== 'SUPER_ADMIN') {
        throw ForbiddenError('Only SUPER_ADMIN can manage marketing assets');
    }
};

// --------------------------------------------------
// List
// --------------------------------------------------

export interface ListMarketingAssetsResult {
    data: SafeMarketingAsset[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listMarketingAssets = async (
    _actor: ScopeUser,
    query: ListMarketingAssetsQuery,
): Promise<ListMarketingAssetsResult> => {
    const where: Record<string, unknown> = {};

    // Default: hide ARCHIVED unless explicitly requested
    if (query.status) {
        where.status = query.status;
    } else {
        where.status = { not: AssetStatus.ARCHIVED };
    }

    if (query.type) where.type = query.type;
    if (query.language) where.language = query.language;
    if (query.courseId) where.courseId = query.courseId;

    if (query.search) {
        where.title = { contains: query.search, mode: 'insensitive' };
    }

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.marketingAsset.count({ where }),
        prisma.marketingAsset.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(toSafeMarketingAsset),
        pagination: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit),
        },
    };
};

// --------------------------------------------------
// Get by id
// --------------------------------------------------

export const getMarketingAssetById = async (
    _actor: ScopeUser,
    assetId: string,
): Promise<SafeMarketingAsset> => {
    const row = await prisma.marketingAsset.findUnique({
        where: { id: assetId },
    });

    if (!row) throw NotFoundError('Marketing asset not found');

    return toSafeMarketingAsset(row);
};

// --------------------------------------------------
// Create
// --------------------------------------------------

export const createMarketingAsset = async (
    actor: ScopeUser,
    input: CreateMarketingAssetInput,
): Promise<SafeMarketingAsset> => {
    assertSuperAdmin(actor);

    // If courseId provided, validate course exists
    if (input.courseId) {
        const course = await prisma.course.findUnique({
            where: { id: input.courseId },
            select: { id: true },
        });
        if (!course) throw BadRequestError('Course not found');
    }

    const created = await prisma.marketingAsset.create({
        data: {
            courseId: input.courseId ?? null,
            title: input.title,
            type: input.type,
            fileUrl: input.fileUrl,
            thumbnailUrl: input.thumbnailUrl ?? null,
            language: input.language ?? 'English',
            status: input.status ?? AssetStatus.ACTIVE,
        },
    });

    logger.info(
        { actorId: actor.id, assetId: created.id, type: created.type },
        'marketing asset created',
    );

    return toSafeMarketingAsset(created);
};

// --------------------------------------------------
// Update
// --------------------------------------------------

export const updateMarketingAsset = async (
    actor: ScopeUser,
    assetId: string,
    input: UpdateMarketingAssetInput,
): Promise<SafeMarketingAsset> => {
    assertSuperAdmin(actor);

    const existing = await prisma.marketingAsset.findUnique({
        where: { id: assetId },
        select: { id: true },
    });
    if (!existing) throw NotFoundError('Marketing asset not found');

    // Validate course if changing courseId
    if (input.courseId) {
        const course = await prisma.course.findUnique({
            where: { id: input.courseId },
            select: { id: true },
        });
        if (!course) throw BadRequestError('Course not found');
    }

    const updated = await prisma.marketingAsset.update({
        where: { id: assetId },
        data: {
            title: input.title ?? undefined,
            type: input.type ?? undefined,
            fileUrl: input.fileUrl ?? undefined,
            thumbnailUrl: input.thumbnailUrl ?? undefined,
            language: input.language ?? undefined,
            courseId: input.courseId ?? undefined,
            status: input.status ?? undefined,
        },
    });

    logger.info({ actorId: actor.id, assetId }, 'marketing asset updated');

    return toSafeMarketingAsset(updated);
};

// --------------------------------------------------
// Archive (soft delete)
// --------------------------------------------------

export const archiveMarketingAsset = async (
    actor: ScopeUser,
    assetId: string,
    _input: ArchiveMarketingAssetInput,
): Promise<SafeMarketingAsset> => {
    assertSuperAdmin(actor);

    const existing = await prisma.marketingAsset.findUnique({
        where: { id: assetId },
        select: { id: true, status: true },
    });
    if (!existing) throw NotFoundError('Marketing asset not found');

    if (existing.status === AssetStatus.ARCHIVED) {
        throw BadRequestError('Marketing asset is already archived');
    }

    const archived = await prisma.marketingAsset.update({
        where: { id: assetId },
        data: { status: AssetStatus.ARCHIVED },
    });

    logger.info({ actorId: actor.id, assetId }, 'marketing asset archived');

    return toSafeMarketingAsset(archived);
};