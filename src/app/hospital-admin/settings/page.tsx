
'use client';

import { useState }from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, DatabaseZap, BriefcaseMedical, Building, Bell, Mail, MessageSquare, Trash2, Edit } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HospitalAdminSettingsPage() {
  const [retentionPeriod, setRetentionPeriod] = useState('180');
  const [isLoading, setIsLoading] = useState(false);
  const [specialties, setSpecialties] = useState([
    'Cardiology', 'Dermatology', 'Neurology', 'Pediatrics', 'Orthopedics'
  ]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const { toast } = useToast();

  const handleDataSave = (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    // Mock API call to save settings
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Settings Updated',
        description: 'Data retention settings updated successfully.',
      });
    }, 1000);
  };
  
   const handleGeneralSave = (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'General Settings Saved',
        description: 'Hospital information has been updated.',
      });
    }, 1000);
  };
  
  const handleAddSpecialty = () => {
    if (newSpecialty && !specialties.includes(newSpecialty)) {
      setSpecialties([...specialties, newSpecialty]);
      setNewSpecialty('');
       toast({
        title: 'Specialty Added',
        description: `"${newSpecialty}" has been added to the list.`,
      });
    } else if (specialties.includes(newSpecialty)) {
       toast({
        variant: 'destructive',
        title: 'Duplicate Specialty',
        description: `"${newSpecialty}" already exists.`,
      });
    }
  };
  
  const handleRemoveSpecialty = (specialtyToRemove: string) => {
    setSpecialties(specialties.filter(s => s !== specialtyToRemove));
    toast({
      variant: 'destructive',
      title: 'Specialty Removed',
      description: `"${specialtyToRemove}" has been removed.`,
    });
  }

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
        
        {/* General Settings Tab */}
        <TabsContent value="general">
           <form onSubmit={handleGeneralSave}>
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Update your hospital's public information and notification preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="hospital-name">Hospital Name</Label>
                        <Input id="hospital-name" defaultValue="Tikur Anbessa Specialized Hospital" />
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
                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="hospital-contact">Contact Info</Label>
                        <Input id="hospital-contact" type="tel" placeholder="Enter phone number" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone">Time Zone</Label>
                        <Select>
                            <SelectTrigger id="timezone">
                                <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="eat">East Africa Time (GMT+3)</SelectItem>
                                <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
                                <SelectItem value="pst">Pacific Standard Time (GMT-8)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                <div>
                  <h3 className="text-base font-medium mb-4">Notification Settings</h3>
                  <div className="space-y-4 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                          <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                              <span>Email Alerts</span>
                              <span className="font-normal leading-snug text-muted-foreground">
                                  Receive email notifications for new appointments and cancellations.
                              </span>
                          </Label>
                          <Switch id="email-notifications" defaultChecked />
                      </div>
                       <div className="flex items-center justify-between">
                           <Label htmlFor="sms-notifications" className="flex flex-col space-y-1">
                               <span>SMS Alerts</span>
                               <span className="font-normal leading-snug text-muted-foreground">
                                   Receive SMS notifications for critical updates.
                               </span>
                           </Label>
                          <Switch id="sms-notifications" />
                      </div>
                  </div>
                </div>

              </CardContent>
              <CardFooter>
                 <Button type="submit" variant="accent" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save General Settings'}
                 </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* Specialties Management Tab */}
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
                <Button onClick={handleAddSpecialty}>Add</Button>
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                <h3 className="font-medium">Existing Specialties</h3>
                {specialties.map(specialty => (
                  <div key={specialty} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                        <Switch id={`specialty-${specialty}`} defaultChecked />
                        <Label htmlFor={`specialty-${specialty}`} className="font-normal">{specialty}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveSpecialty(specialty)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
        
        {/* Data Management Tab */}
        <TabsContent value="data">
          <form onSubmit={handleDataSave}>
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
                  <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
                    <SelectTrigger id="data-retention">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="indefinite">Keep indefinitely</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground pt-1">
                    Old records beyond the retention period will be automatically removed to optimize performance and comply with privacy standards.
                  </p>
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

    