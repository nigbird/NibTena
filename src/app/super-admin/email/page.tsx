
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PlusCircle, Mail, Edit, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { getGlobalEmailSettings, deleteGlobalEmailSetting, testEmailConnection } from '@/lib/email-actions';
import type { EmailSettingsType } from '@/lib/email-actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import EmailConfigDrawer from '@/components/super-admin/email-config-drawer';

export default function GlobalEmailSettingsPage() {
    const [settings, setSettings] = useState<EmailSettingsType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingSetting, setEditingSetting] = useState<EmailSettingsType | null>(null);
    const [testingId, setTestingId] = useState<number | null>(null);
    const { toast } = useToast();

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const data = await getGlobalEmailSettings();
            setSettings(data);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load email settings.' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleAdd = () => {
        setEditingSetting(null);
        setIsDrawerOpen(true);
    };

    const handleEdit = (setting: EmailSettingsType) => {
        setEditingSetting(setting);
        setIsDrawerOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this global configuration?')) return;
        try {
            await deleteGlobalEmailSetting(id);
            toast({ title: 'Success', description: 'Global email setting deleted.' });
            fetchSettings();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to delete setting.' });
        }
    };
    
    const handleTest = async (setting: EmailSettingsType) => {
        setTestingId(setting.id!);
        try {
            const result = await testEmailConnection(setting);
             if (result.smtp.success && result.imap.success) {
                toast({ title: "Connection Successful!", description: `Successfully connected using ${setting.name}.`});
            } else {
                let errorParts = [];
                if (!result.smtp.success) errorParts.push(`SMTP: ${result.smtp.error}`);
                if (!result.imap.success) errorParts.push(`IMAP: ${result.imap.error}`);
                toast({ variant: "destructive", title: "Connection Failed", description: errorParts.join('\n'), duration: 9000 });
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setTestingId(null);
        }
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            )
        }

        if (settings.length === 0) {
            return (
                 <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-12 text-center">
                    <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-semibold font-headline">No Global Emails</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Click "Add Global Email" to create the first one.</p>
                </div>
            )
        }

        return (
            <div className="space-y-4">
                {settings.map(s => (
                    <Card key={s.id}>
                        <CardHeader>
                            <CardTitle>{s.name}</CardTitle>
                            <CardDescription>User: {s.smtpUser} | Host: {s.smtpHost}</CardDescription>
                        </CardHeader>
                        <CardFooter className="flex justify-end gap-2">
                             <Button variant="outline" size="sm" onClick={() => handleTest(s)} disabled={testingId === s.id}>
                                {testingId === s.id ? <Loader2 className="mr-2 animate-spin"/> : null}
                                Test
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(s)}>
                                <Edit className="mr-2" /> Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id!)}>
                                <Trash2 className="mr-2" /> Delete
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight font-headline">Global Email Settings</h1>
                    <p className="text-lg text-muted-foreground">Manage shared email accounts that hospitals can use.</p>
                </div>
                <Button onClick={handleAdd} variant="accent"><PlusCircle className="mr-2"/> Add Global Email</Button>
            </div>
            
            {renderContent()}

            <EmailConfigDrawer 
                isOpen={isDrawerOpen}
                setIsOpen={setIsDrawerOpen}
                onSave={fetchSettings}
                initialSettings={editingSetting}
            />
        </div>
    )
}
