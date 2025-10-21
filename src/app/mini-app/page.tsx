import { headers } from 'next/headers';
import { getSuperAppToken } from '@/mini-app-integrations/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default async function MiniAppPage() {
  const headerList = headers();
  const authResult = await getSuperAppToken(headerList);

  return (
    <div className="container mx-auto flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Mini App Initialization</CardTitle>
        </CardHeader>
        <CardContent>
          {authResult.status === 'success' ? (
            <div className="flex items-start gap-4 rounded-lg bg-green-50 p-4 text-green-800 border border-green-200">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-bold">Authentication Success</p>
                <p className="text-sm">Authorization token received successfully.</p>
                <p className="mt-2 text-xs font-mono break-all bg-green-100 p-2 rounded">
                  Token: {authResult.token}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 rounded-lg bg-red-50 p-4 text-red-800 border border-red-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-bold">Authentication Failed</p>
                <p className="text-sm">{authResult.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
