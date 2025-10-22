import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './providers';
import { headers, cookies } from 'next/headers';
import { PatientProvider } from '@/components/patient-portal/patient-context';
import { prisma } from '@/lib/prisma';


async function getPatientIdFromToken(authHeader: string | null) {
  if (!authHeader) return null;

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) return null;

  const validationUrl = process.env.NEXT_PUBLIC_VALIDATE_TOKEN_URL;
  if (!validationUrl) {
    console.error('VALIDATE_TOKEN_URL is not set');
    return null;
  }

  try {
    const response = await fetch(validationUrl, {
      method: 'GET',
      headers: { Authorization: authHeader, Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Token validation failed: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    const phone = data.phone;

    if (!phone) {
        console.error('Phone number not found in validation response');
        return null;
    }
    
    let patient = await prisma.patient.findUnique({ where: { phone } });
    if (!patient) {
      patient = await prisma.patient.create({ data: { phone, name: `Patient ${phone}` } });
    }
    return { patientId: patient.id, token };

  } catch (error) {
    console.error('Error during token validation:', error);
    return null;
  }
}


export const metadata: Metadata = {
  title: 'nibappointment',
  description: 'Your health, simplified.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Some environments may send lowercase header keys; try both. Handle older types that return a Promise.
  const maybeHeaders: any = headers() as any;
  const hdrs: any = typeof maybeHeaders?.get === 'function' ? maybeHeaders : await maybeHeaders;
  const nonce = hdrs.get('x-nonce') || '';
  const authHeader = hdrs.get('Authorization') || hdrs.get('authorization');
  const superAppData = await getPatientIdFromToken(authHeader);
  const maybeCookies: any = cookies() as any;
  const cookieStore: any = typeof maybeCookies?.get === 'function' ? maybeCookies : await maybeCookies;
  const isSuperApp = cookieStore.get('superapp')?.value === '1';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <meta name="csp-nonce" content={nonce} />
      </head>
      <body className="font-body antialiased">
        <PatientProvider patientId={superAppData?.patientId ?? null} superAppToken={superAppData?.token ?? null} isSuperApp={isSuperApp}>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </PatientProvider>
      </body>
    </html>
  );
}
