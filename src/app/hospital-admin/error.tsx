'use client';

import { ErrorState } from '@/components/error-state';

export default function HospitalAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} homeHref="/hospital-admin" homeLabel="Back to dashboard" />;
}
