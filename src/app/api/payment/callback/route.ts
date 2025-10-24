
'use server';

import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * This endpoint handles the callback from the NIB payment gateway after a transaction.
 * It validates the request, updates the appointment status, and confirms the payment.
 */
export async function POST(request: NextRequest) {
  let requestBody;
  try {
    requestBody = await request.json();
    console.log("Callback received with body:", requestBody);
  } catch (e) {
    console.error("Callback Error: Invalid JSON in request body.", e);
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const {
    paidAmount,
    paidByNumber,
    txnRef,
    transactionId,
    transactionTime,
    accountNo,
    token,
    Signature: receivedSignature, // Renaming to avoid conflict with local signature variable
  } = requestBody;

  if (!transactionId) {
      return NextResponse.json({ message: "Missing transactionId." }, { status: 400 });
  }

  // --- Security Validation (Placeholder) ---
  // In a real application, you MUST validate the incoming request.
  // 1. Validate the `Authorization` header token from the request.
  // 2. Re-calculate the signature and compare it with `receivedSignature`.
  // This ensures the request is genuinely from the NIB gateway.
  // For now, we will proceed assuming the request is valid.

  try {
    // Find the appointment using the transactionId from the payment gateway
    const appointment = await prisma.appointment.findFirst({
      where: {
        transactionId: transactionId,
        status: 'pending-payment',
      },
    });

    if (!appointment) {
      console.warn(`Callback Warning: Appointment with transactionId ${transactionId} not found or already processed.`);
      // Return 200 to prevent the gateway from retrying, as we can't process this.
      return NextResponse.json({ message: "Appointment not found or already processed." }, { status: 200 });
    }

    // Update the appointment status to 'confirmed'
    await prisma.appointment.update({
      where: {
        id: appointment.id,
      },
      data: {
        status: 'confirmed',
        // You can also store other payment details here if needed,
        // e.g., paidAmount, txnRef, etc., by adding them to your Prisma schema.
      },
    });
    
    console.log(`Successfully confirmed payment for appointment ${appointment.id}`);

    // Acknowledge the successful processing to the payment gateway
    return NextResponse.json({ message: "Payment confirmed and appointment updated." }, { status: 200 });

  } catch (error) {
    console.error(`Callback Error: Failed to update appointment for transactionId ${transactionId}.`, error);
    // Return a 400 error to indicate a failure in processing on our end.
    // The payment gateway might retry sending the callback.
    return NextResponse.json({ message: "Failed to update appointment record." }, { status: 400 });
  }
}
