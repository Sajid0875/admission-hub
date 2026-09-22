/**
 * whatsapp.test.ts - Unit tests for WhatsApp helpers and Meta adapter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toWhatsAppDigits, toWhatsAppE164 } from '../whatsappPhone.js';
import { createMetaWhatsAppAdapter } from '../whatsappMeta.js';
import { createTwilioWhatsAppAdapter } from '../whatsappTwilio.js';
import { createWhatsAppAdapter, whatsappStub } from '../whatsapp.js';

describe('toWhatsAppDigits', () => {
  it('strips non-digits and leading 00', () => {
    // Happy: common E.164 / spaced formats → digits Meta expects
    expect(toWhatsAppDigits('+91 98765-43210')).toBe('919876543210');
    expect(toWhatsAppDigits('00919876543210')).toBe('919876543210');
  });

  it('returns empty for garbage', () => {
    expect(toWhatsAppDigits('abc')).toBe('');
  });
});

describe('toWhatsAppE164', () => {
  it('prefixes digits with +', () => {
    expect(toWhatsAppE164('+91 98765 43210')).toBe('+919876543210');
    expect(toWhatsAppE164('abc')).toBe('');
  });
});

describe('whatsappStub', () => {
  it('returns skipped when disabled via default test env', async () => {
    const result = await whatsappStub.sendText({
      to: '+919876543210',
      body: 'hello',
    });
    expect(result.ok).toBe(true);
  });
});

describe('createWhatsAppAdapter', () => {
  it('returns stub adapter when provider is stub (default)', () => {
    // Factory should not throw; default provider is stub
    const adapter = createWhatsAppAdapter();
    expect(adapter).toBeDefined();
    expect(typeof adapter.sendText).toBe('function');
  });
});

describe('createMetaWhatsAppAdapter', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ messages: [{ id: 'wamid.test123' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it('POSTs to Meta Graph API and returns message id when enabled', async () => {
    const adapter = createMetaWhatsAppAdapter({
      enabled: true,
      accessToken: 'test-token',
      phoneNumberId: '123456789',
      apiVersion: 'v21.0',
    });

    const result = await adapter.sendText({
      to: '+91 98765 43210',
      body: 'Follow-up reminder',
      metadata: { followUpId: 'fu-1' },
    });

    expect(result.ok).toBe(true);
    expect(result.providerMessageId).toBe('wamid.test123');
    expect(fetch).toHaveBeenCalled();
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://graph.facebook.com/v21.0/123456789/messages');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    const body = JSON.parse(String(init.body));
    expect(body.to).toBe('919876543210');
    expect(body.type).toBe('text');
    expect(body.text.body).toBe('Follow-up reminder');
  });

  it('returns ok:false on HTTP error from Meta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: 'Invalid OAuth', code: 190 } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const adapter = createMetaWhatsAppAdapter({
      enabled: true,
      accessToken: 'bad',
      phoneNumberId: '1',
      apiVersion: 'v21.0',
    });

    const result = await adapter.sendText({
      to: '919876543210',
      body: 'x',
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Invalid OAuth');
  });

  it('rejects invalid recipient without calling fetch', async () => {
    const adapter = createMetaWhatsAppAdapter({
      enabled: true,
      accessToken: 'tok',
      phoneNumberId: '1',
      apiVersion: 'v21.0',
    });

    const result = await adapter.sendText({ to: '!!!', body: 'x' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_recipient');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('createTwilioWhatsAppAdapter', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ sid: 'SMxxxxxxxx', status: 'queued' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it('POSTs form-encoded message to Twilio and returns sid', async () => {
    const adapter = createTwilioWhatsAppAdapter({
      enabled: true,
      accountSid: 'ACtest',
      authToken: 'secret',
      fromNumber: '+14155238886',
    });

    const result = await adapter.sendText({
      to: '+91 98765 43210',
      body: 'Twilio reminder',
    });

    expect(result.ok).toBe(true);
    expect(result.providerMessageId).toBe('SMxxxxxxxx');
    expect(fetch).toHaveBeenCalled();
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toContain('api.twilio.com/2010-04-01/Accounts/ACtest/Messages.json');
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
    const form = new URLSearchParams(String(init.body));
    expect(form.get('From')).toBe('whatsapp:+14155238886');
    expect(form.get('To')).toBe('whatsapp:+919876543210');
    expect(form.get('Body')).toBe('Twilio reminder');
  });

  it('returns ok:false on Twilio API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({ code: 21211, message: 'Invalid To phone number' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const adapter = createTwilioWhatsAppAdapter({
      enabled: true,
      accountSid: 'ACtest',
      authToken: 'secret',
      fromNumber: '+14155238886',
    });

    const result = await adapter.sendText({ to: '+1000', body: 'x' });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Invalid To');
  });
});
