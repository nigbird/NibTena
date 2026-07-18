'use client';

import { ErrorState } from '@/components/error-state';

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} homeHref="/super-admin" homeLabel="Back to dashboard" />;
}
