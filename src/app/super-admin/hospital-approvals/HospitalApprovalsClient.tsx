'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { reviewHospital, reviewHospitalRequest } from '@/app/super-admin/hospitals/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle2, XCircle, Edit, Trash2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

type PendingHospital = any;
type PendingRequest = any;

export default function HospitalApprovalsClient({ 
  initialHospitals,
  initialRequests 
}: { 
  initialHospitals: PendingHospital[];
  initialRequests: PendingRequest[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [hospitals, setHospitals] = useState(initialHospitals);
  const [requests, setRequests] = useState(initialRequests);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<'hospital' | 'request'>('hospital');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectComments, setRejectComments] = useState('');
  const [pendingRejectId, setPendingRejectId] = useState<number | null>(null);
  const [viewChangesDialogOpen, setViewChangesDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);

  const handleDecision = (id: number, decision: 'approved' | 'rejected') => {
    setActionId(id);
    setActionType('hospital');
    startTransition(async () => {
      const result = await reviewHospital(id, decision);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setHospitals((prev: PendingHospital[]) => prev.filter((h: any) => h.id !== id));
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Action failed', description: result.message });
      }
      setActionId(null);
    });
  };

  const handleViewChanges = (request: PendingRequest) => {
    setSelectedRequest(request);
    setViewChangesDialogOpen(true);
  };

  const handleRequestDecision = (id: number, decision: 'approved' | 'rejected') => {
    setActionId(id);
    setActionType('request');
    
    if (decision === 'rejected') {
      setPendingRejectId(id);
      setRejectDialogOpen(true);
      return;
    }

    startTransition(async () => {
      const result = await reviewHospitalRequest(id, decision);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setRequests((prev: PendingRequest[]) => prev.filter((r: any) => r.id !== id));
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Action failed', description: result.message });
      }
      setActionId(null);
    });
  };

  const formatFieldName = (field: string): string => {
    const fieldMap: Record<string, string> = {
      name: 'Hospital Name',
      description: 'Description',
      city: 'City',
      address: 'Address',
      contactEmail: 'Contact Email',
      contactPhone: 'Contact Phone',
      ownerName: 'Owner Name',
      ownerPhone: 'Owner Phone',
      bankDistrict: 'Bank District',
      bankBranch: 'Bank Branch',
      accountNumber: 'Account Number',
      imageUrl: 'Image URL',
      latitude: 'Latitude',
      longitude: 'Longitude',
      mapDisplayAddress: 'Map Display Address',
      status: 'Status',
    };
    return fieldMap[field] || field;
  };

  const renderChangeComparison = () => {
    if (!selectedRequest || selectedRequest.actionType !== 'edit' || !selectedRequest.proposedChanges) {
      return null;
    }

    const current = selectedRequest.hospital;
    const proposed = selectedRequest.proposedChanges as any;
    const changedFields: string[] = [];

    // Find all changed fields
    Object.keys(proposed).forEach((key) => {
      if (key !== 'password' && key !== 'mustChangePassword') {
        const currentVal = current?.[key as keyof typeof current];
        const proposedVal = proposed[key];
        // Normalize values for comparison (handle null, undefined, empty strings)
        const normalizedCurrent = currentVal === null || currentVal === undefined ? '' : String(currentVal).trim();
        const normalizedProposed = proposedVal === null || proposedVal === undefined ? '' : String(proposedVal).trim();
        if (normalizedCurrent !== normalizedProposed) {
          changedFields.push(key);
        }
      }
    });

    if (changedFields.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No changes detected in this edit request.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {changedFields.map((field) => {
          const currentVal = current?.[field as keyof typeof current] ?? null;
          const proposedVal = proposed[field] ?? null;
          const isPasswordField = field === 'password';

          return (
            <div key={field} className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm">{formatFieldName(field)}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Current Value</Label>
                  <div className="mt-1 p-2 bg-muted rounded text-sm break-words">
                    {currentVal !== null && currentVal !== undefined && currentVal !== '' 
                      ? String(currentVal) 
                      : <span className="text-muted-foreground italic">(empty)</span>}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Proposed Value</Label>
                  <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-sm border border-blue-200 dark:border-blue-800 break-words">
                    {isPasswordField 
                      ? '••••••••' 
                      : (proposedVal !== null && proposedVal !== undefined && proposedVal !== ''
                          ? String(proposedVal)
                          : <span className="text-muted-foreground italic">(empty)</span>)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {proposed.password && (
          <div className="border rounded-lg p-4 space-y-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <h4 className="font-semibold text-sm">Password</h4>
            <p className="text-sm text-muted-foreground">
              Password will be updated (hidden for security)
            </p>
          </div>
        )}
      </div>
    );
  };

  const handleConfirmReject = () => {
    if (pendingRejectId === null) return;
    
    startTransition(async () => {
      const result = await reviewHospitalRequest(pendingRejectId, 'rejected', rejectComments);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setRequests((prev: PendingRequest[]) => prev.filter((r: any) => r.id !== pendingRejectId));
        router.refresh();
      } else {
        toast({ variant: 'destructive', title: 'Action failed', description: result.message });
      }
      setActionId(null);
      setRejectDialogOpen(false);
      setRejectComments('');
      setPendingRejectId(null);
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Hospital Approvals</h1>
        <p className="text-lg text-muted-foreground">Checkers review and approve hospital creations, edits, and deletions from makers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Hospital Creations</CardTitle>
          <CardDescription>New hospital records awaiting checker approval.</CardDescription>
        </CardHeader>
        <CardContent>
          {hospitals.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">No pending hospital creations.</div>
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
                        disabled={isPending && actionId === h.id && actionType === 'hospital'}
                        onClick={() => handleDecision(h.id, 'approved')}
                      >
                        {isPending && actionId === h.id && actionType === 'hospital' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending && actionId === h.id && actionType === 'hospital'}
                        onClick={() => handleDecision(h.id, 'rejected')}
                      >
                        {isPending && actionId === h.id && actionType === 'hospital' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
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

      <Card>
        <CardHeader>
          <CardTitle>Pending Edit & Delete Requests</CardTitle>
          <CardDescription>Hospital edit and delete requests awaiting checker approval.</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">No pending edit or delete requests.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Maker</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.actionType === 'edit' ? (
                          <><Edit className="h-4 w-4 text-blue-500" /><span className="font-medium">Edit</span></>
                        ) : (
                          <><Trash2 className="h-4 w-4 text-red-500" /><span className="font-medium">Delete</span></>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{r.hospital?.name || 'Unknown'}</TableCell>
                    <TableCell>{r.hospital?.city || '-'}</TableCell>
                    <TableCell>{r.maker?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Pending</Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-2">
                      {r.actionType === 'edit' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewChanges(r)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Changes
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="accent"
                        disabled={isPending && actionId === r.id && actionType === 'request'}
                        onClick={() => handleRequestDecision(r.id, 'approved')}
                      >
                        {isPending && actionId === r.id && actionType === 'request' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending && actionId === r.id && actionType === 'request'}
                        onClick={() => handleRequestDecision(r.id, 'rejected')}
                      >
                        {isPending && actionId === r.id && actionType === 'request' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
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

      <Dialog open={viewChangesDialogOpen} onOpenChange={setViewChangesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Review Hospital Edit Changes</DialogTitle>
            <DialogDescription>
              Review the proposed changes for {selectedRequest?.hospital?.name || 'this hospital'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-300px)] pr-4">
            {renderChangeComparison()}
          </ScrollArea>
          {selectedRequest && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setViewChangesDialogOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                disabled={isPending && actionId === selectedRequest.id && actionType === 'request'}
                onClick={() => {
                  setViewChangesDialogOpen(false);
                  setPendingRejectId(selectedRequest.id);
                  setRejectDialogOpen(true);
                }}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                variant="accent"
                disabled={isPending && actionId === selectedRequest.id && actionType === 'request'}
                onClick={() => {
                  setViewChangesDialogOpen(false);
                  handleRequestDecision(selectedRequest.id, 'approved');
                }}
              >
                {isPending && actionId === selectedRequest.id && actionType === 'request' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this request (optional but recommended).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              placeholder="Enter rejection reason..."
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectDialogOpen(false);
              setRejectComments('');
              setPendingRejectId(null);
              setActionId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReject}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}



