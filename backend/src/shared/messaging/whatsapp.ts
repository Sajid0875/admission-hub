/**
 * whatsapp.ts - Messaging adapter for WhatsApp (stub).
 *
 * Real provider wiring (Meta Cloud API / Twilio) stays out of MVP.
 * Callers use this interface so swapping the stub later is a one-file change.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';

export interface WhatsAppSendInput {
    to: string;
    body: string;
    metadata?: Record<string, unknown>;
}

export interface WhatsAppSendResult {
    ok: boolean;
    skipped?: boolean;
    providerMessageId?: string;
    reason?: string;
}

export interface WhatsAppAdapter {
    sendText(input: WhatsAppSendInput): Promise<WhatsAppSendResult>;
}

/**
 * Logs the intended WhatsApp payload and returns a fake message id.
 * Never calls an external network. Safe for local/dev/CI.
 */
export const whatsappStub: WhatsAppAdapter = {
    async sendText(input) {
        if (!env.WHATSAPP_ENABLED) {
            logger.debug(
                { to: input.to, metadata: input.metadata },
                'whatsapp stub skipped (WHATSAPP_ENABLED=false)',
            );
            return { ok: true, skipped: true, reason: 'disabled' };
        }

        const providerMessageId = `stub-${randomUUID()}`;
        logger.info(
            {
                provider: 'whatsapp-stub',
                to: input.to,
                bodyPreview: input.body.slice(0, 120),
                metadata: input.metadata,
                providerMessageId,
            },
            'whatsapp stub send (no-op)',
        );
        return { ok: true, providerMessageId };
    },
};

/** Active adapter — swap here when a real provider is configured. */
export const whatsapp: WhatsAppAdapter = whatsappStub;
