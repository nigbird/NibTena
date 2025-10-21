
import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * MOCK API Endpoint for Step 3: Payment Request
 * This endpoint simulates the Super App's Payment Gateway.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, message: 'Authorization header is missing or malformed.' },
      { status: 401 }
    );
  }
   if (!NIB_PAYMENT_KEY) {
    return NextResponse.json({ message: "Server is missing payment key." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { accountNo, amount, callBackURL, companyName, token, transactionId, transactionTime, signature } = body;
    
    // --- MOCK SIGNATURE VALIDATION ---
    const expectedSignatureString = [
        `accountNo=${accountNo}`,
        `amount=${amount}`,
        `callBackURL=${callBackURL}`,
        `companyName=${companyName}`,
        `Key=${NIB_PAYMENT_KEY}`,
        `token=${token}`,
        `transactionId=${transactionId}`,
        `transactionTime=${transactionTime}`
    ].join('&');
    const expectedSignature = crypto.createHash('sha256').update(expectedSignatureString, 'utf8').digest('hex');

    if (signature !== expectedSignature) {
        return NextResponse.json(
          { success: false, message: 'Invalid signature. Data integrity check failed.' },
          { status: 400 }
        );
    }
    // --- END MOCK VALIDATION ---

    // If validation passes, generate a mock payment token
    const paymentToken = `payment-token-${crypto.randomBytes(16).toString('hex')}`;

    return NextResponse.json({
      success: true,
      message: 'Payment initiated successfully.',
      token: paymentToken, // The new payment token
      transactionId: transactionId,
    });

  } catch (error) {
    console.error('Mock Payment Gateway Error:', error);
    return NextResponse.json(
      { success: false, message: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}
