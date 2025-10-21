
'use client';

import { headers } from 'next/headers';
import { getSuperAppToken } from '@/mini-app-integrations/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Phone, Loader2 } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { initiatePayment } from './actions';

type ValidationResult =
  | { status: 'success'; phone: string; token: string }
  | { status: 'error'; message: string };

type PaymentResult = 
  | { success: boolean; message: string; paymentToken?: string; }


async function validateTokenWithSuperApp(
  authHeader: string
): Promise<Omit<ValidationResult, 'token'> & {token?: string}> {
  const validationUrl = process.env.NEXT_PUBLIC_VALIDATE_TOKEN_URL;
  
  if (!validationUrl) {
    return {
      status: 'error',
      message: 'VALIDATE_TOKEN_URL is not configured in the environment.',
    };
  }

  try {
    const externalResponse = await fetch(validationUrl, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!externalResponse.ok) {
      const errorData = await externalResponse.json();
      return {
        status: 'error',
        message: `Token validation failed: ${errorData.message || externalResponse.statusText}`,
      };
    }

    const responseData = await externalResponse.json();
    const phoneNumber = responseData.phone;

    if (!phoneNumber) {
        return {
            status: 'error',
            message: 'Phone number not found in validation response.'
        }
    }

    return {
      status: 'success',
      phone: phoneNumber,
    };
  } catch (error) {
    console.error('Error during token validation fetch:', error);
    return {
      status: 'error',
      message: 'A network error occurred while trying to validate the token.',
    };
  }
}

function PaymentForm({ token }: { token: string }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [amount, setAmount] = useState('100'); // Default amount

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        startTransition(async () => {
            const result: PaymentResult = await initiatePayment(token, Number(amount));
            if (result.success) {
                toast({
                    title: 'Payment Request Sent',
                    description: `Payment token received: ${result.paymentToken}`
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Payment Failed',
                    description: result.message,
                });
            }
        });
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Step 3: Make a Payment</CardTitle>
                <CardDescription>Enter an amount to initiate a payment request.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount (ETB)</Label>
                        <Input
                            id="amount"
                            name="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            disabled={isPending}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Request Payment'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}


export default function MiniAppPage() {
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // This effect runs on the client to get the auth header
  useEffect(() => {
    // In a real mini-app environment, the super app provides this.
    // We'll mock it for demonstration.
    const mockToken = 'super-app-secret-token-12345';
    const mockAuthHeader = `Bearer ${mockToken}`;
    setAuthHeader(mockAuthHeader);
  }, []);

  useEffect(() => {
    if (authHeader) {
      const performValidation = async () => {
        setIsLoading(true);
        const result = await validateTokenWithSuperApp(authHeader);
        if (result.status === 'success') {
          setValidationResult({ status: 'success', phone: result.phone, token: authHeader.substring(7) });
        } else {
          setValidationResult({ status: 'error', message: result.message });
        }
        setIsLoading(false);
      }
      performValidation();
    }
  }, [authHeader]);


  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Mini App Integration Flow</CardTitle>
          <CardDescription>
            Executing integration authentication and payment flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1 Result */}
          {authHeader ? (
            <div className="flex items-start gap-4 rounded-lg bg-green-50 p-4 text-green-800 border border-green-200">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-bold">Step 1: Get Token - Success</p>
                <p className="text-sm">Authorization token received successfully.</p>
              </div>
            </div>
          ) : (
             <div className="flex items-start gap-4 rounded-lg bg-gray-50 p-4 text-gray-800 border border-gray-200">
              <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
              <div>
                <p className="font-bold">Step 1: Get Token - In Progress</p>
                <p className="text-sm">Waiting for Authorization header...</p>
              </div>
            </div>
          )}

          {/* Step 2 Result */}
          {validationResult && (
            <>
            {validationResult.status === 'success' ? (
                 <div className="flex items-start gap-4 rounded-lg bg-green-50 p-4 text-green-800 border border-green-200">
                    <Phone className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold">Step 2: Validate Token - Success</p>
                        <p className="text-sm">
                        Authenticated phone number: <strong>{validationResult.phone}</strong>
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-4 rounded-lg bg-red-50 p-4 text-red-800 border border-red-200">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-bold">Step 2: Validate Token - Failed</p>
                        <p className="text-sm">{validationResult.message}</p>
                    </div>
                </div>
            )}
            </>
          )}

          {/* Step 3 UI */}
          {validationResult?.status === 'success' && (
              <PaymentForm token={validationResult.token} />
          )}

        </CardContent>
      </Card>
    </div>
  );
}
