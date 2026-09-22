/**
 * report.controller.ts - Reporting HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate query params with Zod
 *   - Delegate to report.service
 *   - Shape HTTP responses
 *   - For CSV/PDF export: set proper headers and return file body
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect` + `authorize('SUPER_ADMIN', 'PARTNER_ADMIN')`.
 * Scope resolution happens in the service layer.
 */

import type { Request, Response } from 'express';
import {
    ReportRangeQuerySchema,
    DashboardQuerySchema,
    ExportReportQuerySchema,
} from './report.schema.js';
import * as reportService from './report.service.js';
import { UnauthorizedError } from '../../shared/errors/AppError.js';
import type { ScopeUser } from '../../shared/utils/scope.js';

// --------------------------------------------------
// Helper — read actor from req.user
// --------------------------------------------------

const requireActor = (req: Request): ScopeUser => {
    if (!req.user) {
        throw UnauthorizedError('Authentication required');
    }
    return req.user;
};

// --------------------------------------------------
// GET /api/v1/reports/dashboard
// --------------------------------------------------

export const dashboardHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = DashboardQuerySchema.parse(req.query);

    const result = await reportService.getDashboard(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/reports/leads
// --------------------------------------------------

export const leadsReportHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ReportRangeQuerySchema.parse(req.query);

    const result = await reportService.getLeadsReport(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/reports/admissions
// --------------------------------------------------

export const admissionsReportHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ReportRangeQuerySchema.parse(req.query);

    const result = await reportService.getAdmissionsReport(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/reports/revenue
// --------------------------------------------------

export const revenueReportHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ReportRangeQuerySchema.parse(req.query);

    const result = await reportService.getRevenueReport(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/reports/conversion
// --------------------------------------------------

export const conversionReportHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ReportRangeQuerySchema.parse(req.query);

    const result = await reportService.getConversionReport(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/reports/commissions
// --------------------------------------------------

export const commissionsReportHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ReportRangeQuerySchema.parse(req.query);

    const result = await reportService.getCommissionsReport(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/reports/partners (super_admin only — service enforces)
// --------------------------------------------------

export const partnersReportHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ReportRangeQuerySchema.parse(req.query);

    const result = await reportService.getPartnersReport(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/reports/courses
// --------------------------------------------------

export const coursesReportHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ReportRangeQuerySchema.parse(req.query);

    const result = await reportService.getCoursesReport(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/reports/export (CSV or PDF download)
// --------------------------------------------------

export const exportReportHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ExportReportQuerySchema.parse(req.query);

    const result = await reportService.exportReport(actor, query);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`,
    );
    res.status(200).send(result.body);
};