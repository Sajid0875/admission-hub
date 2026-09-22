/**
 * commission-rule.routes.ts - Commission rule route definitions.
 *
 * Mounts under /api/v1/commission-rules (wired in app.ts).
 *
 * Routes:
 *   GET    /                      list rules (super_admin)
 *   GET    /:id                   get one rule (super_admin)
 *   POST   /                      create rule (super_admin)
 *   PATCH  /:id                   update rule (super_admin)
 *   DELETE /:id                   delete rule (super_admin, hard delete)
 *
 * Every route is behind `protect` + `authorize('SUPER_ADMIN')`.
 * Rules are configuration — only super_admin manages them.
 */

import { Router } from 'express';
import { protect, authorize } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
    listCommissionRulesHandler,
    getCommissionRuleHandler,
    createCommissionRuleHandler,
    updateCommissionRuleHandler,
    deleteCommissionRuleHandler,
} from './commission-rule.controller.js';

export const commissionRuleRouter: Router = Router();

// All commission rule routes require authentication
commissionRuleRouter.use(protect);

// Super_admin only for the whole router
commissionRuleRouter.use(authorize('SUPER_ADMIN'));

// --- Read ---
commissionRuleRouter.get('/', asyncHandler(listCommissionRulesHandler));

commissionRuleRouter.get('/:id', asyncHandler(getCommissionRuleHandler));

// --- Write ---
commissionRuleRouter.post('/', asyncHandler(createCommissionRuleHandler));

commissionRuleRouter.patch('/:id', asyncHandler(updateCommissionRuleHandler));

commissionRuleRouter.delete('/:id', asyncHandler(deleteCommissionRuleHandler));