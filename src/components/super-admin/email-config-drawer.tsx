
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { EmailSettingsType } from '@/lib/email-actions';
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { saveGlobalEmailSettings, testEmailConnection } from '@/lib/email-actions';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';

const emptySettings: EmailSettingsType = {
    name: '',
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpEncryption: 'tls',
    imapHost: '', imapPort: 993, imapUser: '', imapPass: '', imapEncryption: 'ssl',
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
  const [showImapPass, setShowImapPass] = useState(false);

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
    
    const data = await testEmailConnection(currentSettings);
    setTestResult(data);

    if (data.smtp.success && data.imap.success) {
      toast({ title: "Connection Successful!", description: "Both SMTP and IMAP connections were successful."});
    } else {
      let errorParts = [];
      if (!data.smtp.success) errorParts.push(`SMTP: ${data.smtp.error}`);
      if (!data.imap.success) errorParts.push(`IMAP: ${data.imap.error}`);
      toast({ variant: "destructive", title: "Connection Failed", description: errorParts.join('\n'), duration: 9000 });
    }
    setIsTesting(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await saveGlobalEmailSettings(currentSettings);
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
        <SheetContent className="sm:max-w-xl w-full flex flex-col">
            <SheetHeader>
                <SheetTitle>{isEditing ? 'Edit Global Email' : 'Add New Global Email'}</SheetTitle>
                <SheetDescription>
                    Provide the SMTP and IMAP details for a shared email account.
                </SheetDescription>
            </SheetHeader>
            <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 py-4">
                    <div>
                        <Label>Configuration Name</Label>
                        <Input placeholder="e.g., Main Gmail Account" value={currentSettings.name} onChange={e => handleFieldChange('name', e.target.value)} />
                        <p className="text-xs text-muted-foreground pt-1">A friendly name to identify this account.</p>
                    </div>
                    <Tabs defaultValue="smtp">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="smtp">Sending (SMTP)</TabsTrigger>
                            <TabsTrigger value="imap">Receiving (IMAP)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="smtp" className="space-y-4 pt-4">
                            <div><Label>Host</Label><Input placeholder="smtp.example.com" value={currentSettings.smtpHost} onChange={e => handleFieldChange('smtpHost', e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Port</Label><Input type="number" placeholder="587" value={currentSettings.smtpPort} onChange={e => handleFieldChange('smtpPort', parseInt(e.target.value, 10))} /></div>
                                <div><Label>Encryption</Label>
                                    <Select value={currentSettings.smtpEncryption} onValueChange={(v) => handleFieldChange('smtpEncryption', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="tls">TLS</SelectItem><SelectItem value="ssl">SSL</SelectItem><SelectItem value="none">None</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div><Label>Username</Label><Input placeholder="you@example.com" value={currentSettings.smtpUser} onChange={e => handleFieldChange('smtpUser', e.target.value)} /></div>
                            <div><Label>Password</Label>
                                <div className="relative">
                                    <Input type={showSmtpPass ? 'text' : 'password'} value={currentSettings.smtpPass} onChange={e => handleFieldChange('smtpPass', e.target.value)} />
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowSmtpPass(!showSmtpPass)}>{showSmtpPass ? <EyeOff /> : <Eye />}</Button>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="imap" className="space-y-4 pt-4">
                            <div><Label>Host</Label><Input placeholder="imap.example.com" value={currentSettings.imapHost} onChange={e => handleFieldChange('imapHost', e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Port</Label><Input type="number" placeholder="993" value={currentSettings.imapPort} onChange={e => handleFieldChange('imapPort', parseInt(e.target.value, 10))} /></div>
                                <div><Label>Encryption</Label>
                                    <Select value={currentSettings.imapEncryption} onValueChange={(v) => handleFieldChange('imapEncryption', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="ssl">SSL</SelectItem><SelectItem value="tls">TLS</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div><Label>Username</Label><Input placeholder="you@example.com" value={currentSettings.imapUser} onChange={e => handleFieldChange('imapUser', e.target.value)} /></div>
                            <div><Label>Password</Label>
                                <div className="relative">
                                    <Input type={showImapPass ? 'text' : 'password'} value={currentSettings.imapPass} onChange={e => handleFieldChange('imapPass', e.target.value)} />
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowImapPass(!showImapPass)}>{showImapPass ? <EyeOff /> : <Eye />}</Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {testResult && (
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className={`flex items-center gap-2 rounded-md border p-3 ${testResult.smtp.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                                {testResult.smtp.success ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                                <div>
                                    <p className="font-semibold">SMTP Test</p>
                                    <p className="text-xs">{testResult.smtp.success ? 'Success' : `Failed: ${testResult.smtp.error}`}</p>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 rounded-md border p-3 ${testResult.imap.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                                {testResult.imap.success ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                                <div>
                                    <p className="font-semibold">IMAP Test</p>
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
