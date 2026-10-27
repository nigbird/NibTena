import { NextResponse } from 'next/server';
import { decryptYagout } from '@/lib/yagout-crypto';
import { parseTxnResponse } from '@/lib/yagout-request';
import { resolveYagoutKeyForMeId, resolveYagoutKeyByTrialDecrypt } from '@/lib/yagout-client';
import { settleYagoutFromReturn } from '@/lib/yagout-settlement';

/**
 * Where YagoutPay returns the patient after payment: /success or /failure.
 * Ported from payget's return handler.
 *
 * This is a form POST performed by the patient's own browser, not a
 * server-to-server webhook, which shapes everything here:
 *
 *  - No query string. Yagout restricts return URLs to letters, digits, "/" and
 *    "_", so the appointment is found by the order_no inside the encrypted body.
 *  - Unauthenticated and attacker-reachable. Nothing is trusted until it
 *    decrypts with a hospital's own key (only Yagout and we hold it), and that
 *    hospital must be the appointment's hospital (checked in settlement).
 *  - The person is waiting. Every path ends in a 303 to a page, never JSON.
 *  - The path segment is a hint, not evidence. The decrypted status and
 *    res_code decide the outcome; a forged POST to /success proves nothing.
 *
 * It sits under /api, outside the middleware matcher, so the CSRF cookie check
 * does not apply; the decryption is the authentication.
 */

function appBaseUrl(request: Request): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');
}

function confirmationRedirect(baseUrl: string, appointmentId: string) {
  return NextResponse.redirect(`${baseUrl}/user/confirmation/${encodeURIComponent(appointmentId)}`, { status: 303 });
}

function errorRedirect(baseUrl: string) {
  return NextResponse.redirect(`${baseUrl}/user/payment-error`, { status: 303 });
}

export async function POST(request: Request, { params }: { params: Promise<{ outcome: string }> }) {
  const baseUrl = appBaseUrl(request);
  const { outcome: rawOutcome } = await params;
  const outcome = rawOutcome === 'success' ? 'success' : 'failure';

  try {
    const form = await request.formData();
    const field = (name: string) => {
      const value = form.get(name);
      return typeof value === 'string' ? value : '';
    };

    const encryptedTxnResponse = field('txn_response');
    if (!encryptedTxnResponse) {
      console.warn('[YAGOUT] Return post missing txn_response', { outcome, fields: Array.from(form.keys()) });
      return errorRedirect(baseUrl);
    }

    // When Yagout sends me_id in plain text it tells us which key to use. In
    // practice it often omits it, so fall back to finding the key by trial.
    let meId = field('me_id').trim();
    let resolved: { hospitalId: number; encryptionKey: string } | null;
    let txnPlain: string;

    if (meId) {
      resolved = await resolveYagoutKeyForMeId(meId);
      if (!resolved) {
        console.warn('[YAGOUT] Return post for an unknown me_id', { meId, outcome });
        return errorRedirect(baseUrl);
      }
      try {
        txnPlain = decryptYagout(encryptedTxnResponse, resolved.encryptionKey);
      } catch (error) {
        // Undecryptable means unauthentic: not from Yagout, or tampered with.
        console.error('[YAGOUT] Return post failed to decrypt', {
          meId,
          hospitalId: resolved.hospitalId,
          outcome,
          error: (error as Error).message,
        });
        return errorRedirect(baseUrl);
      }
    } else {
      const found = await resolveYagoutKeyByTrialDecrypt(encryptedTxnResponse);
      if (!found) {
        console.error('[YAGOUT] Return post without me_id matched no configured key', { outcome, fields: Array.from(form.keys()) });
        return errorRedirect(baseUrl);
      }
      meId = found.meId;
      resolved = { hospitalId: found.hospitalId, encryptionKey: found.encryptionKey };
      txnPlain = found.txnPlain;
    }

    const response = parseTxnResponse(txnPlain);

    // The payload names the merchant it was issued for; it must be the one
    // whose key just decrypted it, or it is a replay from another merchant.
    if (response.meId.trim() !== meId) {
      console.error('[YAGOUT] Return post me_id does not match its payload', { formMeId: meId, payloadMeId: response.meId });
      return errorRedirect(baseUrl);
    }

    const raw: Record<string, string> = { txn_response: txnPlain };
    for (const name of ['pg_details', 'txn_details', 'other_details', 'fraud_details']) {
      const encrypted = field(name);
      if (!encrypted) continue;
      try {
        raw[name] = decryptYagout(encrypted, resolved.encryptionKey);
      } catch {
        // Supplementary detail only: a section we cannot read must not stop us
        // recording an outcome we have already authenticated.
        console.warn('[YAGOUT] Could not decrypt response section', { name, meId });
      }
    }

    const result = await settleYagoutFromReturn({
      response,
      decryptedByHospitalId: resolved.hospitalId,
      raw,
      outcomeHint: outcome,
    });

    console.log('[YAGOUT] Return post applied', {
      outcome,
      orderNo: response.orderNo,
      action: result.action,
      status: result.status,
      reason: result.reason,
    });

    if (!result.appointmentId || result.action === 'cross_tenant' || result.action === 'mismatch') {
      return errorRedirect(baseUrl);
    }
    return confirmationRedirect(baseUrl, result.appointmentId);
  } catch (error) {
    console.error('[YAGOUT] Return post handler failed:', (error as Error).message);
    return errorRedirect(baseUrl);
  }
}

/**
 * Yagout posts here, but a patient who reloads the resulting page, or any
 * link-follower, arrives with GET. Redirect rather than 405.
 */
export async function GET(request: Request) {
  return NextResponse.redirect(`${appBaseUrl(request)}/user/appointments`, { status: 303 });
}
