/**
 * report.service.ts - Reporting and analytics business logic.
 *
 * All reports are computed at query time using Prisma aggregates.
 * No caching table — aggregates are cheap on indexed columns.
 *
 * Scope resolution:
 *   - SUPER_ADMIN: sees everything (may filter by partnerId)
 *   - PARTNER_ADMIN: scoped to their own partnerId
 *   - Other roles: 403 (route-level gate prevents this, but double-check here)
 */

import { prisma } from '../../config/prisma.js';
import { ForbiddenError } from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';
import {
    CommissionStatus,
    LeadStatus,
    PaymentStatus,
    VerificationStatus,
} from '@prisma/client';
import type {
    DashboardQuery,
    ExportReportQuery,
    ReportRangeQuery,
} from './report.schema.js';

// --------------------------------------------------
// Scope resolution
// --------------------------------------------------

interface ResolvedScope {
    partnerId: string | null;
}

const resolveScope = (
    actor: ScopeUser,
    requestedPartnerId?: string,
): ResolvedScope => {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'PARTNER_ADMIN') {
        throw ForbiddenError('Only SUPER_ADMIN and PARTNER_ADMIN can view reports');
    }

    if (actor.role === 'SUPER_ADMIN') {
        return { partnerId: requestedPartnerId ?? null };
    }

    if (!actor.partnerId) {
        throw ForbiddenError('User is not associated with any partner');
    }
    return { partnerId: actor.partnerId };
};

// --------------------------------------------------
// Date-range filter builder
// --------------------------------------------------

const buildDateRange = (
    from: Date | undefined,
    to: Date | undefined,
): { gte?: Date; lte?: Date } | undefined => {
    if (!from && !to) return undefined;
    const range: { gte?: Date; lte?: Date } = {};
    if (from) range.gte = from;
    if (to) range.lte = to;
    return range;
};

// --------------------------------------------------
// CSV helper
// --------------------------------------------------

const escapeCsvField = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const toCsv = (
    headers: string[],
    rows: Array<Record<string, unknown>>,
): string => {
    const headerLine = headers.join(',');
    const dataLines = rows.map((row) =>
        headers.map((h) => escapeCsvField(row[h])).join(','),
    );
    return [headerLine, ...dataLines].join('\n');
};

// --------------------------------------------------
// Period bucketing helper
// --------------------------------------------------

const bucketKey = (
    d: Date,
    groupBy: 'day' | 'week' | 'month',
): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    if (groupBy === 'month') return `${y}-${m}`;
    if (groupBy === 'week') {
        const dayOfWeek = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
        return monday.toISOString().slice(0, 10);
    }
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// --------------------------------------------------
// Prisma count + sum helpers
//
// Prisma v5 types `_count._all` as `true | { _all?: number }` in groupBy
// results. Similarly, `_sum.x` is `x?: number | null`. These helpers
// normalize both into plain numbers.
// --------------------------------------------------

interface WithCount {
    _count: true | { _all?: number };
}

interface WithSum<T> {
    _sum: T | null;
}

const countOf = (row: unknown): number => {
    const r = row as WithCount;
    const c = r._count;
    if (c === true) return 0;
    return c._all ?? 0;
};

const sumOf = <K extends string>(
    row: unknown,
    key: K,
): number => {
    const r = row as WithSum<Record<string, unknown> | null>;
    if (!r._sum) return 0;
    const v = r._sum[key];
    return v === null || v === undefined ? 0 : Number(v);
};

// --------------------------------------------------
// Trend builder
// --------------------------------------------------

interface TrendRow {
    period: string;
    leads: number;
    admissions: number;
}

const buildTrend = async (
    partnerId: string | null,
    query: ReportRangeQuery,
): Promise<TrendRow[]> => {
    const where: Record<string, unknown> = {};
    if (partnerId) where.partnerId = partnerId;

    const range = buildDateRange(query.from, query.to);
    if (range) where.createdAt = range;

    const leads = await prisma.lead.findMany({
        where: { ...where, archivedAt: null },
        select: { createdAt: true },
    });

    const admissions = await prisma.admission.findMany({
        where,
        select: { createdAt: true },
    });

    const leadBuckets = new Map<string, number>();
    const admissionBuckets = new Map<string, number>();

    for (const l of leads) {
        const key = bucketKey(l.createdAt, query.groupBy);
        leadBuckets.set(key, (leadBuckets.get(key) ?? 0) + 1);
    }
    for (const a of admissions) {
        const key = bucketKey(a.createdAt, query.groupBy);
        admissionBuckets.set(key, (admissionBuckets.get(key) ?? 0) + 1);
    }

    const allKeys = new Set([
        ...leadBuckets.keys(),
        ...admissionBuckets.keys(),
    ]);

    return Array.from(allKeys)
        .sort()
        .map((period) => ({
            period,
            leads: leadBuckets.get(period) ?? 0,
            admissions: admissionBuckets.get(period) ?? 0,
        }));
};

// --------------------------------------------------
// Dashboard
// --------------------------------------------------

export interface DashboardResult {
    summary: {
        totalLeads: number;
        hotLeads: number;
        todayFollowUps: number;
        overdueFollowUps: number;
        totalAdmissions: number;
        verifiedAdmissions: number;
        unpaidAdmissions: number;
        totalRevenue: number;
        pendingCommission: number;
        paidCommission: number;
    };
    funnel: Array<{ status: string; count: number }>;
    trend: TrendRow[];
}

export const getDashboard = async (
    actor: ScopeUser,
    query: DashboardQuery,
): Promise<DashboardResult> => {
    const scope = resolveScope(actor);
    const partnerFilter = scope.partnerId ? { partnerId: scope.partnerId } : {};
    const createdAtFilter = buildDateRange(query.from, query.to);
    const createdFilter = createdAtFilter ? { createdAt: createdAtFilter } : {};

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [
        totalLeads,
        hotLeads,
        todayFollowUps,
        overdueFollowUps,
        totalAdmissions,
        verifiedAdmissions,
        unpaidAdmissions,
        paymentsAgg,
        pendingCommAgg,
        paidCommAgg,
        funnelRaw,
    ] = await prisma.$transaction([
        prisma.lead.count({
            where: { ...partnerFilter, ...createdFilter, archivedAt: null },
        }),
        prisma.lead.count({
            where: {
                ...partnerFilter,
                ...createdFilter,
                priority: 'HOT',
                archivedAt: null,
            },
        }),
        prisma.followUp.count({
            where: {
                lead: partnerFilter,
                status: 'PENDING',
                dueAt: { gte: todayStart, lt: todayEnd },
            },
        }),
        prisma.followUp.count({
            where: {
                lead: partnerFilter,
                status: 'PENDING',
                dueAt: { lt: todayStart },
            },
        }),
        prisma.admission.count({
            where: { ...partnerFilter, ...createdFilter },
        }),
        prisma.admission.count({
            where: {
                ...partnerFilter,
                ...createdFilter,
                verificationStatus: VerificationStatus.VERIFIED,
            },
        }),
        prisma.admission.count({
            where: {
                ...partnerFilter,
                ...createdFilter,
                paymentStatus: PaymentStatus.UNPAID,
            },
        }),
        prisma.payment.aggregate({
            where: { admission: partnerFilter, status: PaymentStatus.PAID },
            _sum: { amount: true },
        }),
        prisma.commissionRecord.aggregate({
            where: { ...partnerFilter, status: CommissionStatus.PENDING },
            _sum: { commissionAmount: true },
        }),
        prisma.commissionRecord.aggregate({
            where: { ...partnerFilter, status: CommissionStatus.PAID },
            _sum: { commissionAmount: true },
        }),
        prisma.lead.groupBy({
            by: ['status'],
            where: { ...partnerFilter, ...createdFilter, archivedAt: null },
            orderBy: { status: 'asc' },
            _count: { _all: true },
        }),
    ]);

    const funnel = funnelRaw.map((row) => ({
        status: row.status,
        count: countOf(row),
    }));

    const trend = await buildTrend(scope.partnerId, query);

    return {
        summary: {
            totalLeads,
            hotLeads,
            todayFollowUps,
            overdueFollowUps,
            totalAdmissions,
            verifiedAdmissions,
            unpaidAdmissions,
            totalRevenue: sumOf(paymentsAgg, 'amount'),
            pendingCommission: sumOf(pendingCommAgg, 'commissionAmount'),
            paidCommission: sumOf(paidCommAgg, 'commissionAmount'),
        },
        funnel,
        trend,
    };
};

// --------------------------------------------------
// Leads report
// --------------------------------------------------

export interface LeadsReportResult {
    byStatus: Array<{ status: string; count: number }>;
    byPriority: Array<{ priority: string; count: number }>;
    bySource: Array<{ source: string; count: number }>;
    byCity: Array<{ city: string; count: number }>;
    byCourse: Array<{ courseId: string | null; count: number }>;
    trend: TrendRow[];
}

export const getLeadsReport = async (
    actor: ScopeUser,
    query: ReportRangeQuery,
): Promise<LeadsReportResult> => {
    const scope = resolveScope(actor);
    const partnerFilter = scope.partnerId ? { partnerId: scope.partnerId } : {};
    const createdFilter = buildDateRange(query.from, query.to);

    const where: Record<string, unknown> = {
        ...partnerFilter,
        archivedAt: null,
    };
    if (createdFilter) where.createdAt = createdFilter;

    const [byStatus, byPriority, bySource, byCity, byCourse] =
        await prisma.$transaction([
            prisma.lead.groupBy({
                by: ['status'],
                where,
                orderBy: { status: 'asc' },
                _count: { _all: true },
            }),
            prisma.lead.groupBy({
                by: ['priority'],
                where,
                orderBy: { priority: 'asc' },
                _count: { _all: true },
            }),
            prisma.lead.groupBy({
                by: ['source'],
                where,
                orderBy: { source: 'asc' },
                _count: { _all: true },
            }),
            prisma.lead.groupBy({
                by: ['city'],
                where,
                orderBy: { city: 'asc' },
                _count: { _all: true },
            }),
            prisma.lead.groupBy({
                by: ['courseId'],
                where,
                orderBy: { courseId: 'asc' },
                _count: { _all: true },
            }),
        ]);

    const trend = await buildTrend(scope.partnerId, query);

    return {
        byStatus: byStatus.map((r) => ({
            status: r.status,
            count: countOf(r),
        })),
        byPriority: byPriority.map((r) => ({
            priority: r.priority,
            count: countOf(r),
        })),
        bySource: bySource
            .filter((r) => r.source !== null)
            .map((r) => ({
                source: r.source as string,
                count: countOf(r),
            })),
        byCity: byCity
            .filter((r) => r.city !== null)
            .map((r) => ({
                city: r.city as string,
                count: countOf(r),
            })),
        byCourse: byCourse.map((r) => ({
            courseId: r.courseId,
            count: countOf(r),
        })),
        trend,
    };
};

// --------------------------------------------------
// Admissions report
// --------------------------------------------------

export interface AdmissionsReportResult {
    byStatus: Array<{ status: string; count: number }>;
    byVerification: Array<{ verification: string; count: number }>;
    byCourse: Array<{ courseId: string; count: number }>;
    total: number;
    trend: TrendRow[];
}

export const getAdmissionsReport = async (
    actor: ScopeUser,
    query: ReportRangeQuery,
): Promise<AdmissionsReportResult> => {
    const scope = resolveScope(actor);
    const partnerFilter = scope.partnerId ? { partnerId: scope.partnerId } : {};
    const createdFilter = buildDateRange(query.from, query.to);

    const where: Record<string, unknown> = { ...partnerFilter };
    if (createdFilter) where.createdAt = createdFilter;

    const [total, byStatus, byVerification, byCourse] = await prisma.$transaction([
        prisma.admission.count({ where }),
        prisma.admission.groupBy({
            by: ['paymentStatus'],
            where,
            orderBy: { paymentStatus: 'asc' },
            _count: { _all: true },
        }),
        prisma.admission.groupBy({
            by: ['verificationStatus'],
            where,
            orderBy: { verificationStatus: 'asc' },
            _count: { _all: true },
        }),
        prisma.admission.groupBy({
            by: ['courseId'],
            where,
            orderBy: { courseId: 'asc' },
            _count: { _all: true },
        }),
    ]);

    const trend = await buildTrend(scope.partnerId, query);

    return {
        total,
        byStatus: byStatus.map((r) => ({
            status: r.paymentStatus,
            count: countOf(r),
        })),
        byVerification: byVerification.map((r) => ({
            verification: r.verificationStatus,
            count: countOf(r),
        })),
        byCourse: byCourse.map((r) => ({
            courseId: r.courseId,
            count: countOf(r),
        })),
        trend,
    };
};

// --------------------------------------------------
// Revenue report
// --------------------------------------------------

export interface RevenueReportResult {
    totalReceived: number;
    totalOutstanding: number;
    totalRefunded: number;
    byPaymentMode: Array<{ mode: string; amount: number; count: number }>;
    trend: Array<{ period: string; amount: number }>;
}

export const getRevenueReport = async (
    actor: ScopeUser,
    query: ReportRangeQuery,
): Promise<RevenueReportResult> => {
    const scope = resolveScope(actor);
    const partnerFilter = scope.partnerId ? { partnerId: scope.partnerId } : {};
    const createdFilter = buildDateRange(query.from, query.to);

    const admissionWhere: Record<string, unknown> = { ...partnerFilter };
    if (createdFilter) admissionWhere.createdAt = createdFilter;

    const paymentFilter: Record<string, unknown> = {
        admission: partnerFilter,
        status: PaymentStatus.PAID,
    };
    if (createdFilter) paymentFilter.paymentDate = createdFilter;

    const [receivedAgg, refundedAgg, byMode, admissionsAgg] =
        await prisma.$transaction([
            prisma.payment.aggregate({
                where: paymentFilter,
                _sum: { amount: true },
            }),
            prisma.payment.aggregate({
                where: {
                    admission: partnerFilter,
                    status: PaymentStatus.REFUNDED,
                },
                _sum: { amount: true },
            }),
            prisma.payment.groupBy({
                by: ['paymentMode'],
                where: paymentFilter,
                orderBy: { paymentMode: 'asc' },
                _sum: { amount: true },
                _count: { _all: true },
            }),
            prisma.admission.aggregate({
                where: admissionWhere,
                _sum: { fee: true },
            }),
        ]);

    const totalReceived = sumOf(receivedAgg, 'amount');
    const totalFee = sumOf(admissionsAgg, 'fee');
    const totalRefunded = sumOf(refundedAgg, 'amount');
    const totalOutstanding = Math.max(0, totalFee - totalReceived);

    const payments = await prisma.payment.findMany({
        where: paymentFilter,
        select: { amount: true, paymentDate: true },
    });

    const trendMap = new Map<string, number>();
    for (const p of payments) {
        const key = bucketKey(p.paymentDate, query.groupBy);
        trendMap.set(key, (trendMap.get(key) ?? 0) + Number(p.amount));
    }

    const trend = Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, amount]) => ({ period, amount }));

    return {
        totalReceived,
        totalOutstanding,
        totalRefunded,
        byPaymentMode: byMode.map((r) => ({
            mode: r.paymentMode,
            amount: sumOf(r, 'amount'),
            count: countOf(r),
        })),
        trend,
    };
};

// --------------------------------------------------
// Conversion report
// --------------------------------------------------

export interface ConversionReportResult {
    totalLeads: number;
    totalAdmissions: number;
    conversionRate: number;
    funnel: Array<{ stage: string; count: number }>;
}

export const getConversionReport = async (
    actor: ScopeUser,
    query: ReportRangeQuery,
): Promise<ConversionReportResult> => {
    const scope = resolveScope(actor);
    const partnerFilter = scope.partnerId ? { partnerId: scope.partnerId } : {};
    const createdFilter = buildDateRange(query.from, query.to);

    const leadWhere: Record<string, unknown> = {
        ...partnerFilter,
        archivedAt: null,
    };
    if (createdFilter) leadWhere.createdAt = createdFilter;

    const admissionWhere: Record<string, unknown> = { ...partnerFilter };
    if (createdFilter) admissionWhere.createdAt = createdFilter;

    const [totalLeads, totalAdmissions, funnelRaw] = await prisma.$transaction([
        prisma.lead.count({ where: leadWhere }),
        prisma.admission.count({ where: admissionWhere }),
        prisma.lead.groupBy({
            by: ['status'],
            where: leadWhere,
            orderBy: { status: 'asc' },
            _count: { _all: true },
        }),
    ]);

    const FUNNEL_ORDER: LeadStatus[] = [
        LeadStatus.NEW,
        LeadStatus.CONTACTED,
        LeadStatus.FOLLOW_UP,
        LeadStatus.DEMO_BOOKED,
        LeadStatus.DEMO_COMPLETED,
        LeadStatus.FEE_DISCUSSION,
        LeadStatus.ADMISSION_PENDING,
        LeadStatus.ADMITTED,
    ];

    const countByStatus = new Map<string, number>();
    for (const row of funnelRaw) {
        countByStatus.set(row.status, countOf(row));
    }

    const funnel = FUNNEL_ORDER.map((stage) => ({
        stage,
        count: countByStatus.get(stage) ?? 0,
    }));

    const conversionRate = totalLeads > 0 ? totalAdmissions / totalLeads : 0;

    return { totalLeads, totalAdmissions, conversionRate, funnel };
};

// --------------------------------------------------
// Commissions report
// --------------------------------------------------

export interface CommissionsReportResult {
    totalPending: number;
    totalApproved: number;
    totalPaid: number;
    totalCancelled: number;
    byStatus: Array<{ status: string; count: number; amount: number }>;
}

export const getCommissionsReport = async (
    actor: ScopeUser,
    query: ReportRangeQuery,
): Promise<CommissionsReportResult> => {
    const scope = resolveScope(actor);
    const partnerFilter = scope.partnerId ? { partnerId: scope.partnerId } : {};
    const createdFilter = buildDateRange(query.from, query.to);

    const where: Record<string, unknown> = { ...partnerFilter };
    if (createdFilter) where.createdAt = createdFilter;

    const grouped = await prisma.commissionRecord.groupBy({
        by: ['status'],
        where,
        orderBy: { status: 'asc' },
        _sum: { commissionAmount: true },
        _count: { _all: true },
    });

    const pick = (status: CommissionStatus): number => {
        const row = grouped.find((r) => r.status === status);
        return row ? sumOf(row, 'commissionAmount') : 0;
    };

    return {
        totalPending: pick(CommissionStatus.PENDING),
        totalApproved: pick(CommissionStatus.APPROVED),
        totalPaid: pick(CommissionStatus.PAID),
        totalCancelled: pick(CommissionStatus.CANCELLED),
        byStatus: grouped.map((r) => ({
            status: r.status,
            count: countOf(r),
            amount: sumOf(r, 'commissionAmount'),
        })),
    };
};

// --------------------------------------------------
// Partners report (super_admin only)
// --------------------------------------------------

export interface PartnersReportResult {
    partners: Array<{
        partnerId: string;
        partnerName: string;
        admissions: number;
        revenue: number;
        commissionEarned: number;
    }>;
}

export const getPartnersReport = async (
    actor: ScopeUser,
    query: ReportRangeQuery,
): Promise<PartnersReportResult> => {
    if (actor.role !== 'SUPER_ADMIN') {
        throw ForbiddenError('Only SUPER_ADMIN can view the partners report');
    }

    const createdFilter = buildDateRange(query.from, query.to);

    const partners = await prisma.partner.findMany({
        select: { id: true, partnerName: true },
        orderBy: { createdAt: 'asc' },
    });

    const results = await Promise.all(
        partners.map(async (p) => {
            const admissionWhere: Record<string, unknown> = { partnerId: p.id };
            if (createdFilter) admissionWhere.createdAt = createdFilter;

            const [admissions, paymentsAgg, commissionAgg] =
                await prisma.$transaction([
                    prisma.admission.count({ where: admissionWhere }),
                    prisma.payment.aggregate({
                        where: {
                            admission: { partnerId: p.id },
                            status: PaymentStatus.PAID,
                        },
                        _sum: { amount: true },
                    }),
                    prisma.commissionRecord.aggregate({
                        where: { partnerId: p.id },
                        _sum: { commissionAmount: true },
                    }),
                ]);

            return {
                partnerId: p.id,
                partnerName: p.partnerName,
                admissions,
                revenue: sumOf(paymentsAgg, 'amount'),
                commissionEarned: sumOf(commissionAgg, 'commissionAmount'),
            };
        }),
    );

    return { partners: results };
};

// --------------------------------------------------
// Courses report
// --------------------------------------------------

export interface CoursesReportResult {
    courses: Array<{
        courseId: string;
        title: string;
        admissions: number;
        revenue: number;
    }>;
}

export const getCoursesReport = async (
    actor: ScopeUser,
    query: ReportRangeQuery,
): Promise<CoursesReportResult> => {
    const scope = resolveScope(actor);
    const partnerFilter = scope.partnerId ? { partnerId: scope.partnerId } : {};
    const createdFilter = buildDateRange(query.from, query.to);

    const admissionWhere: Record<string, unknown> = { ...partnerFilter };
    if (createdFilter) admissionWhere.createdAt = createdFilter;

    const grouped = await prisma.admission.groupBy({
        by: ['courseId'],
        where: admissionWhere,
        orderBy: { courseId: 'asc' },
        _count: { _all: true },
        _sum: { fee: true },
    });

    const courseIds = grouped.map((g) => g.courseId);
    const courses = await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, title: true },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c.title]));

    return {
        courses: grouped.map((g) => ({
            courseId: g.courseId,
            title: courseMap.get(g.courseId) ?? '(unknown)',
            admissions: countOf(g),
            revenue: sumOf(g, 'fee'),
        })),
    };
};

// --------------------------------------------------
// CSV export
// --------------------------------------------------

export interface ExportResult {
    filename: string;
    contentType: string;
    body: string;
}

export const exportReport = async (
    actor: ScopeUser,
    query: ExportReportQuery,
): Promise<ExportResult> => {
    const scope = resolveScope(actor);
    const partnerFilter = scope.partnerId ? { partnerId: scope.partnerId } : {};
    const createdFilter = buildDateRange(query.from, query.to);

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    if (query.report === 'leads') {
        const where: Record<string, unknown> = {
            ...partnerFilter,
            archivedAt: null,
        };
        if (createdFilter) where.createdAt = createdFilter;

        const leads = await prisma.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                city: true,
                source: true,
                priority: true,
                status: true,
                createdAt: true,
            },
        });

        const headers = [
            'id',
            'name',
            'phone',
            'email',
            'city',
            'source',
            'priority',
            'status',
            'createdAt',
        ];
        const rows = leads.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
        }));

        return {
            filename: `leads-${timestamp}.csv`,
            contentType: 'text/csv; charset=utf-8',
            body: toCsv(headers, rows),
        };
    }

    const where: Record<string, unknown> = { ...partnerFilter };
    if (createdFilter) where.createdAt = createdFilter;

    const admissions = await prisma.admission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            studentName: true,
            fee: true,
            paymentStatus: true,
            verificationStatus: true,
            joiningDate: true,
            createdAt: true,
        },
    });

    const headers = [
        'id',
        'studentName',
        'fee',
        'paymentStatus',
        'verificationStatus',
        'joiningDate',
        'createdAt',
    ];
    const rows = admissions.map((a) => ({
        ...a,
        fee: Number(a.fee),
        joiningDate: a.joiningDate.toISOString(),
        createdAt: a.createdAt.toISOString(),
    }));

    return {
        filename: `admissions-${timestamp}.csv`,
        contentType: 'text/csv; charset=utf-8',
        body: toCsv(headers, rows),
    };
};