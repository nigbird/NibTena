
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, DatabaseZap } from 'lucide-react';

export default function HospitalAdminSettingsPage() {
  const [retentionPeriod, setRetentionPeriod] = useState('180');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    // Mock API call to save settings
    console.log('Saving data retention period:', retentionPeriod);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Settings Updated',
        description: 'Data retention settings updated successfully.',
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Settings</h1>
        <p className="text-lg text-muted-foreground">Manage hospital-wide settings and configurations.</p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseZap className="h-5 w-5" />
              Data Management
            </CardTitle>
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
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" variant="accent" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
