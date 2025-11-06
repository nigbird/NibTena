
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
import { Loader2, DatabaseZap, BriefcaseMedical, Building, Trash2, Edit, Mail } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getHospitalSpecialties, addSpecialty, updateSpecialty, toggleSpecialtyActive, deleteSpecialty, getHospitalById, updateHospitalGeneralSettings, GeneralSettingsState } from './actions';
import { getEmailSettings } from '@/lib/email-actions';
import { useActionState } from 'react';
import type { Hospital } from '@/lib/definitions';
import type { EmailSettings as EmailConfigType } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import EmailSettingsTab from '@/components/hospital-admin/email-settings-tab';

type Specialty = { id: number; name: string; active: boolean };

function GeneralSettingsForm({ hospital }: { hospital: Hospital }) {
  const { toast } = useToast();
  const { update: updateSession } = useSession();
  const router = useRouter();
  const initialState: GeneralSettingsState = { message: null, errors: {} };
  const updateSettingsWithId = updateHospitalGeneralSettings.bind(null, hospital.id);
  const [state, formAction] = useActionState(updateSettingsWithId, initialState);
  const [isPending, setIsPending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(hospital.imageUrl);
  
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast({ title: 'Settings Saved', description: state.message });
      if (state.updatedHospital) {
        updateSession({
          user: { 
            name: state.updatedHospital.name,
            image: state.updatedHospital.imageUrl,
            city: state.updatedHospital.city,
          }
        });
         window.dispatchEvent(new CustomEvent('hospital-updated'));
      }
    } else if (state.message) {
      toast({ variant: 'destructive', title: 'Error', description: state.message });
    }
     setIsPending(false);
  }, [state, toast, updateSession, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    const formData = new FormData(event.currentTarget);
    formAction(formData);
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your hospital's public information and notification preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="flex items-start gap-6">
              {imagePreview && (
                 <div className="w-24 h-24 relative rounded-md overflow-hidden border-2 border-primary shrink-0">
                    <Image src={imagePreview} alt="Hospital logo preview" fill style={{ objectFit: 'cover' }} />
                </div>
              )}
               <div className="space-y-2 flex-grow">
                  <Label htmlFor="image">Hospital Logo</Label>
                  <Input id="image" name="image" type="file" accept="image/*" onChange={handleImageChange} />
                  <p className="text-xs text-muted-foreground">Recommended size: 400x400px. Max 5MB.</p>
                  {state.errors?.image && <p className="text-destructive text-sm">{state.errors.image[0]}</p>}
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="name">Hospital Name</Label>
                <Input id="name" name="name" defaultValue={hospital.name} required />
                 {state.errors?.name && <p className="text-destructive text-sm">{state.errors.name[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="city">City / Address</Label>
                <Input id="city" name="city" defaultValue={hospital.city} required />
                 {state.errors?.city && <p className="text-destructive text-sm">{state.errors.city[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Enter hospital description" defaultValue={hospital.description} required />
                {state.errors?.description && <p className="text-destructive text-sm">{state.errors.description[0]}</p>}
            </div>
        </CardContent>
        <CardFooter>
           <Button type="submit" variant="accent" disabled={isPending}>
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save General Settings'}
           </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export default function HospitalAdminSettingsPageClient({ hospitalId }: { hospitalId: number }) {
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [emailSettings, setEmailSettings] = useState<{ customSettings: EmailConfigType | null, globalSettings: EmailConfigType[] }>({ customSettings: null, globalSettings: [] });

  const initialState = { message: null, errors: {}, success: false };
  const [addState, addAction] = useActionState(addSpecialty.bind(null, hospitalId), initialState as any);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [hospitalData, specialtiesData, emailData] = await Promise.all([
        getHospitalById(hospitalId),
        getHospitalSpecialties(hospitalId),
        getEmailSettings(hospitalId)
      ]);
      setHospital(hospitalData as Hospital);
      setSpecialties(specialtiesData.map((s: any) => ({ id: s.id, name: s.name, active: s.active })));
      setEmailSettings(emailData as any);
    } catch (e) {
      console.error('Failed to load settings data', e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load hospital data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hospitalId) {
      fetchInitialData();
    }
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
  
  if (isLoading || !hospital) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-96" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-64" /></CardHeader>
          <CardContent><Skeleton className="h-48 w-full" /></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
        <p className="text-lg text-muted-foreground">Manage hospital-wide settings and configurations.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Building className="mr-2 h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="specialties">
            <BriefcaseMedical className="mr-2 h-4 w-4" /> Specialties
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" /> Email
          </TabsTrigger>
          <TabsTrigger value="data">
            <DatabaseZap className="mr-2 h-4 w-4" /> Data Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettingsForm hospital={hospital} />
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
          </Card>
        </TabsContent>

        <TabsContent value="email">
            <EmailSettingsTab 
                hospital={hospital}
                initialCustomSettings={emailSettings.customSettings}
                globalSettings={emailSettings.globalSettings}
                onUpdate={fetchInitialData}
            />
        </TabsContent>
        
        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Set how long patient data is retained. This does not delete data automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const value = Number(e.currentTarget.dataRetentionDays.value);
                  if (!value || value < 1) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid number of days.' });
                    return;
                  }
                  try {
                    const res = await fetch(`/api/hospitals/${hospitalId}/data-management`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ dataRetentionDays: value }),
                    });
                    if (!res.ok) throw new Error('Failed to save');
                    const data = await res.json();
                    setHospital((h) => h ? { ...h, dataRetentionDays: data.dataRetentionDays } : h);
                    toast({ title: 'Saved', description: 'Data retention period updated.' });
                  } catch (err) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Failed to save.' });
                  }
                }}
                className="space-y-6 max-w-md"
              >
                <Label htmlFor="dataRetentionDays">Data Retention Period (Days)</Label>
                <Input
                  id="dataRetentionDays"
                  name="dataRetentionDays"
                  type="number"
                  min={1}
                  defaultValue={hospital?.dataRetentionDays ?? 90}
                  required
                />
                <Button type="submit" variant="accent">Save</Button>
              </form>
              <p className="text-xs text-muted-foreground mt-2">Current: <b>{hospital?.dataRetentionDays ?? 90}</b> days</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
