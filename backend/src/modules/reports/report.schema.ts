/**
 * report.schema.ts - Zod schemas for reporting endpoints.
 *
 * Endpoints covered:
 *   - Dashboard overview        (GET /reports/dashboard)
 *   - Leads report              (GET /reports/leads)
 *   - Admissions report         (GET /reports/admissions)
 *   - Revenue report            (GET /reports/revenue)
 *   - Conversion report         (GET /reports/conversion)
 *   - Commissions report        (GET /reports/commissions)
 *   - Partners report           (GET /reports/partners)   — super_admin only
 *   - Courses report            (GET /reports/courses)
 *   - CSV export                (GET /reports/export)
 *
 * Notes:
 *   - Reports are computed at query time — no caching table.
 *   - `from` / `to` are optional; omit for all-time totals.
 *   - `groupBy` controls time-series granularity for trend charts.
 *   - Access: SUPER_ADMIN and PARTNER_ADMIN only.
 */

import { z } from 'zod';

// --------------------------------------------------
// Shared
// --------------------------------------------------

const dateFromSchema = z
    .string()
    .datetime({ message: 'from must be an ISO 8601 datetime' })
    .optional()
    .transform((v) => (v ? new Date(v) : undefined));

const dateToSchema = z
    .string()
    .datetime({ message: 'to must be an ISO 8601 datetime' })
    .optional()
    .transform((v) => (v ? new Date(v) : undefined));

const groupBySchema = z
    .enum(['day', 'week', 'month'])
    .default('day');

// --------------------------------------------------
// Date-range query (used by most report endpoints)
// --------------------------------------------------

export const ReportRangeQuerySchema = z.object({
    from: dateFromSchema,
    to: dateToSchema,
    groupBy: groupBySchema,
});

export type ReportRangeQuery = z.infer<typeof ReportRangeQuerySchema>;

// --------------------------------------------------
// Partner-scoped report
// --------------------------------------------------

export const ReportWithPartnerQuerySchema = ReportRangeQuerySchema.extend({
    partnerId: z.string().uuid().optional(),
});

export type ReportWithPartnerQuery = z.infer<
    typeof ReportWithPartnerQuerySchema
>;

// --------------------------------------------------
// Dashboard
// --------------------------------------------------

export const DashboardQuerySchema = ReportRangeQuerySchema;

export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

// --------------------------------------------------
// Export
// --------------------------------------------------

export const EXPORTABLE_REPORTS = ['leads', 'admissions'] as const;
export type ExportableReport = (typeof EXPORTABLE_REPORTS)[number];

export const ExportReportQuerySchema = ReportRangeQuerySchema.extend({
    report: z.enum(EXPORTABLE_REPORTS),
});

export type ExportReportQuery = z.infer<typeof ExportReportQuerySchema>;