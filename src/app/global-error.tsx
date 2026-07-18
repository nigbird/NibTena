'use client';

import { ErrorState } from '@/components/error-state';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        <div className="flex min-h-screen w-full">
          <ErrorState error={error} reset={reset} homeHref="/" homeLabel="Go home" />
        </div>
      </body>
    </html>
  );
}
