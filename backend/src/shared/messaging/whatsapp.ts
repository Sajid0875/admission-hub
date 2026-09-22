/**
 * whatsapp.ts - Messaging adapter for WhatsApp.
 *
 * Providers:
 *   - stub    — logs only (default; safe for local/CI)
 *   - meta    — Meta Cloud API when token + phone-number-id are set
 *   - twilio  — Twilio WhatsApp when account SID + token + from are set
 *
 * Selection: WHATSAPP_PROVIDER + credentials. Missing live creds fall back to stub.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { createMetaWhatsAppAdapter } from './whatsappMeta.js';
import { createTwilioWhatsAppAdapter } from './whatsappTwilio.js';
import type {
    WhatsAppAdapter,
    WhatsAppSendInput,
    WhatsAppSendResult,
} from './whatsappTypes.js';

export type {
    WhatsAppAdapter,
    WhatsAppSendInput,
    WhatsAppSendResult,
} from './whatsappTypes.js';

/**
 * Logs the intended WhatsApp payload and returns a fake message id.
 * Never calls an external network. Safe for local/dev/CI.
 */
export const whatsappStub: WhatsAppAdapter = {
    async sendText(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
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

/**
 * Pick the active adapter from env.
 * Exported for tests so they can re-resolve after env changes if needed.
 */
export const createWhatsAppAdapter = (): WhatsAppAdapter => {
    if (env.WHATSAPP_PROVIDER === 'meta') {
        const hasCreds =
            env.WHATSAPP_META_ACCESS_TOKEN.length > 0 &&
            env.WHATSAPP_META_PHONE_NUMBER_ID.length > 0;

        if (!hasCreds) {
            logger.warn(
                'WHATSAPP_PROVIDER=meta but token/phone-number-id missing — using stub',
            );
            return whatsappStub;
        }

        logger.info(
            { provider: 'whatsapp-meta', apiVersion: env.WHATSAPP_META_API_VERSION },
            'whatsapp adapter: Meta Cloud API',
        );
        return createMetaWhatsAppAdapter();
    }

    if (env.WHATSAPP_PROVIDER === 'twilio') {
        const hasCreds =
            env.WHATSAPP_TWILIO_ACCOUNT_SID.length > 0 &&
            env.WHATSAPP_TWILIO_AUTH_TOKEN.length > 0 &&
            env.WHATSAPP_TWILIO_FROM.length > 0;

        if (!hasCreds) {
            logger.warn(
                'WHATSAPP_PROVIDER=twilio but account SID/token/from missing — using stub',
            );
            return whatsappStub;
        }

        logger.info(
            { provider: 'whatsapp-twilio' },
            'whatsapp adapter: Twilio',
        );
        return createTwilioWhatsAppAdapter();
    }

    return whatsappStub;
};

/** Active adapter — resolved once at module load. */
export const whatsapp: WhatsAppAdapter = createWhatsAppAdapter();
