'use client';

import { ErrorState } from '@/components/error-state';

export default function DoctorPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} reset={reset} homeHref="/doctor-portal" homeLabel="Back to dashboard" />;
}
