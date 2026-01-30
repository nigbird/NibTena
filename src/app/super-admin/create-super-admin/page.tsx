'use client';

import { useEffect, useTransition, useState, useActionState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Edit, Trash2, MoreHorizontal, Eye, EyeOff } from 'lucide-react';
import { createSuperAdmin, getSuperAdmins, updateSuperAdmin, deleteSuperAdmin } from './actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { useCsrfToken } from '@/hooks/use-csrf-token';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type SuperAdminRow = Awaited<ReturnType<typeof getSuperAdmins>>[number];

function SuperAdminForm({
  isOpen,
  setIsOpen,
  onSuccess,
  adminToEdit,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSuccess: () => void;
  adminToEdit: SuperAdminRow | null;
}) {
  const { data: session } = useSession();
  const isEditing = !!adminToEdit;
  const { toast } = useToast();
  const [formState, setFormState] = useState({
    name: adminToEdit?.name || '',
    email: adminToEdit?.email || '',
    password: '',
    role: adminToEdit?.role || 'maker',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const csrfToken = useCsrfToken();
  
  const currentUserId = session?.user?.id ? Number(session.user.id) : null;
  const canEditPassword = !isEditing || (adminToEdit && currentUserId === adminToEdit.id);

  useEffect(() => {
    if (isOpen) {
      setFormState({
        name: adminToEdit?.name || '',
        email: adminToEdit?.email || '',
        password: '',
        role: adminToEdit?.role || 'maker',
      });
    }
  }, [isOpen, adminToEdit]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set('name', formState.name);
      fd.set('email', formState.email);
      if (formState.password) {
        fd.set('password', formState.password);
      }
      fd.set('role', formState.role);
      // attach double-submit CSRF token from cookie
      fd.set('_csrf', csrfToken);

      const action = isEditing ? updateSuperAdmin.bind(null, adminToEdit.id) : createSuperAdmin;
      const result = await action(fd);

      if (result.success) {
        toast({ title: 'Success', description: result.message });
        setIsOpen(false);
        onSuccess();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Super Admin' : 'Create Super Admin'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Update the details for this administrator.' : 'New users are stored in the SuperAdmin table.'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4" id="super-admin-form">
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formState.password}
                onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                placeholder={
                  !canEditPassword 
                    ? 'Only the owner can change this password' 
                    : (isEditing ? 'Leave blank to keep unchanged' : 'Required')
                }
                required={!isEditing}
                disabled={!canEditPassword}
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
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
                <SelectItem value="both">Maker & Checker</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="super-admin-form" disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isEditing ? 'Save Changes' : 'Create Admin'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function SuperAdminManagementPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const router = useRouter();
  const saRole = (session?.user as any)?.superAdminRole as 'maker' | 'checker' | 'both' | undefined;
  useEffect(() => {
    if (saRole && saRole !== 'both') {
      router.push('/super-admin');
    }
  }, [saRole, router]);
  const [admins, setAdmins] = useState<SuperAdminRow[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<SuperAdminRow | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<SuperAdminRow | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const fetchAdmins = async () => {
    getSuperAdmins().then(setAdmins).catch(() => setAdmins([]));
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreate = () => {
    setAdminToEdit(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (admin: SuperAdminRow) => {
    setAdminToEdit(admin);
    setIsDrawerOpen(true);
  };

  const handleDelete = (admin: SuperAdminRow) => {
    setAdminToDelete(admin);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!adminToDelete) return;
    const result = await deleteSuperAdmin(adminToDelete.id);
    if (result.success) {
      toast({ title: 'Success', description: 'Super admin deleted.' });
      fetchAdmins();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsAlertOpen(false);
    setAdminToDelete(null);
  };

  return (
    <div className="space-y-6">
      <SuperAdminForm isOpen={isDrawerOpen} setIsOpen={setIsDrawerOpen} onSuccess={fetchAdmins} adminToEdit={adminToEdit} />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the super admin account for {adminToDelete?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Super Admins</CardTitle>
            <CardDescription>Maker/checker roles here are separate from hospital roles.</CardDescription>
          </div>
          <Button onClick={handleCreate} variant="accent">
            <Plus className="h-4 w-4 mr-2" />
            Create Super Admin
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No super admins yet.</TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell className="capitalize">{admin.role}</TableCell>
                    <TableCell>{new Date(admin.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(admin)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(admin)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
