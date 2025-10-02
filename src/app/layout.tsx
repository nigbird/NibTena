import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/header';
import { Logo } from '@/components/icons';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'MediVerse',
  description: 'Your health, simplified.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      </head>
      <body className="font-body antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t bg-white py-8">
            <div className="container">
              <div className="flex flex-col items-center gap-6 text-center md:flex-row md:justify-between">
                <div className="md:order-1">
                  <Link href="/">
                    <Logo />
                  </Link>
                </div>
                <div className="flex gap-6 text-sm md:order-3">
                  <Link
                    href="/hospitals"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Hospitals
                  </Link>
                  <Link
                    href="/doctor-dashboard"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    For Doctors
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground md:order-2">
                  &copy; {new Date().getFullYear()} MediVerse. All rights reserved.
                </div>
              </div>
            </div>
          </footer>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
