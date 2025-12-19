'use client';

import { useEffect, useTransition, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import { createSuperAdmin, getSuperAdmins } from './actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type SuperAdminRow = Awaited<ReturnType<typeof getSuperAdmins>>[number];

async function fetchSuperAdmins() {
  return getSuperAdmins();
}

export default function SuperAdminManagementPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<SuperAdminRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState({ name: '', email: '', password: '', role: 'maker' as 'maker' | 'checker' | 'both' });

  useEffect(() => {
    fetchSuperAdmins().then(setAdmins).catch(() => setAdmins([]));
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set('name', formState.name);
      fd.set('email', formState.email);
      fd.set('password', formState.password);
      fd.set('role', formState.role);
      const result = await createSuperAdmin(fd);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setFormState({ name: '', email: '', password: '', role: 'maker' });
        const fresh = await fetchSuperAdmins();
        setAdmins(fresh);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Super Admins</h1>
        <p className="text-lg text-muted-foreground">Create maker/checker users for the super admin portal.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Super Admin</CardTitle>
          <CardDescription>New users are stored in the SuperAdmin table and used only for the super admin portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formState.email} onChange={(e) => setFormState({ ...formState, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={formState.password} onChange={(e) => setFormState({ ...formState, password: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formState.role} onValueChange={(val: 'maker' | 'checker' | 'both') => setFormState({ ...formState, role: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maker">Maker</SelectItem>
                  <SelectItem value="checker">Checker</SelectItem>
                  <SelectItem value="both">Maker &amp; Checker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="accent" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Create
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Super Admins</CardTitle>
          <CardDescription>Maker/checker roles here are separate from hospital roles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No super admins yet.</TableCell>
                </TableRow>
              ) : (
                admins.map((admin: any) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell className="capitalize">{admin.role}</TableCell>
                    <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

