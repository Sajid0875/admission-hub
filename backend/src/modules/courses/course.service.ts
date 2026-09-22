/**
 * course.service.ts - Course catalog business logic.
 *
 * Responsibilities:
 *   - List / get courses (global catalog, read by any authenticated user)
 *   - Create / update / change status (super_admin only)
 *   - Archive instead of delete
 *
 * Enforces:
 *   - Only super_admin can write
 *   - Fee stays positive (schema validated)
 *   - Archived courses remain readable for historical admissions
 */

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import {
    ForbiddenError,
    NotFoundError,
} from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';
import { CourseStatus } from '@prisma/client';
import type {
    ChangeCourseStatusInput,
    CreateCourseInput,
    ListCoursesQuery,
    UpdateCourseInput,
} from './course.schema.js';

// --------------------------------------------------
// Public shape
// --------------------------------------------------

export interface SafeCourse {
    id: string;
    title: string;
    description: string | null;
    duration: string;
    fee: number;
    syllabusUrl: string | null;
    brochureUrl: string | null;
    demoUrl: string | null;
    benefits: string | null;
    faq: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

const toSafeCourse = (row: {
    id: string;
    title: string;
    description: string | null;
    duration: string;
    fee: unknown;
    syllabusUrl: string | null;
    brochureUrl: string | null;
    demoUrl: string | null;
    benefits: string | null;
    faq: string | null;
    status: CourseStatus;
    createdAt: Date;
    updatedAt: Date;
}): SafeCourse => ({
    id: row.id,
    title: row.title,
    description: row.description,
    duration: row.duration,
    fee: Number(row.fee),
    syllabusUrl: row.syllabusUrl,
    brochureUrl: row.brochureUrl,
    demoUrl: row.demoUrl,
    benefits: row.benefits,
    faq: row.faq,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
});

// --------------------------------------------------
// Permission helper
// --------------------------------------------------

const assertSuperAdmin = (actor: ScopeUser): void => {
    if (actor.role !== 'SUPER_ADMIN') {
        throw ForbiddenError('Only SUPER_ADMIN can manage courses');
    }
};

// --------------------------------------------------
// List
// --------------------------------------------------

export interface ListCoursesResult {
    data: SafeCourse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const listCourses = async (
    _actor: ScopeUser,
    query: ListCoursesQuery,
): Promise<ListCoursesResult> => {
    const where: Record<string, unknown> = {};

    // Default: hide ARCHIVED unless explicitly requested
    if (query.status) {
        where.status = query.status;
    } else {
        where.status = { not: CourseStatus.ARCHIVED };
    }

    if (query.search) {
        where.OR = [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
        ];
    }

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await prisma.$transaction([
        prisma.course.count({ where }),
        prisma.course.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: query.limit,
        }),
    ]);

    return {
        data: rows.map(toSafeCourse),
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

export const getCourseById = async (
    _actor: ScopeUser,
    courseId: string,
): Promise<SafeCourse> => {
    const row = await prisma.course.findUnique({
        where: { id: courseId },
    });

    if (!row) throw NotFoundError('Course not found');

    return toSafeCourse(row);
};

// --------------------------------------------------
// Create
// --------------------------------------------------

export const createCourse = async (
    actor: ScopeUser,
    input: CreateCourseInput,
): Promise<SafeCourse> => {
    assertSuperAdmin(actor);

    const created = await prisma.course.create({
        data: {
            title: input.title,
            description: input.description ?? null,
            duration: input.duration,
            fee: input.fee,
            syllabusUrl: input.syllabusUrl ?? null,
            brochureUrl: input.brochureUrl ?? null,
            demoUrl: input.demoUrl ?? null,
            benefits: input.benefits ?? null,
            faq: input.faq ?? null,
            status: CourseStatus.ACTIVE,
        },
    });

    logger.info(
        { actorId: actor.id, courseId: created.id, title: created.title },
        'course created',
    );

    return toSafeCourse(created);
};

// --------------------------------------------------
// Update
// --------------------------------------------------

export const updateCourse = async (
    actor: ScopeUser,
    courseId: string,
    input: UpdateCourseInput,
): Promise<SafeCourse> => {
    assertSuperAdmin(actor);

    const existing = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
    });
    if (!existing) throw NotFoundError('Course not found');

    const updated = await prisma.course.update({
        where: { id: courseId },
        data: {
            title: input.title ?? undefined,
            description: input.description ?? undefined,
            duration: input.duration ?? undefined,
            fee: input.fee ?? undefined,
            syllabusUrl: input.syllabusUrl ?? undefined,
            brochureUrl: input.brochureUrl ?? undefined,
            demoUrl: input.demoUrl ?? undefined,
            benefits: input.benefits ?? undefined,
            faq: input.faq ?? undefined,
        },
    });

    logger.info({ actorId: actor.id, courseId }, 'course updated');

    return toSafeCourse(updated);
};

// --------------------------------------------------
// Change status
// --------------------------------------------------

export const changeCourseStatus = async (
    actor: ScopeUser,
    courseId: string,
    input: ChangeCourseStatusInput,
): Promise<SafeCourse> => {
    assertSuperAdmin(actor);

    const existing = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
    });
    if (!existing) throw NotFoundError('Course not found');

    const updated = await prisma.course.update({
        where: { id: courseId },
        data: { status: input.status },
    });

    logger.info(
        { actorId: actor.id, courseId, status: input.status },
        'course status changed',
    );

    return toSafeCourse(updated);
};