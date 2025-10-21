import { headers } from 'next/headers';
import { getSuperAppToken } from '@/mini-app-integrations/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Phone } from 'lucide-react';

type ValidationResult =
  | { status: 'success'; phone: string }
  | { status: 'error'; message: string };

/**
 * Step 2: Validate the token with the Super App's server.
 * This function calls the validation endpoint and returns the phone number.
 */
async function validateTokenWithSuperApp(
  authHeader: string
): Promise<ValidationResult> {
  const validationUrl = process.env.VALIDATE_TOKEN_URL;

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
      cache: 'no-store', // Ensure we always validate
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

export default async function MiniAppPage() {
  const headerList = headers();
  const authResult = await getSuperAppToken(headerList);

  let validationResult: ValidationResult | null = null;
  if (authResult.status === 'success') {
    // If we got the token, proceed to Step 2: Validate it
    const authHeader = headerList.get('Authorization')!;
    validationResult = await validateTokenWithSuperApp(authHeader);
  }

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Mini App Initialization</CardTitle>
          <CardDescription>
            Executing integration authentication flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1 Result */}
          {authResult.status === 'success' ? (
            <div className="flex items-start gap-4 rounded-lg bg-green-50 p-4 text-green-800 border border-green-200">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-bold">Step 1: Get Token - Success</p>
                <p className="text-sm">Authorization token received successfully.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 rounded-lg bg-red-50 p-4 text-red-800 border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-bold">Step 1: Get Token - Failed</p>
                <p className="text-sm">{authResult.message}</p>
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

        </CardContent>
      </Card>
    </div>
  );
}
