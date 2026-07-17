
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { EmailSettingsType } from '@/lib/email-actions';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { saveGlobalEmailSettings, testEmailConnection } from '@/lib/email-actions';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';


const emptySettings: EmailSettingsType = {
    name: '',
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpEncryption: 'tls',
    configured: false
};

interface EmailConfigDrawerProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: () => void;
  initialSettings: EmailSettingsType | null;
}

export default function EmailConfigDrawer({ isOpen, setIsOpen, onSave, initialSettings }: EmailConfigDrawerProps) {
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<EmailSettingsType>(emptySettings);
  
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ smtp: { success: boolean, error: string }, imap: { success: boolean, error: string } } | null>(null);

  useEffect(() => {
    if (isOpen) {
        setIsEditing(!!initialSettings);
        setCurrentSettings(initialSettings || emptySettings);
        setTestResult(null);
    }
  }, [isOpen, initialSettings]);

  const handleFieldChange = (field: keyof EmailSettingsType, value: string | number) => {
    setCurrentSettings(s => ({ ...s, [field]: value }));
  }

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    // Ensure IMAP user/pass mirror SMTP for Gmail setup
    const settingsToTest: EmailSettingsType = {
        ...currentSettings,
        imapUser: currentSettings.smtpUser,
        imapPass: currentSettings.smtpPass,
    };

        // Basic client-side validation
        if (!settingsToTest.name || String(settingsToTest.name).trim().length === 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Configuration name is required.' });
            setIsTesting(false);
            return;
        }
        if (!settingsToTest.smtpHost || String(settingsToTest.smtpHost).trim().length === 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'SMTP host is required.' });
            setIsTesting(false);
            return;
        }
        if (!settingsToTest.smtpUser || String(settingsToTest.smtpUser).trim().length === 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Email address is required.' });
            setIsTesting(false);
            return;
        }

        const data = await testEmailConnection(settingsToTest);
    setTestResult(data);

    if (data.smtp.success) {
      toast({ title: "Connection Successful!", description: "✅ SMTP connection verified. Emails can be sent using this account." });
    } else {
      toast({ variant: "destructive", title: "Connection Failed", description: `SMTP: ${data.smtp.error}`, duration: 9000 });
    }
    setIsTesting(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        const settingsToSave: EmailSettingsType = {
            ...currentSettings,
            imapUser: currentSettings.smtpUser,
            imapPass: currentSettings.smtpPass,
        };
        // Client-side validation to avoid server Zod errors
        if (!settingsToSave.name || String(settingsToSave.name).trim().length === 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Configuration name is required.' });
            setIsSaving(false);
            return;
        }
        if (!settingsToSave.smtpHost || String(settingsToSave.smtpHost).trim().length === 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'SMTP host is required.' });
            setIsSaving(false);
            return;
        }
        if (!settingsToSave.smtpUser || String(settingsToSave.smtpUser).trim().length === 0) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Email address is required.' });
            setIsSaving(false);
            return;
        }

        await saveGlobalEmailSettings(settingsToSave);
        toast({ title: "Settings Saved", description: "Global email configuration has been saved." });
        onSave();
        setIsOpen(false);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to save email settings.' });
    }
    setIsSaving(false);
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="sm:max-w-lg w-full flex flex-col">
            <SheetHeader>
                <SheetTitle>{isEditing ? 'Edit Global Email' : 'Add New Global Email'}</SheetTitle>
                <SheetDescription>
                    Configure a shared SMTP account for sending notifications.
                </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-6 py-4">
                    <div>
                        <Label htmlFor="configName">Configuration Name</Label>
                        <Input id="configName" placeholder="e.g., Main Notifications" value={currentSettings.name} onChange={e => handleFieldChange('name', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input id="smtpHost" placeholder="e.g., mail.nibbank.com.et or smtp.gmail.com" value={currentSettings.smtpHost} onChange={e => handleFieldChange('smtpHost', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="smtpPort">Port</Label>
                            <Input id="smtpPort" type="number" placeholder="587" value={currentSettings.smtpPort} onChange={e => handleFieldChange('smtpPort', Number(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="smtpEncryption">Encryption</Label>
                            <select id="smtpEncryption" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={currentSettings.smtpEncryption} onChange={e => handleFieldChange('smtpEncryption', e.target.value)}>
                                <option value="tls">TLS (STARTTLS)</option>
                                <option value="ssl">SSL</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="smtpUser">Email Address</Label>
                        <Input id="smtpUser" placeholder="no-reply@nibbank.com.et" value={currentSettings.smtpUser} onChange={e => handleFieldChange('smtpUser', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="smtpPass">
                            Password{isEditing && <span className="text-muted-foreground text-xs ml-1">(leave blank to keep existing)</span>}
                        </Label>
                        <div className="relative">
                            <Input id="smtpPass" type={showSmtpPass ? 'text' : 'password'} value={currentSettings.smtpPass} onChange={e => handleFieldChange('smtpPass', e.target.value)} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowSmtpPass(!showSmtpPass)}>{showSmtpPass ? <EyeOff /> : <Eye />}</Button>
                        </div>
                    </div>

                    {testResult && (
                        <div className={`flex items-center gap-2 rounded-md border p-3 mt-2 ${testResult.smtp.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                            {testResult.smtp.success ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                            <div>
                                <p className="font-semibold">SMTP Connection Test</p>
                                <p className="text-xs">{testResult.smtp.success ? 'Connection successful' : `Failed: ${testResult.smtp.error}`}</p>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <SheetFooter className="pt-4 border-t flex-col sm:flex-row sm:justify-between -mx-6 px-6">
                <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting && <Loader2 className="mr-2 animate-spin" />} Test Connection
                </Button>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setIsOpen(false)}> Cancel </Button>
                    <Button onClick={handleSave} disabled={isSaving} variant="accent">
                        {isSaving ? <><Loader2 className="mr-2 animate-spin" /> Saving...</> : 'Save Changes'}
                    </Button>
                </div>
            </SheetFooter>
        </SheetContent>
    </Sheet>
  );
}
