/**
 * notify.ts - Notification creation helper.
 *
 * Fire-and-forget: callers don't await this. A failure to create a
 * notification NEVER blocks the primary action (e.g. a lead assignment
 * still succeeds even if the notification write fails).
 *
 * Other services import `notify()` from here. No HTTP route creates
 * notifications directly — they are always system-generated.
 *
 * Uses the Prisma client directly (not a service) so that services can
 * call this without creating circular imports.
 */

import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';

// --------------------------------------------------
// Notification types — kept as strings for MVP
// --------------------------------------------------

export const NotificationType = {
    FOLLOWUP_DUE: 'followup_due',
    FOLLOWUP_OVERDUE: 'followup_overdue',
    LEAD_ASSIGNED: 'lead_assigned',
    LEAD_STATUS_CHANGED: 'lead_status_changed',
    ADMISSION_CREATED: 'admission_created',
    ADMISSION_VERIFIED: 'admission_verified',
    COMMISSION_APPROVED: 'commission_approved',
    COMMISSION_PAID: 'commission_paid',
    PARTNER_APPROVED: 'partner_approved',
    PAYMENT_RECEIVED: 'payment_received',
} as const;

export type NotificationTypeValue =
    (typeof NotificationType)[keyof typeof NotificationType];

// --------------------------------------------------
// Payload
// --------------------------------------------------

export interface NotifyInput {
    userId: string;
    partnerId: string | null;
    type: NotificationTypeValue | string;
    title: string;
    message: string;
    referenceType?: string | null;
    referenceId?: string | null;
}

// --------------------------------------------------
// Fire-and-forget helper
// --------------------------------------------------

/**
 * Creates a notification for a user. Never throws — failures are logged.
 *
 * Callers should NOT await this. Fire-and-forget style.
 *
 *   void notify({ userId, partnerId, type: 'lead_assigned', ... });
 */
export const notify = async (input: NotifyInput): Promise<void> => {
    try {
        await prisma.notification.create({
            data: {
                userId: input.userId,
                partnerId: input.partnerId,
                type: input.type,
                title: input.title,
                message: input.message,
                referenceType: input.referenceType ?? null,
                referenceId: input.referenceId ?? null,
            },
        });
    } catch (err) {
        logger.warn(
            { err, userId: input.userId, type: input.type },
            'failed to create notification',
        );
    }
};

/**
 * Convenience: notify multiple users at once.
 * Failures for individual users don't block others.
 */
export const notifyMany = async (inputs: NotifyInput[]): Promise<void> => {
    await Promise.all(inputs.map((input) => notify(input)));
};