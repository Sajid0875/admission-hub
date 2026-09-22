/**
 * paymentGatewayRazorpay.ts - Razorpay Orders API adapter.
 *
 * Creates orders via POST https://api.razorpay.com/v1/orders
 * Verifies payment with HMAC SHA256 of orderId|paymentId using key secret.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';
import { BadRequestError } from '../errors/AppError.js';
import { signPaymentIntent, verifyPaymentIntent } from './paymentIntent.js';
import type {
    CreateOrderInput,
    CreateOrderResult,
    PaymentGatewayAdapter,
    VerifyPaymentInput,
    VerifyPaymentResult,
} from './paymentGatewayTypes.js';

const INTENT_TTL_SEC = 30 * 60;
const RAZORPAY_ORDERS_URL = 'https://api.razorpay.com/v1/orders';

export interface RazorpayGatewayConfig {
    keyId: string;
    keySecret: string;
}

const configFromEnv = (): RazorpayGatewayConfig => ({
    keyId: env.RAZORPAY_KEY_ID,
    keySecret: env.RAZORPAY_KEY_SECRET,
});

const verifyRazorpaySignature = (
    orderId: string,
    paymentId: string,
    signature: string,
    keySecret: string,
): boolean => {
    const expected = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    try {
        const a = Buffer.from(signature, 'hex');
        const b = Buffer.from(expected, 'hex');
        return a.length === b.length && timingSafeEqual(a, b);
    } catch {
        return false;
    }
};

export const createRazorpayPaymentGateway = (
    overrides?: Partial<RazorpayGatewayConfig>,
): PaymentGatewayAdapter => {
    const cfg: RazorpayGatewayConfig = { ...configFromEnv(), ...overrides };
    const basicAuth = (): string =>
        Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString('base64');

    return {
        async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
            const currency = input.currency ?? 'INR';
            // Razorpay expects amount in paise (minor units)
            const amountPaise = Math.round(input.amount * 100);

            const response = await fetch(RAZORPAY_ORDERS_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${basicAuth()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amountPaise,
                    currency,
                    receipt: input.receipt ?? input.admissionId.slice(0, 40),
                    notes: {
                        admissionId: input.admissionId,
                        ...(input.notes ?? {}),
                    },
                }),
            });

            if (!response.ok) {
                const body = await response.text().catch(() => '');
                throw BadRequestError(
                    `Razorpay order create failed (${response.status}): ${body.slice(0, 200)}`,
                );
            }

            const data = (await response.json()) as {
                id: string;
                amount: number;
                currency: string;
            };

            const intentToken = signPaymentIntent({
                admissionId: input.admissionId,
                amount: input.amount,
                orderId: data.id,
                provider: 'razorpay',
                exp: Math.floor(Date.now() / 1000) + INTENT_TTL_SEC,
            });

            return {
                provider: 'razorpay',
                orderId: data.id,
                amount: input.amount,
                currency: data.currency ?? currency,
                keyId: cfg.keyId,
                intentToken,
            };
        },

        async verifyPayment(
            input: VerifyPaymentInput,
        ): Promise<VerifyPaymentResult> {
            const checked = verifyPaymentIntent(input.intentToken);
            if (!checked.ok) {
                return {
                    ok: false,
                    reason: checked.reason,
                    orderId: input.orderId,
                    paymentId: input.paymentId,
                    amount: 0,
                    admissionId: '',
                };
            }

            const { payload } = checked;
            if (
                payload.provider !== 'razorpay' ||
                payload.orderId !== input.orderId
            ) {
                return {
                    ok: false,
                    reason: 'intent_mismatch',
                    orderId: input.orderId,
                    paymentId: input.paymentId,
                    amount: 0,
                    admissionId: payload.admissionId,
                };
            }

            if (!input.signature) {
                return {
                    ok: false,
                    reason: 'missing_signature',
                    orderId: input.orderId,
                    paymentId: input.paymentId,
                    amount: payload.amount,
                    admissionId: payload.admissionId,
                };
            }

            if (
                !verifyRazorpaySignature(
                    input.orderId,
                    input.paymentId,
                    input.signature,
                    cfg.keySecret,
                )
            ) {
                return {
                    ok: false,
                    reason: 'invalid_signature',
                    orderId: input.orderId,
                    paymentId: input.paymentId,
                    amount: payload.amount,
                    admissionId: payload.admissionId,
                };
            }

            return {
                ok: true,
                orderId: payload.orderId,
                paymentId: input.paymentId,
                amount: payload.amount,
                admissionId: payload.admissionId,
            };
        },
    };
};
