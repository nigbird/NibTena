# YagoutPay web payments

NibTena takes payments through two paths:

| Visitor | Identity | Pays with | Money goes to |
|---|---|---|---|
| Inside the NIB Super App (mini app) | `miniapp_session` cookie | Super App (`NIB_PAYMENT_URL`) | `hospital.accountNumber` |
| Public web | Phone OTP, `nib-tena-patient-session` cookie | YagoutPay hosted checkout | That hospital's own Yagout merchant (`me_id`) |

The mini-app path is unchanged. This document covers the YagoutPay path.

## Multi-tenancy

Every hospital is its own Yagout merchant, with its own `me_id` and AES-256 encryption key issued directly by YagoutPay.
A payment for an appointment is always raised against the merchant of the hospital it is booked at.

There is **no platform-wide fallback account**. If a hospital has not configured YagoutPay, web patients see
"Online payment not yet available for this hospital" and cannot book there. Super App bookings at that hospital still work.

## Flow

1. The patient picks a doctor and slot on `/user/...` and fills in the booking form (`/user/book/[doctorId]`).
2. If they are not already verified for that phone, an OTP is sent (`startBookingProcess` → `requestOtp`) and they
   verify on `/user/verify/otp`. That sets `nib-tena-patient-session` (15 minutes).
3. **Proceed to Payment** calls `initiateYagoutBooking` (`src/app/user/book/[doctorId]/yagout-actions.ts`), which:
   - takes the patient only from the verified cookie and the fee only from `doctor.consultationFee`;
   - resolves the hospital's own Yagout config (or refuses);
   - creates the appointment as `pending-payment`, `paymentMethod = "YAGOUT"`, a fresh alphanumeric `orderNo`, and
     `paymentExpiresAt = now + YAGOUT_PAYMENT_HOLD_MINUTES` (the slot hold);
   - builds, encrypts and hashes the Yagout request and stores `{ meId, postUrl, merchantRequest, hash, amount, currency }`
     in `appointment.paymentRequest`.
4. The browser goes to `/user/pay/[appointmentId]`, which renders the stored fields verbatim in a form that auto-submits
   (browser POST) to the hospital's Yagout post URL.
5. Yagout posts the patient back to `/api/payments/yagout/return/success` or `/failure`. The handler finds the key
   (plain `me_id`, else trial decrypt across configured hospitals), decrypts, checks the payload `me_id`, then settles in
   `src/lib/yagout-settlement.ts`:
   - the hospital whose key decrypted the post must be the appointment's hospital, and the payload `me_id` must be that
     hospital's `yagoutMeId` (otherwise rejected and logged as a cross-tenant replay);
   - the outcome comes from the decrypted `status` and `res_code`, never from the URL path;
   - success needs the amount to match what was raised; then `pending-payment → confirmed` with `paymentRef` (`pg_ref`),
     `paidAmount`, `paidAt`;
   - a success after the hold lapsed is confirmed if the slot is still free, otherwise `paid-slot-conflict`;
   - failure → `payment-failed`; a failure after success is ignored; repeated posts change nothing.
6. The patient lands on `/user/confirmation/[appointmentId]`, which shows confirmed / pending / failed / expired /
   conflict, with **Try payment again** (a new appointment, new `orderNo`, new hold) for failed or expired payments.

Yagout has no status-enquiry API, so the return POST is the only signal. If a patient closes the browser on Yagout's
page after paying, no return arrives; the hold expires and the payment must be reconciled from the hospital's Yagout
settlement report (search by order number or `pg_ref`).

## Appointment statuses added

| Status | Meaning | Slot |
|---|---|---|
| `pending-payment` with `paymentExpiresAt` in the future | Patient is paying | Held |
| `payment-expired` | Hold lapsed without a result | Free |
| `payment-failed` | Yagout reported failure | Free |
| `payment-failed` with `paidAmount` set | Yagout reported success for a different amount. **Needs action** | Free |
| `paid-slot-conflict` | Paid after the hold lapsed and someone else took the slot. **Refund or rebook** | Not held |

Hospital admin lists and reports show payment method, `pg_ref`, paid amount and paid time, and highlight the
"needs action" rows.

## What NibTena must set up with Yagout (once)

1. **Whitelist the domain** that serves the hand-off page: the host of `NEXT_PUBLIC_BASE_URL`
   (e.g. `appointments.example.com`). Yagout accepts the hosted checkout only from whitelisted domains.
2. **Register the return URLs** (exactly; Yagout allows only letters, digits, `/` and `_` in the path, no query string):
   - `https://<your host>/api/payments/yagout/return/success`
   - `https://<your host>/api/payments/yagout/return/failure`
3. Set the env vars in `.env.example`: `YAGOUTPAY_AGGREGATOR_ID`, `YAGOUTPAY_POST_URL` (UAT or production),
   `YAGOUTPAY_ALLOWED_HOSTS`, `NEXT_PUBLIC_BASE_URL`, `HOSPITAL_SECRET_KEY`, `YAGOUT_PAYMENT_HOLD_MINUTES`,
   `YAGOUT_FALLBACK_EMAIL`, `CRON_SECRET`, and the SMS provider variables. No merchant ID or key goes in env.
4. Schedule `POST /api/cron/expire-payment-holds` with header `x-cron-secret: $CRON_SECRET` (e.g. every 5 minutes).
   Availability also expires holds lazily, so this only keeps lists tidy.

Ask Yagout whether each hospital's merchant also needs the domain and return URLs registered against its own `me_id`.

## Hospital onboarding

1. The hospital gets its **Merchant ID (`me_id`)** and **Encryption Key** from YagoutPay.
2. The hospital admin (or a staff role with the **Manage Payment Settings** permission, `PaymentSettings:Manage`) opens
   **Settings → YagoutPay**, enters both and saves. The key is write-only: after saving it shows "Key saved ✓" and is
   never shown again. Leave it blank on later saves to keep it.
3. Click **Test configuration**. It builds, encrypts, hashes and decrypts a sample request with the saved credentials
   and checks the return URLs and post URL. It does not contact Yagout; the first real payment confirms Yagout has
   activated the merchant.
4. The super admin sees "Yagout: configured ✓ / not configured" per hospital in the hospital list, but never the key.

Each `me_id` can belong to only one hospital.

## Security notes

- The Yagout key is AES-256-GCM encrypted at rest with `HOSPITAL_SECRET_KEY` (`src/lib/hospital-secret.ts`) and is
  omitted from every Prisma query by default (`src/lib/prisma.ts`). So are `paymentRequest` and `paymentRaw`.
- The return route trusts a post only if it decrypts with the appointment's own hospital key.
- The CSP `form-action` lists the Yagout origins from `YAGOUTPAY_POST_URL` and `YAGOUTPAY_ALLOWED_HOSTS` explicitly.
- `|` and `~` are stripped from free text (patient name) before it enters the request.
- OTP sends are limited per phone (3 per 15 min) and per IP (10 per 15 min); verification per IP (30 per 15 min) on top
  of the existing per-phone lockout.
