/**
 * whatsappPhone.ts - Normalize phone numbers for WhatsApp providers.
 *
 * Meta Cloud API expects digits-only international numbers (no leading +).
 * Twilio WhatsApp expects E.164 with a leading +.
 */

/** Strip to digits; empty string if nothing usable remains. */
export const toWhatsAppDigits = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    // Drop a single leading 00 international prefix if present
    if (digits.startsWith('00') && digits.length > 2) {
        return digits.slice(2);
    }
    return digits;
};

/** Digits with a leading + for Twilio / E.164 callers. */
export const toWhatsAppE164 = (raw: string): string => {
    const digits = toWhatsAppDigits(raw);
    return digits ? `+${digits}` : '';
};
