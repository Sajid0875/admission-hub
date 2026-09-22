/**
 * whatsappPhone.ts - Normalize phone numbers for WhatsApp providers.
 *
 * Meta Cloud API expects digits-only international numbers (no leading +).
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
