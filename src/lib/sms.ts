/**
 * Outbound SMS, selected by SMS_PROVIDER:
 *
 *  - "http":    POSTs JSON { to, message, sender } to SMS_API_URL with
 *               `Authorization: Bearer ${SMS_API_KEY}`. Adapt `HttpSmsProvider`
 *               if your gateway expects a different body.
 *  - "console": logs the message. Refused in production, because a code that
 *               only reaches the server log lets nobody sign in and invites
 *               someone to "fix" it by returning the code to the client.
 *
 * Unset defaults to "console" outside production and to an error in production.
 */

export interface SmsProvider {
  send(to: string, message: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async send(to: string, message: string) {
    console.log(`[sms:console] to=${to} message=${message}`);
  }
}

class HttpSmsProvider implements SmsProvider {
  constructor(private url: string, private apiKey: string, private sender?: string) {}

  async send(to: string, message: string) {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ to, message, ...(this.sender ? { sender: this.sender } : {}) }),
      cache: 'no-store',
    });
    if (!res.ok) {
      // Body may echo the message (and so the code); log the status only.
      throw new Error(`SMS provider responded ${res.status}`);
    }
  }
}

export function getSmsProvider(): SmsProvider {
  const provider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';

  if (provider === 'http') {
    const url = process.env.SMS_API_URL?.trim();
    const apiKey = process.env.SMS_API_KEY?.trim();
    if (!url || !apiKey) throw new Error('SMS_PROVIDER=http requires SMS_API_URL and SMS_API_KEY');
    return new HttpSmsProvider(url, apiKey, process.env.SMS_SENDER_ID?.trim() || undefined);
  }

  if ((provider === '' || provider === 'console') && !isProduction) {
    return new ConsoleSmsProvider();
  }

  throw new Error(`No usable SMS provider configured (SMS_PROVIDER="${provider}")`);
}
