import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from './providers';
import { headers, cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'NibAppointment',
  description: 'Your health, simplified.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = headers().get('x-nonce') || '';
  // Read the double-submit CSRF cookie (set by middleware) and expose it as
  // a safe global for Next's client runtime which expects `csrfToken` when
  // using server actions. The cookie is intentionally non-HttpOnly so client
  // code can read it. We render it into an inline script using the same
  // `nonce` value so CSP allows it.
  const csrfCookie = cookies().get('csrfToken')?.value || '';

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
        {nonce ? (
          <script
            // Attach the per-request nonce so CSP allows this inline script
            {...(nonce ? { nonce } : {})}
            dangerouslySetInnerHTML={{ __html: `window.csrfToken = ${JSON.stringify(csrfCookie)};` }}
          />
        ) : null}
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
