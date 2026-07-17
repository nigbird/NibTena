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
    name: 'Custom Email',
    smtpHost: '', smtpPort: 587, smtpUser: '', smtpPass: '', smtpEncryption: 'tls',
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
  
  const [showPass, setShowPass] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ smtp: { success: boolean, error: string }, imap: { success: boolean, error: string } } | null>(null);

  useEffect(() => {
    setConfigType(hospital.useGlobalEmailId ? 'global' : 'custom');
    setSelectedGlobalId(hospital.useGlobalEmailId?.toString());
    const settings = initialCustomSettings ? { ...initialCustomSettings, name: initialCustomSettings.name || 'Custom Gmail' } : emptySettings;
    setCustomSettings(settings);
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
        settingsToTest = { ...customSettings };
    }

    if (!settingsToTest) {
        toast({ variant: "destructive", title: "Error", description: "No settings to test." });
        setIsTesting(false);
        return;
    }
    
    const data = await testEmailConnection(settingsToTest as EmailSettingsType);
    setTestResult(data);

    if (data.smtp.success) {
      toast({ title: "Connection Successful!", description: `SMTP connection verified using ${(settingsToTest as any).name}.` });
    } else {
      toast({ variant: "destructive", title: "Connection Failed", description: `SMTP: ${data.smtp.error}`, duration: 9000 });
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
            <CardDescription>Choose a global email account or set up your own custom SMTP account for sending notifications.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <RadioGroup value={configType} onValueChange={(value) => setConfigType(value as 'global' | 'custom')} className="flex gap-4">
                <Label htmlFor="global-radio" className="flex items-center gap-2 border p-4 rounded-md has-[:checked]:border-primary flex-1 cursor-pointer">
                    <RadioGroupItem value="global" id="global-radio" />
                    Use a Global Configuration
                </Label>
                <Label htmlFor="custom-radio" className="flex items-center gap-2 border p-4 rounded-md has-[:checked]:border-primary flex-1 cursor-pointer">
                    <RadioGroupItem value="custom" id="custom-radio" />
                    Use Custom Email Account
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
                <div className="border p-4 rounded-md animate-in fade-in-50 space-y-4">
                    <h3 className="font-medium">Custom SMTP Configuration</h3>
                    <div>
                        <Label htmlFor="configName">Configuration Name</Label>
                        <Input id="configName" placeholder="e.g., Hospital Notifications" value={customSettings.name} onChange={e => handleFieldChange('name', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input id="smtpHost" placeholder="e.g., mail.nibbank.com.et or smtp.gmail.com" value={customSettings.smtpHost} onChange={e => handleFieldChange('smtpHost', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label htmlFor="smtpPort">Port</Label>
                            <Input id="smtpPort" type="number" placeholder="587" value={customSettings.smtpPort} onChange={e => handleFieldChange('smtpPort', Number(e.target.value))} />
                        </div>
                        <div>
                            <Label htmlFor="smtpEncryption">Encryption</Label>
                            <select id="smtpEncryption" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={customSettings.smtpEncryption} onChange={e => handleFieldChange('smtpEncryption', e.target.value)}>
                                <option value="tls">TLS (STARTTLS)</option>
                                <option value="ssl">SSL</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="smtpUser">Email Address</Label>
                        <Input id="smtpUser" placeholder="no-reply@yourhospital.com" value={customSettings.smtpUser} onChange={e => handleFieldChange('smtpUser', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="smtpPass">
                            Password{initialCustomSettings && <span className="text-muted-foreground text-xs ml-1">(leave blank to keep existing)</span>}
                        </Label>
                        <div className="relative">
                            <Input id="smtpPass" type={showPass ? 'text' : 'password'} value={customSettings.smtpPass} onChange={e => handleFieldChange('smtpPass', e.target.value)} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff /> : <Eye />}</Button>
                        </div>
                    </div>
                </div>
            )}
            
             {testResult && (
                <div className={`flex items-center gap-2 rounded-md border p-3 mt-2 ${testResult.smtp.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                    {testResult.smtp.success ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                    <div>
                        <p className="font-semibold">SMTP Connection Test</p>
                        <p className="text-xs">{testResult.smtp.success ? 'Connection successful' : `Failed: ${testResult.smtp.error}`}</p>
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
