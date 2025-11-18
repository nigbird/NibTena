
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { EmailSettingsType } from '@/lib/email-actions';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Info } from 'lucide-react';
import { saveGlobalEmailSettings, testEmailConnection } from '@/lib/email-actions';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


const emptySettings: EmailSettingsType = {
    name: '',
    smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpUser: '', smtpPass: '', smtpEncryption: 'tls',
    imapHost: 'imap.gmail.com', imapPort: 993, imapUser: '', imapPass: '', imapEncryption: 'ssl',
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

    const data = await testEmailConnection(settingsToTest);
    setTestResult(data);

    if (data.smtp.success && data.imap.success) {
      toast({ title: "Connection Successful!", description: `✅ Connection successful! Emails can be sent using this Gmail account.`});
    } else {
      let errorParts = [];
      if (!data.smtp.success) errorParts.push(`Sending (SMTP): ${data.smtp.error}`);
      if (!data.imap.success) errorParts.push(`Receiving (IMAP): ${data.imap.error}`);
      toast({ variant: "destructive", title: "Connection Failed", description: errorParts.join('\n'), duration: 9000 });
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
                    Provide the details for a shared Gmail account.
                </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-6 py-4">
                    <div>
                        <Label htmlFor="configName">Configuration Name</Label>
                        <Input id="configName" placeholder="e.g., Main Notifications" value={currentSettings.name} onChange={e => handleFieldChange('name', e.target.value)} />
                    </div>
                     <div>
                        <Label htmlFor="gmailAddress">Gmail Address</Label>
                        <Input id="gmailAddress" placeholder="your-account@gmail.com" value={currentSettings.smtpUser} onChange={e => handleFieldChange('smtpUser', e.target.value)} />
                     </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <Label htmlFor="appPassword">App Password</Label>
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button type="button" className="text-muted-foreground"><Info className="h-4 w-4" /></button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        <p className="font-bold mb-2">How to get a Google App Password:</p>
                                        <ol className="list-decimal list-inside space-y-1 text-xs">
                                            <li>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-primary underline">myaccount.google.com/security</a>.</li>
                                            <li>Under "Signing in to Google," select "App passwords".</li>
                                            <li>Generate a 16-character password and paste it here.</li>
                                        </ol>
                                         <p className="text-xs mt-2 text-muted-foreground">Note: 2-Step Verification must be enabled on the Google account.</p>
                                    </TooltipContent>
                                </Tooltip>
                             </TooltipProvider>
                        </div>
                        <div className="relative">
                            <Input id="appPassword" type={showSmtpPass ? 'text' : 'password'} value={currentSettings.smtpPass} onChange={e => handleFieldChange('smtpPass', e.target.value)} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowSmtpPass(!showSmtpPass)}>{showSmtpPass ? <EyeOff /> : <Eye />}</Button>
                        </div>
                    </div>

                    {testResult && (
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className={`flex items-center gap-2 rounded-md border p-3 ${testResult.smtp.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                                {testResult.smtp.success ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                                <div>
                                    <p className="font-semibold">Sending Test</p>
                                    <p className="text-xs">{testResult.smtp.success ? 'Success' : `Failed: ${testResult.smtp.error}`}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 rounded-md border p-3 ${testResult.imap.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                                {testResult.imap.success ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                                <div>
                                    <p className="font-semibold">Receiving Test</p>
                                    <p className="text-xs">{testResult.imap.success ? 'Success' : `Failed: ${testResult.imap.error}`}</p>
                                </div>
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
