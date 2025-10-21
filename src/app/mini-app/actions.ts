
'use server';

import { format } from 'date-fns';
import crypto from 'crypto';

export async function initiatePayment(token: string, amount: number) {
    const ACCOUNT_NO = process.env.ACCOUNT_NO;
    const CALLBACK_URL = process.env.CALLBACK_URL;
    const COMPANY_NAME = process.env.COMPANY_NAME;
    const NIB_PAYMENT_KEY = process.env.NIB_PAYMENT_KEY;
    const NIB_PAYMENT_URL = process.env.NIB_PAYMENT_URL;

    if (!ACCOUNT_NO || !CALLBACK_URL || !COMPANY_NAME || !NIB_PAYMENT_KEY || !NIB_PAYMENT_URL) {
        return { success: false, message: "Server is missing required payment configuration." };
    }

    const transactionId = crypto.randomUUID();
    const transactionTime = format(new Date(), 'yyyyMMddHHmmss');

    const signatureString = [
        `accountNo=${ACCOUNT_NO}`,
        `amount=${amount}`,
        `callBackURL=${CALLBACK_URL}`,
        `companyName=${COMPANY_NAME}`,
        `Key=${NIB_PAYMENT_KEY}`,
        `token=${token}`,
        `transactionId=${transactionId}`,
        `transactionTime=${transactionTime}`
    ].join('&');
  
    const signature = crypto.createHash('sha256').update(signatureString, 'utf8').digest('hex');
           
    const payload = {
        accountNo: ACCOUNT_NO,
        amount: String(amount),
        callBackURL: CALLBACK_URL,
        companyName: COMPANY_NAME,
        token: token,
        transactionId: transactionId,
        transactionTime: transactionTime,
        signature: signature
    };
           
    try {
        const response = await fetch(NIB_PAYMENT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        }); 

        const responseData = await response.json();

        if (!response.ok) {
            return { success: false, message: responseData.message || 'Payment Gateway returned an error.' };
        }

        const paymentToken = responseData.token;
        if (!paymentToken) {
             return { success: false, message: 'Payment token not received from the gateway.' };
        }

        // TODO: Store transactionID and associate with the user/appointment
        console.log(`Received payment token: ${paymentToken} for transactionId: ${transactionId}`);

        return { success: true, message: 'Payment initiated.', paymentToken };
        
    } catch (error) {
        console.error("Payment initiation failed:", error);
        return { success: false, message: 'An unexpected error occurred during payment processing.' };
    }
}
