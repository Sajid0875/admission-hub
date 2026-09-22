/**
 * audit.routes.ts - Audit log route definitions.
 *
 * Mounts under /api/v1/audit-logs (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list audit logs (super_admin)
 *   GET    /:id                   get one audit log (super_admin)
 *
 * Every route is behind `protect` + `authorize('SUPER_ADMIN')`.
 *
 * No POST/PATCH/DELETE routes exist. Audit is append-only.
 * Creation happens exclusively via `logAction()` in `src/shared/utils/audit.ts`.
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listAuditLogsHandler,
    getAuditLogHandler,
} from './audit.controller.js';

export const auditRouter: Router = Router();

// All audit log routes require authentication + super_admin
auditRouter.use(protect);
auditRouter.use(authorize('SUPER_ADMIN'));

// --- Read-only ---
auditRouter.get('/', asyncHandler(listAuditLogsHandler));
auditRouter.get('/:id', asyncHandler(getAuditLogHandler));

// NO write routes — audit is append-only by design.