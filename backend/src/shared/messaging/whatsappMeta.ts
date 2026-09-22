/**
 * whatsappMeta.ts - Meta Cloud API WhatsApp Business adapter.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 * Uses native fetch (Node 20+) — no extra npm dependency.
 */

import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { toWhatsAppDigits } from './whatsappPhone.js';
import type {
    WhatsAppAdapter,
    WhatsAppSendInput,
    WhatsAppSendResult,
} from './whatsappTypes.js';

interface MetaMessageResponse {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number };
}

export interface MetaWhatsAppConfig {
    enabled: boolean;
    accessToken: string;
    phoneNumberId: string;
    apiVersion: string;
}

const configFromEnv = (): MetaWhatsAppConfig => ({
    enabled: env.WHATSAPP_ENABLED,
    accessToken: env.WHATSAPP_META_ACCESS_TOKEN,
    phoneNumberId: env.WHATSAPP_META_PHONE_NUMBER_ID,
    apiVersion: env.WHATSAPP_META_API_VERSION,
});

export const createMetaWhatsAppAdapter = (
    overrides?: Partial<MetaWhatsAppConfig>,
): WhatsAppAdapter => {
    const cfg: MetaWhatsAppConfig = { ...configFromEnv(), ...overrides };

    return {
        async sendText(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
            if (!cfg.enabled) {
                return { ok: true, skipped: true, reason: 'disabled' };
            }

            const to = toWhatsAppDigits(input.to);
            if (!to) {
                logger.warn({ raw: input.to }, 'whatsapp meta: invalid recipient');
                return { ok: false, reason: 'invalid_recipient' };
            }

            const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${cfg.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        to,
                        type: 'text',
                        text: { preview_url: false, body: input.body },
                    }),
                });

                const json = (await res.json().catch(() => ({}))) as MetaMessageResponse;

                if (!res.ok) {
                    const reason = json.error?.message ?? `http_${res.status}`;
                    logger.error(
                        {
                            provider: 'whatsapp-meta',
                            to,
                            status: res.status,
                            error: json.error,
                            metadata: input.metadata,
                        },
                        'whatsapp meta send failed',
                    );
                    return { ok: false, reason };
                }

                const providerMessageId = json.messages?.[0]?.id;
                logger.info(
                    {
                        provider: 'whatsapp-meta',
                        to,
                        providerMessageId,
                        metadata: input.metadata,
                    },
                    'whatsapp meta send ok',
                );
                return { ok: true, providerMessageId };
            } catch (err) {
                logger.error(
                    { err, provider: 'whatsapp-meta', to },
                    'whatsapp meta network error',
                );
                return { ok: false, reason: 'network_error' };
            }
        },
    };
};
