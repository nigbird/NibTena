
import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * MOCK API Endpoint for Step 5: Payment Callback
 * This endpoint simulates receiving a successful payment notification from the Super App.
 */
export async function POST(request: NextRequest) {
    // --- Step 1 (re-validated): Check Authorization Header ---
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, message: 'Callback Error: Authorization header is missing or malformed.' },
          { status: 401 }
        );
    }
    // In a real app, you'd re-validate this token with the super app's server.
    // For this mock, we'll just check for its presence.
    const superAppToken = authHeader.substring(7);
     if (!superAppToken) {
        return NextResponse.json(
            { success: false, message: 'Callback Error: Bearer token is missing.' },
            { status: 401 }
        );
    }
    
    let requestBody;
    try {
        requestBody = await request.json();
    } catch (e) {
        console.error("Callback Error: Invalid JSON in request body.", e); 
        return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const {
        paidAmount,
        paidByNumber,
        txnRef,
        transactionId,
        transactionTime,
        accountNo,
        token,
        signature: receivedSignature
    } = requestBody;

    // --- Step 2: Validate Signature ---
    const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
    if (!NIB_PAYMENT_KEY) {
        console.error("Callback Error: NIB_PAYMENT_KEY is not configured on the server.");
        return NextResponse.json({ message: "Internal Server Configuration Error." }, { status: 500 });
    }

    const signatureString = [
        `accountNo=${accountNo}`,
        `paidAmount=${paidAmount}`,
        `paidByNumber=${paidByNumber}`,
        `Key=${NIB_PAYMENT_KEY}`,
        `token=${token}`,
        `transactionId=${transactionId}`,
        `transactionTime=${transactionTime}`,
        `txnRef=${txnRef}`,
    ].join('&');

    const expectedSignature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');

    if (receivedSignature !== expectedSignature) {
        console.error("Callback Error: Invalid signature.");
        return NextResponse.json({ message: 'Invalid signature. Data integrity check failed.' }, { status: 400 });
    }
    
    // --- Step 3: Process the confirmed payment ---
    // If we reach here, the callback is authentic and the data is valid.
    // You would now update your database. For example:
    // 1. Find the appointment/order associated with `transactionId`.
    // 2. Mark it as 'paid'.
    // 3. Store the `txnRef` from the payment gateway.
    
    console.log('--- Successful Payment Callback Received ---');
    console.log(`Transaction ID: ${transactionId}`);
    console.log(`Paid Amount: ${paidAmount}`);
    console.log(`Paid By: ${paidByNumber}`);
    console.log(`Gateway Reference: ${txnRef}`);
    console.log('------------------------------------------');

    // --- Step 4: Respond with success ---
    return NextResponse.json({ message: "Payment confirmed and updated." }, { status: 200 });
}
