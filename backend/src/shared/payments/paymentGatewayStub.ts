/**
 * paymentGatewayStub.ts - Local/dev gateway (no external network).
 */

import { randomUUID } from 'node:crypto';
import { signPaymentIntent, verifyPaymentIntent } from './paymentIntent.js';
import type {
    CreateOrderInput,
    CreateOrderResult,
    PaymentGatewayAdapter,
    VerifyPaymentInput,
    VerifyPaymentResult,
} from './paymentGatewayTypes.js';

const INTENT_TTL_SEC = 30 * 60;

export const createStubPaymentGateway = (): PaymentGatewayAdapter => ({
    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
        const orderId = `stub_order_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
        const currency = input.currency ?? 'INR';
        const intentToken = signPaymentIntent({
            admissionId: input.admissionId,
            amount: input.amount,
            orderId,
            provider: 'stub',
            exp: Math.floor(Date.now() / 1000) + INTENT_TTL_SEC,
        });

        return {
            provider: 'stub',
            orderId,
            amount: input.amount,
            currency,
            keyId: '',
            intentToken,
        };
    },

    async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
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
        if (payload.provider !== 'stub' || payload.orderId !== input.orderId) {
            return {
                ok: false,
                reason: 'intent_mismatch',
                orderId: input.orderId,
                paymentId: input.paymentId,
                amount: 0,
                admissionId: payload.admissionId,
            };
        }

        if (!input.paymentId || input.paymentId.length < 4) {
            return {
                ok: false,
                reason: 'missing_payment_id',
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
});
