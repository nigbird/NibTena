
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { User, Loader2 } from 'lucide-react';

// Mock user data for pre-filling
const mockUser = {
  name: 'Hana Worku',
  phone: '+251 912 345 678', // Example phone
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    // Mock saving data
    setTimeout(() => {
      // In a real app, you would save the form data here.
      localStorage.setItem('profileComplete', 'true');
      setIsLoading(false);
      toast({
        title: '✅ Profile Saved!',
        description: 'Your information has been updated successfully.',
      });
      router.push('/user/appointments');
    }, 1000);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
            <div className="inline-block mx-auto rounded-full bg-primary p-3 ring-4 ring-background">
                <User className="h-6 w-6 text-primary-foreground" />
            </div>
          <CardTitle className="font-headline text-2xl pt-2">Complete Your Profile</CardTitle>
          <CardDescription>
            Let’s make your next booking faster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" defaultValue={mockUser.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" name="phone" value={mockUser.phone} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" name="age" type="number" placeholder="Enter your age" required />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <RadioGroup name="gender" defaultValue="female" className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </div>
            <Button type="submit" className="w-full" variant="accent" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
