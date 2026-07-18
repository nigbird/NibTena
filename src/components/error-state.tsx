'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ErrorStateProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  homeHref?: string;
  homeLabel?: string;
};

export function ErrorState({
  error,
  reset,
  title = 'Something went wrong',
  homeHref,
  homeLabel = 'Go back',
}: ErrorStateProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-lg border bg-background p-8 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. You can try again, or come back to this later.
          </p>
        </div>
        {process.env.NODE_ENV !== 'production' && (
          <pre className="w-full overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
        <div className="flex gap-2 pt-2">
          {homeHref && (
            <Button variant="outline" asChild>
              <a href={homeHref}>{homeLabel}</a>
            </Button>
          )}
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
