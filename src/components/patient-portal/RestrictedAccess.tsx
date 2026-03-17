import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Smartphone, ExternalLink, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RestrictedAccess() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 border-primary/20 shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="bg-primary/5 p-8 flex justify-center">
          <div className="relative">
            <Smartphone className="w-24 h-24 text-primary" />
            <ShieldAlert className="w-10 h-10 text-destructive absolute -top-2 -right-2 bg-background rounded-full p-1 border-2 border-destructive" />
          </div>
        </div>
        
        <CardHeader className="text-center pt-6">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">
            Mini App Exclusive
          </CardTitle>
          <CardDescription className="text-lg mt-2 font-medium">
            This portal is only accessible via the Super App
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 text-center pb-8">
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              To ensure the best experience and secure access to your medical records, the patient portal has been moved exclusively to our Mini App environment.
            </p>
            
            <div className="bg-secondary/50 rounded-lg p-4 text-sm font-medium border border-secondary">
              Please open the <span className="text-primary font-bold">Super App</span> on your device and navigate to the <span className="text-primary font-bold">NibTena</span> mini app to continue.
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <Button className="w-full gap-2 text-lg h-12 font-semibold shadow-md transition-all hover:scale-[1.02]" size="lg">
              Open Super App
              <ExternalLink className="w-5 h-5" />
            </Button>
            <p className="text-xs text-muted-foreground">
              If you don't have the app installed, please visit our website for download instructions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
