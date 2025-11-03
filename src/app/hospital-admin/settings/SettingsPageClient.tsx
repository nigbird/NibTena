"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DatabaseZap, BriefcaseMedical, Building, Trash2, Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getHospitalSpecialties, addSpecialty, updateSpecialty, toggleSpecialtyActive, deleteSpecialty } from './actions';
import { useActionState } from 'react';

type Specialty = { id: number; name: string; active: boolean };

export default function HospitalAdminSettingsPageClient({ hospitalId }: { hospitalId: number }) {
  const [retentionPeriod, setRetentionPeriod] = useState('180');
  const [isLoading, setIsLoading] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const initialState = { message: null, errors: {}, success: false };
  const [addState, addAction] = useActionState(addSpecialty.bind(null, hospitalId), initialState as any);

  useEffect(() => {
    fetchList();
  }, [hospitalId]);

  useEffect(() => {
    if (addState.success) {
      toast({ title: 'Specialty Added', description: addState.message });
      setNewSpecialty('');
      fetchList();
    } else if (addState.message) {
      toast({ variant: 'destructive', title: 'Error', description: addState.message });
    }
  }, [addState, toast]);

  async function fetchList() {
    try {
      const list = await getHospitalSpecialties(hospitalId);
      setSpecialties(list.map((s: any) => ({ id: s.id, name: s.name, active: s.active })));
    } catch (e) {
      console.error('Failed to load specialties', e);
    }
  }

  const handleAdd = () => {
    if (!newSpecialty) return;
    const fd = new FormData();
    fd.set('name', newSpecialty);
    addAction(fd);
  };

  const handleToggle = async (id: number) => {
    const res: any = await toggleSpecialtyActive(id);
    if (res?.success) {
      toast({ title: 'Updated', description: res.message });
      fetchList();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res?.message || 'Failed to toggle' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this specialty? This cannot be undone.')) return;
    const res: any = await deleteSpecialty(id);
    if (res?.success) {
      toast({ title: 'Deleted', description: res.message });
      fetchList();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res?.message || 'Failed to delete' });
    }
  };

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const startEdit = (s: Specialty) => { setEditingId(s.id); setEditingName(s.name); setTimeout(() => inputRef.current?.focus(), 50); };

  const saveEdit = async (id: number) => {
    const fd = new FormData();
    fd.set('name', editingName);
    const res = await updateSpecialty(hospitalId, id, {} as any, fd);
    if (res?.success) {
      toast({ title: 'Saved', description: res.message });
      setEditingId(null); setEditingName(''); fetchList();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: res?.message || 'Failed to update' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
        <p className="text-lg text-muted-foreground">Manage hospital-wide settings and configurations.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <Building className="mr-2 h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="specialties">
            <BriefcaseMedical className="mr-2 h-4 w-4" /> Specialties
          </TabsTrigger>
          <TabsTrigger value="data">
            <DatabaseZap className="mr-2 h-4 w-4" /> Data Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <form>
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Update your hospital's public information and notification preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="hospital-name">Hospital Name</Label>
                        <Input id="hospital-name" defaultValue="" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="hospital-logo">Hospital Logo</Label>
                        <Input id="hospital-logo" type="file" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="hospital-address">Address</Label>
                    <Textarea id="hospital-address" placeholder="Enter hospital address" />
                </div>
              </CardContent>
              <CardFooter>
                 <Button type="button" variant="accent" disabled={isLoading} onClick={() => { setIsLoading(true); setTimeout(()=> setIsLoading(false), 800); }}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save General Settings'}
                 </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="specialties">
          <Card>
            <CardHeader>
              <CardTitle>Specialties Management</CardTitle>
              <CardDescription>Add, edit, or remove medical specialties offered at your hospital.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter new specialty name" 
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                />
                <Button onClick={handleAdd}>Add</Button>
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                <h3 className="font-medium">Existing Specialties</h3>
                {specialties.map(specialty => (
                  <div key={specialty.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                        <Switch id={`specialty-${specialty.id}`} checked={specialty.active} onCheckedChange={() => handleToggle(specialty.id)} />
                        {editingId === specialty.id ? (
                          <input ref={inputRef} className="border rounded px-2 py-1" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                        ) : (
                          <Label htmlFor={`specialty-${specialty.id}`} className="font-normal">{specialty.name}</Label>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {editingId === specialty.id ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => saveEdit(specialty.id)}>
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingId(null); setEditingName(''); }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(specialty)}>
                                <Edit className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(specialty.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
               <Button variant="accent" disabled>Save Specialty Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="data">
          <form>
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Configure how system data is managed and retained.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="data-retention" className="font-semibold text-base">Data Retention</Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" variant="accent" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Data Settings'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
