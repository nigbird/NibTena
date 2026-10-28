'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  postUrl: string;
  meId: string;
  merchantRequest: string;
  hash: string;
};

/**
 * Posts the patient into YagoutPay. Copied from payget and restyled.
 *
 * Yagout accepts the hosted flow only as a real browser form POST from a
 * whitelisted domain, never a REST call, so this submit has to happen in the
 * patient's browser rather than on our server.
 *
 * The button is not a fallback detail: if the automatic submit is blocked, or
 * the patient comes back to this page with the bfcache, they still have a way
 * forward rather than a page that appears to have stalled.
 */
export function YagoutAutoSubmitForm({ postUrl, meId, merchantRequest, hash }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    formRef.current?.submit();

    // If we are still here a few seconds later the submit did not take, so
    // stop showing "redirecting" and let the patient act.
    const timer = setTimeout(() => setStalled(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <form ref={formRef} method="POST" action={postUrl} encType="application/x-www-form-urlencoded">
      <input type="hidden" name="me_id" value={meId} />
      <input type="hidden" name="merchant_request" value={merchantRequest} />
      <input type="hidden" name="hash" value={hash} />

      <Button type="submit" variant="brand" className="h-11 w-full rounded-xl font-semibold">
        {stalled ? (
          'Continue to payment'
        ) : (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to YagoutPay...
          </>
        )}
      </Button>

      {stalled && (
        <p className="pt-3 text-center text-xs text-muted-foreground">
          Not redirected automatically? Use the button above.
        </p>
      )}
    </form>
  );
}
