/**
 * whatsappTwilio.ts - Twilio WhatsApp messaging adapter.
 *
 * Docs: https://www.twilio.com/docs/whatsapp/api
 * Uses native fetch + Basic auth — no Twilio SDK dependency.
 */

import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { toWhatsAppE164 } from './whatsappPhone.js';
import type {
    WhatsAppAdapter,
    WhatsAppSendInput,
    WhatsAppSendResult,
} from './whatsappTypes.js';

interface TwilioMessageResponse {
    sid?: string;
    status?: string;
    error_message?: string;
    message?: string;
    code?: number;
}

export interface TwilioWhatsAppConfig {
    enabled: boolean;
    accountSid: string;
    authToken: string;
    fromNumber: string;
}

const configFromEnv = (): TwilioWhatsAppConfig => ({
    enabled: env.WHATSAPP_ENABLED,
    accountSid: env.WHATSAPP_TWILIO_ACCOUNT_SID,
    authToken: env.WHATSAPP_TWILIO_AUTH_TOKEN,
    fromNumber: env.WHATSAPP_TWILIO_FROM,
});

/** Ensure Twilio From/To use the whatsapp:+E164 channel prefix. */
const asWhatsAppAddress = (raw: string): string => {
    const trimmed = raw.trim();
    if (trimmed.toLowerCase().startsWith('whatsapp:')) {
        return trimmed;
    }
    const e164 = toWhatsAppE164(trimmed);
    return e164 ? `whatsapp:${e164}` : '';
};

export const createTwilioWhatsAppAdapter = (
    overrides?: Partial<TwilioWhatsAppConfig>,
): WhatsAppAdapter => {
    const cfg: TwilioWhatsAppConfig = { ...configFromEnv(), ...overrides };

    return {
        async sendText(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
            if (!cfg.enabled) {
                return { ok: true, skipped: true, reason: 'disabled' };
            }

            const to = asWhatsAppAddress(input.to);
            const from = asWhatsAppAddress(cfg.fromNumber);
            if (!to || !from) {
                logger.warn(
                    { rawTo: input.to, rawFrom: cfg.fromNumber },
                    'whatsapp twilio: invalid from/to',
                );
                return { ok: false, reason: 'invalid_recipient' };
            }

            const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(cfg.accountSid)}/Messages.json`;
            const basic = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString(
                'base64',
            );
            const form = new URLSearchParams({
                From: from,
                To: to,
                Body: input.body,
            });

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${basic}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: form.toString(),
                });

                const json = (await res.json().catch(() => ({}))) as TwilioMessageResponse;

                if (!res.ok) {
                    const reason =
                        json.error_message ?? json.message ?? `http_${res.status}`;
                    logger.error(
                        {
                            provider: 'whatsapp-twilio',
                            to,
                            status: res.status,
                            code: json.code,
                            error: reason,
                            metadata: input.metadata,
                        },
                        'whatsapp twilio send failed',
                    );
                    return { ok: false, reason };
                }

                logger.info(
                    {
                        provider: 'whatsapp-twilio',
                        to,
                        providerMessageId: json.sid,
                        status: json.status,
                        metadata: input.metadata,
                    },
                    'whatsapp twilio send ok',
                );
                return { ok: true, providerMessageId: json.sid };
            } catch (err) {
                logger.error(
                    { err, provider: 'whatsapp-twilio', to },
                    'whatsapp twilio network error',
                );
                return { ok: false, reason: 'network_error' };
            }
        },
    };
};
