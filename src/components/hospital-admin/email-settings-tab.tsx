
'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { EmailSettingsType } from '@/lib/email-actions';
import { Mail, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { updateEmailSettings, testEmailConnection, setHospitalEmailPreference } from '@/lib/email-actions';
import type { Hospital } from '@/lib/definitions';
import type { EmailSettings as EmailConfigType } from '@prisma/client';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

const emptySettings: EmailSettingsType = {
    name: 'Custom',
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpEncryption: 'tls',
    imapHost: '', imapPort: 993, imapUser: '', imapPass: '', imapEncryption: 'ssl',
    configured: false
};

interface EmailSettingsDialogProps {
  hospital: Hospital;
  initialCustomSettings: EmailConfigType | null;
  globalSettings: EmailConfigType[];
  onUpdate: () => void;
}

export default function EmailSettingsTab({ hospital, initialCustomSettings, globalSettings, onUpdate }: EmailSettingsDialogProps) {
  const { toast } = useToast();
  
  const [configType, setConfigType] = useState<'global' | 'custom'>(hospital.useGlobalEmailId ? 'global' : 'custom');
  const [selectedGlobalId, setSelectedGlobalId] = useState<string | undefined>(hospital.useGlobalEmailId?.toString());
  const [customSettings, setCustomSettings] = useState<EmailSettingsType>(initialCustomSettings || emptySettings);
  
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showImapPass, setShowImapPass] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ smtp: { success: boolean, error: string }, imap: { success: boolean, error: string } } | null>(null);

  useEffect(() => {
    setConfigType(hospital.useGlobalEmailId ? 'global' : 'custom');
    setSelectedGlobalId(hospital.useGlobalEmailId?.toString());
    setCustomSettings(initialCustomSettings || emptySettings);
  }, [hospital, initialCustomSettings]);

  const handleFieldChange = (field: keyof EmailSettingsType, value: string | number) => {
    setCustomSettings(s => ({ ...s, [field]: value }));
  }

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    let settingsToTest;
    if (configType === 'global' && selectedGlobalId) {
        settingsToTest = globalSettings.find(g => g.id === Number(selectedGlobalId));
    } else {
        settingsToTest = customSettings;
    }

    if (!settingsToTest) {
        toast({ variant: "destructive", title: "Error", description: "No settings to test." });
        setIsTesting(false);
        return;
    }
    
    const data = await testEmailConnection(settingsToTest as EmailSettingsType);
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
        if (configType === 'global') {
            if (!selectedGlobalId) throw new Error("No global configuration selected.");
            await setHospitalEmailPreference(hospital.id, 'global', Number(selectedGlobalId));
        } else {
            await setHospitalEmailPreference(hospital.id, 'custom', null);
            await updateEmailSettings(hospital.id, { ...customSettings, configured: true });
        }
        toast({ title: "Settings Saved", description: "Your email configuration has been updated." });
        onUpdate();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'Failed to save email settings.' });
    }
    setIsSaving(false);
  };
  

  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail /> Email Configuration</CardTitle>
            <CardDescription>Choose a global email account or set up your own custom SMTP/IMAP server for sending notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <RadioGroup value={configType} onValueChange={(value) => setConfigType(value as 'global' | 'custom')} className="flex gap-4">
                <Label htmlFor="global-radio" className="flex items-center gap-2 border p-4 rounded-md has-[:checked]:border-primary flex-1">
                    <RadioGroupItem value="global" id="global-radio" />
                    Use a Global Configuration
                </Label>
                <Label htmlFor="custom-radio" className="flex items-center gap-2 border p-4 rounded-md has-[:checked]:border-primary flex-1">
                    <RadioGroupItem value="custom" id="custom-radio" />
                    Use Custom Configuration
                </Label>
            </RadioGroup>

            {configType === 'global' && (
                <div className="space-y-2 animate-in fade-in-50">
                    <Label>Select Global Email Account</Label>
                    <Select value={selectedGlobalId} onValueChange={setSelectedGlobalId}>
                        <SelectTrigger><SelectValue placeholder="Select a global account..." /></SelectTrigger>
                        <SelectContent>
                            {globalSettings.map(gs => (
                                <SelectItem key={gs.id} value={gs.id.toString()}>{gs.name} ({gs.smtpUser})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">These accounts are managed by the Super Admin.</p>
                </div>
            )}
            
            {configType === 'custom' && (
                <div className="border p-4 rounded-md animate-in fade-in-50">
                    <Tabs defaultValue="smtp" className="pt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="smtp">Sending (SMTP)</TabsTrigger>
                            <TabsTrigger value="imap">Receiving (IMAP)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="smtp" className="space-y-4 pt-4">
                            <div><Label>Host</Label><Input placeholder="smtp.example.com" value={customSettings.smtpHost} onChange={e => handleFieldChange('smtpHost', e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Port</Label><Input type="number" placeholder="587" value={customSettings.smtpPort} onChange={e => handleFieldChange('smtpPort', parseInt(e.target.value, 10))} /></div>
                                <div><Label>Encryption</Label>
                                    <Select value={customSettings.smtpEncryption} onValueChange={(v) => handleFieldChange('smtpEncryption', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="tls">TLS</SelectItem><SelectItem value="ssl">SSL</SelectItem><SelectItem value="none">None</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div><Label>Username</Label><Input placeholder="you@example.com" value={customSettings.smtpUser} onChange={e => handleFieldChange('smtpUser', e.target.value)} /></div>
                            <div><Label>Password</Label>
                                <div className="relative">
                                    <Input type={showSmtpPass ? 'text' : 'password'} value={customSettings.smtpPass} onChange={e => handleFieldChange('smtpPass', e.target.value)} />
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowSmtpPass(!showSmtpPass)}>{showSmtpPass ? <EyeOff /> : <Eye />}</Button>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="imap" className="space-y-4 pt-4">
                            <div><Label>Host</Label><Input placeholder="imap.example.com" value={customSettings.imapHost} onChange={e => handleFieldChange('imapHost', e.target.value)} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Port</Label><Input type="number" placeholder="993" value={customSettings.imapPort} onChange={e => handleFieldChange('imapPort', parseInt(e.target.value, 10))} /></div>
                                <div><Label>Encryption</Label>
                                    <Select value={customSettings.imapEncryption} onValueChange={(v) => handleFieldChange('imapEncryption', v)}><SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="ssl">SSL</SelectItem><SelectItem value="tls">TLS</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div><Label>Username</Label><Input placeholder="you@example.com" value={customSettings.imapUser} onChange={e => handleFieldChange('imapUser', e.target.value)} /></div>
                            <div><Label>Password</Label>
                                <div className="relative">
                                    <Input type={showImapPass ? 'text' : 'password'} value={customSettings.imapPass} onChange={e => handleFieldChange('imapPass', e.target.value)} />
                                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowImapPass(!showImapPass)}>{showImapPass ? <EyeOff /> : <Eye />}</Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
            
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
        </CardContent>
        <CardFooter className="justify-between">
            <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
              {isTesting && <Loader2 className="mr-2 animate-spin" />} Test Connection
            </Button>
            <Button onClick={handleSave} disabled={isSaving} variant="accent">
              {isSaving && <Loader2 className="mr-2 animate-spin" />} Save Configuration
            </Button>
        </CardFooter>
    </Card>
  );
}
