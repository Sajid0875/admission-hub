/**
 * paymentIntent.ts - Signed payment intent tokens (no DB table required).
 *
 * Format: base64url(json).hmac_sha256_hex
 * Used by stub (and as a binding for razorpay confirm) so amount/admission
 * cannot be tampered with between initiate and confirm.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';

export interface PaymentIntentPayload {
    admissionId: string;
    amount: number;
    orderId: string;
    provider: string;
    exp: number; // unix seconds
}

const secret = (): string =>
    env.PAYMENT_INTENT_SECRET || env.JWT_SECRET;

const b64url = (value: string): string =>
    Buffer.from(value, 'utf8').toString('base64url');

const fromB64url = (value: string): string =>
    Buffer.from(value, 'base64url').toString('utf8');

export const signPaymentIntent = (payload: PaymentIntentPayload): string => {
    const body = b64url(JSON.stringify(payload));
    const sig = createHmac('sha256', secret()).update(body).digest('hex');
    return `${body}.${sig}`;
};

export const verifyPaymentIntent = (
    token: string,
): { ok: true; payload: PaymentIntentPayload } | { ok: false; reason: string } => {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        return { ok: false, reason: 'malformed_intent' };
    }

    const [body, sig] = parts;
    const expected = createHmac('sha256', secret()).update(body).digest('hex');

    try {
        const a = Buffer.from(sig, 'hex');
        const b = Buffer.from(expected, 'hex');
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return { ok: false, reason: 'invalid_intent_signature' };
        }
    } catch {
        return { ok: false, reason: 'invalid_intent_signature' };
    }

    let payload: PaymentIntentPayload;
    try {
        payload = JSON.parse(fromB64url(body)) as PaymentIntentPayload;
    } catch {
        return { ok: false, reason: 'malformed_intent_payload' };
    }

    if (
        !payload.admissionId ||
        typeof payload.amount !== 'number' ||
        !payload.orderId ||
        !payload.exp
    ) {
        return { ok: false, reason: 'invalid_intent_payload' };
    }

    if (payload.exp < Math.floor(Date.now() / 1000)) {
        return { ok: false, reason: 'intent_expired' };
    }

    return { ok: true, payload };
};
