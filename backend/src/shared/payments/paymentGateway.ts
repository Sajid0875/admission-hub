/**
 * paymentGateway.ts - Active payment gateway factory.
 *
 * Providers:
 *   - stub     — local confirm without network (default)
 *   - razorpay — Razorpay Orders API when key id/secret are set
 */

import { logger } from '../../config/logger.js';
import { env } from '../../config/env.js';
import { createStubPaymentGateway } from './paymentGatewayStub.js';
import { createRazorpayPaymentGateway } from './paymentGatewayRazorpay.js';
import type { PaymentGatewayAdapter } from './paymentGatewayTypes.js';

export type {
    CreateOrderInput,
    CreateOrderResult,
    PaymentGatewayAdapter,
    VerifyPaymentInput,
    VerifyPaymentResult,
} from './paymentGatewayTypes.js';

export const createPaymentGateway = (): PaymentGatewayAdapter => {
    if (!env.PAYMENT_GATEWAY_ENABLED) {
        return createStubPaymentGateway();
    }

    if (env.PAYMENT_GATEWAY_PROVIDER === 'razorpay') {
        const hasCreds =
            env.RAZORPAY_KEY_ID.length > 0 && env.RAZORPAY_KEY_SECRET.length > 0;
        if (!hasCreds) {
            logger.warn(
                'PAYMENT_GATEWAY_PROVIDER=razorpay but keys missing — using stub',
            );
            return createStubPaymentGateway();
        }
        logger.info({ provider: 'razorpay' }, 'payment gateway: Razorpay');
        return createRazorpayPaymentGateway();
    }

    return createStubPaymentGateway();
};

/** Active adapter — resolved once at module load. */
export const paymentGateway: PaymentGatewayAdapter = createPaymentGateway();
