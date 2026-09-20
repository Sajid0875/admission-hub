/**
 * admission.controller.ts - Admission + payment HTTP handlers.
 *
 * Responsibilities:
 *   - Parse and validate request bodies / query params with Zod
 *   - Delegate to admission.service
 *   - Shape HTTP responses
 *
 * Does NOT contain business logic. Does NOT touch prisma directly.
 *
 * All routes are behind `protect`. Role gating is applied in admission.routes.ts
 * via `authorize(...)`. Services still re-check tenant + assignment scope.
 */

import type { Request, Response } from 'express';
import {
    CreateAdmissionSchema,
    UpdateAdmissionSchema,
    VerifyAdmissionSchema,
    CancelAdmissionSchema,
    RecordPaymentSchema,
    RefundPaymentSchema,
    ListAdmissionsQuerySchema,
    ListPaymentsQuerySchema,
} from './admission.schema.js';
import * as admissionService from './admission.service.js';
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
// GET /api/v1/admissions
// --------------------------------------------------

export const listAdmissionsHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const query = ListAdmissionsQuerySchema.parse(req.query);

    const result = await admissionService.listAdmissions(actor, query);

    res.status(200).json(result);
};

// --------------------------------------------------
// GET /api/v1/admissions/:id
// --------------------------------------------------

export const getAdmissionHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;

    const admission = await admissionService.getAdmissionById(
        actor,
        id as string,
    );

    res.status(200).json({ admission });
};

// --------------------------------------------------
// POST /api/v1/admissions
// --------------------------------------------------

export const createAdmissionHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const input = CreateAdmissionSchema.parse(req.body);

    const admission = await admissionService.createAdmission(actor, input);

    res.status(201).json({ admission });
};

// --------------------------------------------------
// PATCH /api/v1/admissions/:id
// --------------------------------------------------

export const updateAdmissionHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = UpdateAdmissionSchema.parse(req.body);

    const admission = await admissionService.updateAdmission(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ admission });
};

// --------------------------------------------------
// POST /api/v1/admissions/:id/verify
// --------------------------------------------------

export const verifyAdmissionHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = VerifyAdmissionSchema.parse(req.body);

    const admission = await admissionService.verifyAdmission(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ admission });
};

// --------------------------------------------------
// POST /api/v1/admissions/:id/cancel
// --------------------------------------------------

export const cancelAdmissionHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = CancelAdmissionSchema.parse(req.body ?? {});

    const admission = await admissionService.cancelAdmission(
        actor,
        id as string,
        input,
    );

    res.status(200).json({ admission });
};

// --------------------------------------------------
// GET /api/v1/admissions/:id/payments
// --------------------------------------------------

export const listPaymentsHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const query = ListPaymentsQuerySchema.parse(req.query);

    const result = await admissionService.listPayments(
        actor,
        id as string,
        query,
    );

    res.status(200).json(result);
};

// --------------------------------------------------
// POST /api/v1/admissions/:id/payments
// --------------------------------------------------

export const recordPaymentHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id } = req.params;
    const input = RecordPaymentSchema.parse(req.body);

    const result = await admissionService.recordPayment(
        actor,
        id as string,
        input,
    );

    res.status(201).json(result);
};

// --------------------------------------------------
// POST /api/v1/admissions/:id/payments/:paymentId/refund
// --------------------------------------------------

export const refundPaymentHandler = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = requireActor(req);
    const { id, paymentId } = req.params;
    const input = RefundPaymentSchema.parse(req.body ?? {});

    const result = await admissionService.refundPayment(
        actor,
        id as string,
        paymentId as string,
        input,
    );

    res.status(200).json(result);
};