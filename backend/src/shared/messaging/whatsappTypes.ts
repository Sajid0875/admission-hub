/**
 * whatsappTypes.ts - Shared WhatsApp adapter contracts.
 */

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
