/**
 * report.routes.ts - Reporting route definitions.
 *
 * Mounts under /api/v1/reports (wired in app.ts).
 *
 * Routes:
 *   GET    /dashboard             aggregated dashboard
 *   GET    /leads                 leads report
 *   GET    /admissions            admissions report
 *   GET    /revenue               revenue report
 *   GET    /conversion            conversion funnel
 *   GET    /commissions           commissions report
 *   GET    /partners              partners report (super_admin only — service enforces)
 *   GET    /courses               courses report
 *   GET    /export                CSV export (leads or admissions)
 *
 * Every route is behind `protect` + `authorize('SUPER_ADMIN', 'PARTNER_ADMIN')`.
 *
 * Note: literal paths (`/dashboard`, `/leads`, `/export`, etc.) are all
 * single-segment and don't conflict with each other. No param routes here.
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    dashboardHandler,
    leadsReportHandler,
    admissionsReportHandler,
    revenueReportHandler,
    conversionReportHandler,
    commissionsReportHandler,
    partnersReportHandler,
    coursesReportHandler,
    exportReportHandler,
} from './report.controller.js';

export const reportRouter: Router = Router();

// All report routes require authentication + admin role
reportRouter.use(protect);
reportRouter.use(authorize('SUPER_ADMIN', 'PARTNER_ADMIN'));

// --- Dashboard ---
reportRouter.get('/dashboard', asyncHandler(dashboardHandler));

// --- Reports ---
reportRouter.get('/leads', asyncHandler(leadsReportHandler));
reportRouter.get('/admissions', asyncHandler(admissionsReportHandler));
reportRouter.get('/revenue', asyncHandler(revenueReportHandler));
reportRouter.get('/conversion', asyncHandler(conversionReportHandler));
reportRouter.get('/commissions', asyncHandler(commissionsReportHandler));
reportRouter.get('/partners', asyncHandler(partnersReportHandler));
reportRouter.get('/courses', asyncHandler(coursesReportHandler));

// --- Export ---
reportRouter.get('/export', asyncHandler(exportReportHandler));