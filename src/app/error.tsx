'use client';

import { ErrorState } from '@/components/error-state';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <ErrorState error={error} reset={reset} homeHref="/" homeLabel="Go home" />
    </div>
  );
}
