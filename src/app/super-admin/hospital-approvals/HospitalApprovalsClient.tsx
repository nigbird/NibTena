'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { reviewHospital } from '@/app/super-admin/hospitals/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type PendingHospital = any;

export default function HospitalApprovalsClient({ initialHospitals }: { initialHospitals: PendingHospital[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [hospitals, setHospitals] = useState(initialHospitals);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<number | null>(null);

  const handleDecision = (id: number, decision: 'approved' | 'rejected') => {
    setActionId(id);
    startTransition(async () => {
      const result = await reviewHospital(id, decision);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        // Optimistically remove from list; page will also refresh server-side data.
        setHospitals((prev: PendingHospital[]) => prev.filter((h: any) => h.id !== id));
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Action failed', description: result.message });
      }
      setActionId(null);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Hospital Approvals</h1>
        <p className="text-lg text-muted-foreground">Checkers review and approve hospital creations from makers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Hospitals</CardTitle>
          <CardDescription>New hospital records awaiting checker approval.</CardDescription>
        </CardHeader>
        <CardContent>
          {hospitals.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">No pending hospitals.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Maker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hospitals.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{h.city}</TableCell>
                    <TableCell>{h.createdBySuperAdmin?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Pending</Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="accent"
                        disabled={isPending && actionId === h.id}
                        onClick={() => handleDecision(h.id, 'approved')}
                      >
                        {isPending && actionId === h.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending && actionId === h.id}
                        onClick={() => handleDecision(h.id, 'rejected')}
                      >
                        {isPending && actionId === h.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



