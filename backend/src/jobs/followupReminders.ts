/**
 * followupReminders.ts - In-process follow-up reminder scanner.
 *
 * Without Redis: a setInterval on the API process scans PENDING follow-ups
 * and emits in-app notifications (+ optional WhatsApp stub) when due soon
 * or overdue. Idempotent via existing Notification rows (same type + ref).
 *
 * Not a substitute for a real job queue at scale — good enough for MVP.
 */

import { FollowUpStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { notify, NotificationType } from '../shared/utils/notify.js';
import { whatsapp } from '../shared/messaging/whatsapp.js';

export interface ReminderRunOptions {
    /** Override env flag — used by tests and manual admin triggers. */
    enabled?: boolean;
}

export interface ReminderRunSummary {
    scanned: number;
    dueSoonNotified: number;
    overdueNotified: number;
    whatsappAttempted: number;
}

const alreadyNotified = async (
    referenceId: string,
    type: string,
): Promise<boolean> => {
    const existing = await prisma.notification.findFirst({
        where: {
            referenceType: 'FollowUp',
            referenceId,
            type,
        },
        select: { id: true },
    });
    return existing !== null;
};

/**
 * One reminder pass. Exported for tests and manual triggers.
 */
export const runFollowUpRemindersOnce = async (
    options: ReminderRunOptions = {},
): Promise<ReminderRunSummary> => {
    const summary: ReminderRunSummary = {
        scanned: 0,
        dueSoonNotified: 0,
        overdueNotified: 0,
        whatsappAttempted: 0,
    };

    const enabled = options.enabled ?? env.FOLLOWUP_REMINDERS_ENABLED;
    if (!enabled) {
        return summary;
    }

    const now = new Date();
    const dueSoonUntil = new Date(
        now.getTime() + env.FOLLOWUP_DUE_SOON_MINUTES * 60_000,
    );

    const pending = await prisma.followUp.findMany({
        where: {
            status: FollowUpStatus.PENDING,
            dueAt: { lte: dueSoonUntil },
            assignedTo: { not: null },
        },
        include: {
            lead: {
                select: {
                    id: true,
                    partnerId: true,
                    name: true,
                    phone: true,
                    whatsapp: true,
                },
            },
            assignee: { select: { id: true, name: true, phone: true, partnerId: true } },
        },
        take: 200,
        orderBy: { dueAt: 'asc' },
    });

    summary.scanned = pending.length;

    for (const followUp of pending) {
        if (!followUp.assignee) continue;

        const isOverdue = followUp.dueAt < now;
        const type = isOverdue
            ? NotificationType.FOLLOWUP_OVERDUE
            : NotificationType.FOLLOWUP_DUE;

        // Skip if we already notified for this follow-up + type.
        if (await alreadyNotified(followUp.id, type)) {
            continue;
        }

        const leadLabel = followUp.lead.name ?? followUp.leadId;
        const title = isOverdue ? 'Follow-up overdue' : 'Follow-up due soon';
        const message = isOverdue
            ? `Follow-up for "${leadLabel}" was due at ${followUp.dueAt.toISOString()}.`
            : `Follow-up for "${leadLabel}" is due at ${followUp.dueAt.toISOString()}.`;

        await notify({
            userId: followUp.assignee.id,
            partnerId: followUp.lead.partnerId,
            type,
            title,
            message,
            referenceType: 'FollowUp',
            referenceId: followUp.id,
        });

        if (isOverdue) {
            summary.overdueNotified += 1;
        } else {
            summary.dueSoonNotified += 1;
        }

        // WhatsApp stub — prefer lead.whatsapp, then lead/assignee phone.
        const to =
            followUp.lead.whatsapp ?? followUp.lead.phone ?? followUp.assignee.phone;
        if (to) {
            summary.whatsappAttempted += 1;
            void whatsapp.sendText({
                to,
                body: `${title}: ${message}`,
                metadata: {
                    followUpId: followUp.id,
                    leadId: followUp.leadId,
                    type,
                },
            });
        }
    }

    if (
        summary.dueSoonNotified > 0 ||
        summary.overdueNotified > 0 ||
        summary.whatsappAttempted > 0
    ) {
        logger.info(summary, 'follow-up reminder pass complete');
    } else {
        logger.debug(summary, 'follow-up reminder pass (nothing to notify)');
    }

    return summary;
};

/**
 * Starts the interval scanner. Returns a stop function for graceful shutdown.
 */
export const startFollowUpReminderJob = (): (() => void) => {
    if (!env.FOLLOWUP_REMINDERS_ENABLED) {
        logger.info('follow-up reminder job disabled');
        return () => undefined;
    }

    logger.info(
        {
            intervalMs: env.FOLLOWUP_REMINDER_INTERVAL_MS,
            dueSoonMinutes: env.FOLLOWUP_DUE_SOON_MINUTES,
        },
        'follow-up reminder job started',
    );

    // Kick once shortly after boot so local QA sees reminders without waiting.
    const bootTimer = setTimeout(() => {
        void runFollowUpRemindersOnce();
    }, 5_000);
    bootTimer.unref();

    const timer = setInterval(() => {
        void runFollowUpRemindersOnce();
    }, env.FOLLOWUP_REMINDER_INTERVAL_MS);
    timer.unref();

    return () => {
        clearTimeout(bootTimer);
        clearInterval(timer);
        logger.info('follow-up reminder job stopped');
    };
};
