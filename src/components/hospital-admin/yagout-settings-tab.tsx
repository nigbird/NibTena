'use client';

import React, { useEffect, useState, useActionState, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useCsrfToken } from '@/hooks/use-csrf-token';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  saveYagoutSettings,
  testYagoutConfiguration,
  type YagoutCheck,
  type YagoutSettingsState,
  type YagoutSettingsView,
} from '@/app/hospital-admin/settings/actions';

interface YagoutSettingsTabProps {
  settings: YagoutSettingsView;
  onUpdate: () => void;
}

// The encryption key is write-only: the server never sends it back, so the
// field always starts empty and "Key saved" is the only sign one exists.
export default function YagoutSettingsTab({ settings, onUpdate }: YagoutSettingsTabProps) {
  const { toast } = useToast();
  const csrfToken = useCsrfToken();
  const initialState: YagoutSettingsState = { message: null, errors: {} };
  const [state, formAction] = useActionState(saveYagoutSettings, initialState);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [checks, setChecks] = useState<YagoutCheck[] | null>(null);
  const [keyValue, setKeyValue] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(!!settings.postUrl);

  const configured = !!settings.meId && settings.hasKey;

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Saved', description: state.message });
      setKeyValue('');
      setChecks(null);
      onUpdate();
    } else if (state.message) {
      toast({ variant: 'destructive', title: 'Error', description: state.message });
    }
    setIsSaving(false);
  }, [state]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);
    formData.set('_csrf', csrfToken);
    startTransition(() => formAction(formData));
  };

  const handleTest = async () => {
    setIsTesting(true);
    setChecks(null);
    try {
      const result = await testYagoutConfiguration();
      setChecks(result.checks);
      if (result.message) {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      } else if (result.success) {
        toast({ title: 'Configuration looks good', description: 'A sample request was built and encrypted with your saved credentials.' });
      } else {
        toast({ variant: 'destructive', title: 'Configuration problem', description: 'See the checks below.' });
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>YagoutPay</CardTitle>
              <CardDescription>
                Online payments from patients booking on the web are paid into your hospital&apos;s own YagoutPay merchant account.
                Get your Merchant ID and Encryption Key from YagoutPay.
              </CardDescription>
            </div>
            <Badge variant={configured ? 'default' : 'outline'}>{configured ? 'Configured' : 'Not configured'}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 max-w-xl">
          {!configured && (
            <p className="text-sm text-muted-foreground rounded-md border bg-muted/40 p-3">
              Until this is configured, web patients see &quot;Online payment not yet available for this hospital&quot; and cannot book.
              Super App bookings are not affected.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="yagoutMeId">Yagout Merchant ID (me_id)</Label>
            <Input id="yagoutMeId" name="yagoutMeId" defaultValue={settings.meId ?? ''} autoComplete="off" required />
            {state.errors?.yagoutMeId && <p className="text-destructive text-sm">{state.errors.yagoutMeId[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="yagoutEncryptionKey">Encryption Key</Label>
            <Input
              id="yagoutEncryptionKey"
              name="yagoutEncryptionKey"
              type="password"
              autoComplete="new-password"
              value={keyValue}
              onChange={e => setKeyValue(e.target.value)}
              placeholder={settings.hasKey ? 'Leave blank to keep the saved key' : 'Base64 AES-256 key from YagoutPay'}
              required={!settings.hasKey}
            />
            {settings.hasKey && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Key saved ✓
              </p>
            )}
            {state.errors?.yagoutEncryptionKey && <p className="text-destructive text-sm">{state.errors.yagoutEncryptionKey[0]}</p>}
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced(v => !v)}
            >
              {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Advanced
            </button>
            {/* Kept mounted when collapsed so saving never clears an existing override. */}
            <div className={showAdvanced ? 'space-y-2' : 'hidden'}>
              <Label htmlFor="yagoutPostUrl">Post URL override (optional)</Label>
              <Input
                id="yagoutPostUrl"
                name="yagoutPostUrl"
                type="url"
                defaultValue={settings.postUrl ?? ''}
                placeholder={settings.defaultPostUrl}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the default. Must be https on one of: {settings.allowedHosts.join(', ') || 'none configured'}.
              </p>
              {state.errors?.yagoutPostUrl && <p className="text-destructive text-sm">{state.errors.yagoutPostUrl[0]}</p>}
            </div>
          </div>

          {settings.updatedAt && (
            <p className="text-xs text-muted-foreground">Last updated {new Date(settings.updatedAt).toLocaleString()}</p>
          )}

          {checks && (
            <div className="space-y-2 rounded-md border p-3">
              {checks.map(check => (
                <div key={check.label} className="flex items-start gap-2 text-sm">
                  {check.status === 'pass' && <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />}
                  {check.status === 'warn' && <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />}
                  {check.status === 'fail' && <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />}
                  <div>
                    <span className="font-medium">{check.label}:</span>{' '}
                    <span className="text-muted-foreground break-all">{check.detail}</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                This test does not contact YagoutPay. Your first real payment confirms that YagoutPay has activated these credentials.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button type="submit" variant="accent" disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save YagoutPay Settings'}
          </Button>
          <Button type="button" variant="outline" onClick={handleTest} disabled={isTesting || !configured}>
            {isTesting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</> : 'Test configuration'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
