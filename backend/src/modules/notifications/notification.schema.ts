/**
 * notification.schema.ts - Zod schemas for notification endpoints.
 *
 * Endpoints covered:
 *   - List notifications       (GET /notifications)
 *   - Unread count             (GET /notifications/unread-count)
 *   - Mark one read            (PATCH /notifications/:id/read)
 *   - Mark all read            (PATCH /notifications/read-all)
 *
 * Notes:
 *   - No create route — notifications come from services via `notify()`.
 *   - No delete route — soft-read only.
 *   - Scoped to `req.user.id` at the service layer.
 */

import { z } from 'zod';

// --------------------------------------------------
// List / filter
// --------------------------------------------------

export const ListNotificationsQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
    read: z
        .union([z.literal('true'), z.literal('false')])
        .optional()
        .transform((v) =>
            v === 'true' ? true : v === 'false' ? false : undefined,
        ),
    type: z.string().trim().min(1).optional(),
});

export type ListNotificationsQuery = z.infer<
    typeof ListNotificationsQuerySchema
>;