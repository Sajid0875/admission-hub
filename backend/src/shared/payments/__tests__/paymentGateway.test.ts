/**
 * paymentGateway.test.ts - Unit tests for intent tokens + gateway adapters.
 */

import { createHmac } from 'node:crypto';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    signPaymentIntent,
    verifyPaymentIntent,
} from '../paymentIntent.js';
import { createStubPaymentGateway } from '../paymentGatewayStub.js';
import { createRazorpayPaymentGateway } from '../paymentGatewayRazorpay.js';

describe('paymentIntent', () => {
    it('round-trips a valid signed intent', () => {
        // Happy: sign → verify returns the same payload fields
        const token = signPaymentIntent({
            admissionId: 'adm-1',
            amount: 1500,
            orderId: 'order_abc',
            provider: 'stub',
            exp: Math.floor(Date.now() / 1000) + 600,
        });

        const result = verifyPaymentIntent(token);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.payload.admissionId).toBe('adm-1');
            expect(result.payload.amount).toBe(1500);
            expect(result.payload.orderId).toBe('order_abc');
        }
    });

    it('rejects tampered signatures', () => {
        const token = signPaymentIntent({
            admissionId: 'adm-1',
            amount: 100,
            orderId: 'order_x',
            provider: 'stub',
            exp: Math.floor(Date.now() / 1000) + 600,
        });
        const [body] = token.split('.');
        expect(verifyPaymentIntent(`${body}.deadbeef`).ok).toBe(false);
    });

    it('rejects expired intents', () => {
        const token = signPaymentIntent({
            admissionId: 'adm-1',
            amount: 100,
            orderId: 'order_x',
            provider: 'stub',
            exp: Math.floor(Date.now() / 1000) - 10,
        });
        const result = verifyPaymentIntent(token);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('intent_expired');
    });
});

describe('createStubPaymentGateway', () => {
    const gateway = createStubPaymentGateway();

    it('creates an order with a verifyable intent', async () => {
        const order = await gateway.createOrder({
            admissionId: 'adm-stub',
            amount: 2500,
        });

        expect(order.provider).toBe('stub');
        expect(order.orderId).toMatch(/^stub_order_/);
        expect(order.amount).toBe(2500);
        expect(order.intentToken.length).toBeGreaterThan(20);

        const verified = await gateway.verifyPayment({
            orderId: order.orderId,
            paymentId: 'stub_pay_test1234',
            intentToken: order.intentToken,
        });
        expect(verified.ok).toBe(true);
        expect(verified.amount).toBe(2500);
        expect(verified.admissionId).toBe('adm-stub');
    });

    it('fails verify when paymentId is too short', async () => {
        const order = await gateway.createOrder({
            admissionId: 'adm-stub',
            amount: 100,
        });
        const verified = await gateway.verifyPayment({
            orderId: order.orderId,
            paymentId: 'ab',
            intentToken: order.intentToken,
        });
        expect(verified.ok).toBe(false);
    });
});

describe('createRazorpayPaymentGateway', () => {
    const originalFetch = globalThis.fetch;
    const keySecret = 'test_razorpay_secret';
    const keyId = 'rzp_test_key';

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('creates an order via Razorpay API and verifies HMAC', async () => {
        globalThis.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    id: 'order_Rzp123',
                    amount: 50000,
                    currency: 'INR',
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        ) as typeof fetch;

        const gateway = createRazorpayPaymentGateway({ keyId, keySecret });
        const order = await gateway.createOrder({
            admissionId: 'adm-rzp',
            amount: 500,
        });

        expect(order.provider).toBe('razorpay');
        expect(order.orderId).toBe('order_Rzp123');
        expect(order.keyId).toBe(keyId);

        const paymentId = 'pay_RzpAbc';
        const signature = createHmac('sha256', keySecret)
            .update(`${order.orderId}|${paymentId}`)
            .digest('hex');

        const verified = await gateway.verifyPayment({
            orderId: order.orderId,
            paymentId,
            signature,
            intentToken: order.intentToken,
        });
        expect(verified.ok).toBe(true);
        expect(verified.amount).toBe(500);
    });

    it('rejects invalid Razorpay signatures', async () => {
        globalThis.fetch = vi.fn(async () =>
            new Response(
                JSON.stringify({
                    id: 'order_RzpBad',
                    amount: 10000,
                    currency: 'INR',
                }),
                { status: 200 },
            ),
        ) as typeof fetch;

        const gateway = createRazorpayPaymentGateway({ keyId, keySecret });
        const order = await gateway.createOrder({
            admissionId: 'adm-rzp',
            amount: 100,
        });

        const verified = await gateway.verifyPayment({
            orderId: order.orderId,
            paymentId: 'pay_x',
            signature: '00'.repeat(32),
            intentToken: order.intentToken,
        });
        expect(verified.ok).toBe(false);
        if (!verified.ok) expect(verified.reason).toBe('invalid_signature');
    });
});
