import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, AlertCircle } from 'lucide-react';

export function RestrictedAccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/25 via-background to-muted p-6">
      <Card className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/70 animate-float-slow motion-reduce:animate-none">
        <CardContent className="px-6 py-8 sm:px-10 sm:py-10 text-center">
          <div className="mx-auto mb-6 w-fit rounded-2xl bg-background/70 p-4 shadow-sm ring-1 ring-primary/20">
            <div className="relative">
              <Cloud className="h-14 w-14 text-primary" aria-hidden="true" />
              <span className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm motion-safe:animate-bounce-gentle motion-reduce:animate-none">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xl font-semibold tracking-tight opacity-0 animate-fade-in motion-reduce:opacity-100 motion-reduce:animate-none">
              Sorry!
            </p>

            <p className="text-muted-foreground leading-relaxed opacity-0 animate-fade-in-delay motion-reduce:opacity-100 motion-reduce:animate-none">
              This portal is only available in the{' '}
              <span className="font-semibold text-foreground bg-primary/15 px-1.5 py-0.5 rounded">
                NibAppointment mini app
              </span>{' '}
              within the{' '}
              <span className="font-semibold text-foreground bg-primary/15 px-1.5 py-0.5 rounded">
                NibTera Super App
              </span>
              .
            </p>

            <p className="text-muted-foreground leading-relaxed opacity-0 animate-fade-in-delay-2 motion-reduce:opacity-100 motion-reduce:animate-none">
  your best choice to explore doctors and hospitals, book appointments, and track them easily.            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
