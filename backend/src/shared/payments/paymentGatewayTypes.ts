/**
 * paymentGatewayTypes.ts - Payment gateway adapter contracts.
 */

export interface CreateOrderInput {
    admissionId: string;
    amount: number; // major currency units (e.g. INR rupees)
    currency?: string;
    receipt?: string;
    notes?: Record<string, string>;
}

export interface CreateOrderResult {
    provider: 'stub' | 'razorpay';
    orderId: string;
    amount: number;
    currency: string;
    /** Publishable key for client checkout (Razorpay key_id); stub returns empty */
    keyId: string;
    /** Opaque intent for confirm step (HMAC-signed for stub; order id for razorpay) */
    intentToken: string;
}

export interface VerifyPaymentInput {
    orderId: string;
    paymentId: string;
    signature?: string;
    intentToken: string;
}

export interface VerifyPaymentResult {
    ok: boolean;
    reason?: string;
    orderId: string;
    paymentId: string;
    amount: number;
    admissionId: string;
}

export interface PaymentGatewayAdapter {
    createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
    verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}
