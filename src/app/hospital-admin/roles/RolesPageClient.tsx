

'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import {
  createRole,
  updateRole,
  deleteRole,
  createUser,
  updateUser,
  deleteUser,
  getAllPermissions,
  getRolesByHospitalId,
  getUsersByHospitalId,
} from './actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlusCircle,
  Edit,
  Trash2,
  Users,
  Shield,
  Loader2,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


type Permission = { id: number; name: string; description: string; category: string, key: string };
type Role = { id: number; name: string; isAdmin: boolean; permissions: { permission: Permission }[] };
type User = { id: number; name: string; email: string; roleId: number | null; role: Role | null };

export default function RolesPageClient({ hospitalId }: { hospitalId: number }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isUserSheetOpen, setUserSheetOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'role' | 'user'; id: number } | null>(null);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rolesData, usersData, permissionsData] = await Promise.all([
        getRolesByHospitalId(hospitalId),
        getUsersByHospitalId(hospitalId),
        getAllPermissions(),
      ]);
      setRoles(rolesData as Role[]);
      setUsers(usersData as User[]);
      setPermissions(permissionsData as Permission[]);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load data.' });
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateRole = () => {
    setEditingRole(null);
    setSheetOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setSheetOpen(true);
  };

  const handleDeleteItem = (type: 'role' | 'user', id: number) => {
    setItemToDelete({ type, id });
    setAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const action = itemToDelete.type === 'role' ? deleteRole : deleteUser;
    const result = await action(itemToDelete.id);
    if (result.success) {
      toast({ title: 'Success', description: `The ${itemToDelete.type} has been deleted.` });
      fetchData();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setAlertOpen(false);
    setItemToDelete(null);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setUserSheetOpen(true);
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserSheetOpen(true);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Role & User Management</h1>
          <p className="text-lg text-muted-foreground">Create custom roles and manage staff access.</p>
        </div>
      </div>
      <Tabs defaultValue="roles">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="roles"><Shield className="mr-2 h-4 w-4"/>Roles & Permissions</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4"/>User Assignments</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
            <RoleManagementTab
                roles={roles}
                permissions={permissions}
                onCreateRole={handleCreateRole}
                onEditRole={handleEditRole}
                onDeleteRole={(id) => handleDeleteItem('role', id)}
                onSuccess={fetchData}
            />
        </TabsContent>
         <TabsContent value="users">
            <UserManagementTab
                users={users}
                roles={roles}
                onCreateUser={handleCreateUser}
                onEditUser={handleEditUser}
                onDeleteUser={(id) => handleDeleteItem('user', id)}
                onSuccess={fetchData}
             />
        </TabsContent>
      </Tabs>

      {isSheetOpen && (
        <RoleFormSheet
          open={isSheetOpen}
          onOpenChange={setSheetOpen}
          role={editingRole}
          permissions={permissions}
          onSuccess={fetchData}
          hospitalId={hospitalId}
        />
      )}

      {isUserSheetOpen && (
          <UserFormSheet
            open={isUserSheetOpen}
            onOpenChange={setUserSheetOpen}
            user={editingUser}
            roles={roles}
            onSuccess={fetchData}
            hospitalId={hospitalId}
           />
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete?.type}.
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
    </div>
  );
}

// #region Role Management Tab
function RoleManagementTab({ roles, permissions, onCreateRole, onEditRole, onDeleteRole, onSuccess }: any) {
    const displayRoles = useMemo(() => roles.filter((r: Role) => r.name !== 'Owner'), [roles]);
    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(displayRoles[0]?.id || null);

    const selectedRole = useMemo(() => roles.find((r: Role) => r.id === selectedRoleId), [roles, selectedRoleId]);
    
    const groupedPermissions = useMemo(() => {
        return permissions.reduce((acc: any, p: Permission) => {
            (acc[p.category] = acc[p.category] || []).push(p);
            return acc;
        }, {});
    }, [permissions]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Roles & Permissions</span>
                     <Button onClick={onCreateRole}><PlusCircle className="mr-2 h-4 w-4"/> Create Role</Button>
                </CardTitle>
                <CardDescription>Create and manage roles to control user access.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card>
                        <CardHeader className="p-4">
                            <CardTitle className="text-lg">Existing Roles</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                           <ScrollArea className="h-80">
                            <div className="space-y-2">
                                {displayRoles.map((role: Role) => (
                                    <button
                                        key={role.id}
                                        onClick={() => setSelectedRoleId(role.id)}
                                        className={cn(
                                          'w-full text-left p-3 rounded-lg border transition-colors',
                                          selectedRoleId === role.id ? 'bg-accent text-accent-foreground ring-2 ring-accent' : 'hover:bg-muted/50'
                                        )}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">{role.name}</span>
                                            <Badge variant={selectedRoleId === role.id ? "default" : "secondary"}>{role.permissions.length} Perms</Badge>
                                        </div>
                                    </button>
                                ))}
                            </div>
                           </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                     <Card className="h-full">
                        <CardHeader>
                            {selectedRole ? (
                                <>
                                 <CardTitle className="text-lg flex justify-between items-center">
                                    <span>Permissions for &quot;{selectedRole.name}&quot;</span>
                                    <div>
                                         <Button variant="ghost" size="icon" onClick={() => onEditRole(selectedRole)}><Edit className="h-4 w-4"/></Button>
                                         <Button variant="ghost" size="icon" onClick={() => onDeleteRole(selectedRole.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                 </CardTitle>
                                 <CardDescription>This role can perform the following actions.</CardDescription>
                                </>
                            ) : (
                                <CardTitle>Select a Role</CardTitle>
                            )}
                        </CardHeader>
                        <CardContent>
                           {selectedRole ? (
                                <ScrollArea className="h-[22rem]">
                                    <div className="flex flex-wrap gap-2">
                                        {selectedRole.permissions.length > 0 ? (
                                            selectedRole.permissions.map(({permission}: {permission: Permission}) => (
                                                <Badge key={permission.id} variant="outline" className="font-mono text-xs">
                                                    {permission.key}
                                                </Badge>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">This role has no permissions assigned.</p>
                                        )}
                                    </div>
                               </ScrollArea>
                           ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                Select a role from the left to view its permissions.
                            </div>
                           )}
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}

// #endregion

// #region User Management Tab
function UserManagementTab({ users, roles, onCreateUser, onEditUser, onDeleteUser }: any) {
    const displayRoles = useMemo(() => roles.filter((r: Role) => r.name !== 'Owner'), [roles]);
    return (
        <Card>
             <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>User Assignments</span>
                    <Button onClick={onCreateUser}><UserPlus className="mr-2 h-4 w-4"/> Create User</Button>
                </CardTitle>
                <CardDescription>Assign roles to hospital staff members.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg">
                    {users.map((user: User, index: number) => (
                        <div key={user.id} className={`flex items-center justify-between p-4 ${index < users.length - 1 ? 'border-b' : ''}`}>
                            <div>
                                <p className="font-semibold">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                             <div className="flex items-center gap-4">
                                <Badge variant={user.role ? 'default' : 'secondary'}>{user.role?.name || 'No Role'}</Badge>
                                 <div>
                                     <Button variant="outline" size="sm" onClick={() => onEditUser(user)}>Edit</Button>
                                     <Button variant="ghost" size="icon" onClick={() => onDeleteUser(user.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                 </div>
                             </div>
                        </div>
                    ))}
                </div>
                {users.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Users className="mx-auto h-12 w-12"/>
                        <p className="mt-4">No users have been created yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
// #endregion

// #region Role Form Sheet
function RoleFormSheet({ open, onOpenChange, role, permissions, onSuccess, hospitalId }: any) {
  const isEditing = !!role;
  const [name, setName] = useState(role?.name || '');
  const [isAdmin, setIsAdmin] = useState(role?.isAdmin || false);
  const [selectedPerms, setSelectedPerms] = useState<number[]>(role?.permissions.map((p: any) => p.permission.id) || []);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc: any, p: Permission) => {
      (acc[p.category] = acc[p.category] || []).push(p);
      return acc;
    }, {});
  }, [permissions]);

  const handleMasterCheckboxChange = (category: string, isChecked: boolean) => {
    const categoryPermIds = groupedPermissions[category].map((p: Permission) => p.id);
    setSelectedPerms(prev =>
      isChecked ? [...new Set([...prev, ...categoryPermIds])] : prev.filter(id => !categoryPermIds.includes(id))
    );
  };
  
  const handlePermissionToggle = (permId: number) => {
    setSelectedPerms(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };
  
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('isAdmin', String(isAdmin));
    formData.append('permissions', JSON.stringify(selectedPerms));
    if (isEditing) {
        formData.append('id', role.id);
    }
    
  startTransition(async () => {
    const action = isEditing ? updateRole : createRole.bind(null, hospitalId);
    const result: any = await action(formData);
         if (result.success) {
            toast({ title: 'Success', description: `Role ${isEditing ? 'updated' : 'created'}.` });
            onSuccess();
            onOpenChange(false);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message || 'Failed to save role.' });
        }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Role' : 'Create New Role'}</SheetTitle>
          <SheetDescription>
            {isEditing ? 'Modify the name and permissions for this role.' : 'Define a new role and assign permissions.'}
          </SheetDescription>
        </SheetHeader>
        <form id="role-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="py-4 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Role Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Receptionist" required/>
                </div>
                 <div className="flex items-center space-x-2">
                    <Switch id="isAdmin" checked={isAdmin} onCheckedChange={setIsAdmin} />
                    <Label htmlFor="isAdmin" className="flex items-center gap-2 cursor-pointer">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        <span>Administrator Role</span>
                    </Label>
                </div>
                <Separator/>
                <div className="space-y-4">
                     <Label>Permissions</Label>
                     {isAdmin ? (
                         <div className="p-6 bg-amber-50 border-l-4 border-amber-500 text-amber-900 text-sm rounded-md">
                            Administrators have unrestricted access to all features. No specific permissions are needed.
                         </div>
                     ) : (
                        <Accordion type="multiple" className="w-full space-y-2">
                        {Object.entries(groupedPermissions).map(([category, perms]) => {
                             const categoryPerms = perms as Permission[];
                             const categoryPermIds = categoryPerms.map(p => p.id);
                             const selectedCategoryPerms = categoryPermIds.filter(id => selectedPerms.includes(id));
                             const isAllSelected = selectedCategoryPerms.length === categoryPermIds.length;
                             const isIndeterminate = selectedCategoryPerms.length > 0 && !isAllSelected;

                            return (
                                <AccordionItem key={category} value={category} className="border rounded-md px-4">
                                    <AccordionTrigger className="py-3 hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={isAllSelected}
                                                aria-label={`Select all ${category} permissions`}
                                                onCheckedChange={(checked) => handleMasterCheckboxChange(category, !!checked)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className="font-semibold text-md">{category}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-4 pl-8">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {categoryPerms.map(p => (
                                                <div key={p.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`perm-${p.id}`}
                                                        checked={selectedPerms.includes(p.id)}
                                                        onCheckedChange={() => handlePermissionToggle(p.id)}
                                                    />
                                                    <Label htmlFor={`perm-${p.id}`} className="font-normal text-sm cursor-pointer">{p.name.split(':').pop()?.trim()}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                        </Accordion>
                     )}
                </div>
            </div>
            </ScrollArea>
        </form>
         <SheetFooter className="mt-auto pt-4 border-t -mx-6 px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="role-form" disabled={isPending} variant="accent">
                {isPending ? <><Loader2 className="animate-spin mr-2"/> Saving...</> : 'Save Role'}
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
// #endregion

// #region User Form Sheet
function UserFormSheet({ open, onOpenChange, user, roles, onSuccess, hospitalId }: any) {
  const isEditing = !!user;
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const displayRoles = useMemo(() => roles.filter((r: Role) => r.name !== 'Owner'), [roles]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
      let result;
      if (isEditing) {
        result = await updateUser(user.id, formData);
      } else {
        result = await createUser(hospitalId, formData);
      }

      if (result.success) {
        toast({ title: 'Success', description: `User ${isEditing ? 'updated' : 'created'}.` + (!isEditing ? ' An email with credentials has been sent.' : '') });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message || 'Failed to save user.' });
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit User' : 'Create New User'}</SheetTitle>
          <SheetDescription>
            {isEditing ? `Modify details for ${user.name}.` : 'Create a new staff member and assign them a role. A password will be auto-generated and emailed.'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} id="user-form" className="py-4 space-y-4">
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" defaultValue={user?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={user?.email} required />
          </div>

          <div className="space-y-2">
             <Label htmlFor="password">Password</Label>
             <div className="relative">
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder={isEditing ? 'Leave blank to keep unchanged' : 'Auto-generated if blank'} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roleId">Role</Label>
            <Select name="roleId" defaultValue={user?.roleId?.toString()}>
              <SelectTrigger id="roleId">
                <SelectValue placeholder="Assign a role" />
              </SelectTrigger>
              <SelectContent>
                {displayRoles.map((role: Role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
         <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" form="user-form" disabled={isPending} variant="accent">
                {isPending ? <><Loader2 className="animate-spin mr-2"/> Saving...</> : isEditing ? 'Save Changes' : 'Create User'}
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
// #endregion
