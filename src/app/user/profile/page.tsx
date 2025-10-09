
'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card'
  import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
  import { User } from 'lucide-react'
  import { Button } from '@/components/ui/button'
  import Link from 'next/link';
  
  // Mock user data, in a real app this would come from your auth provider
  const user = {
    name: 'Hana Worku',
    email: 'hana.w@example.com',
    avatarUrl: 'https://picsum.photos/seed/user1/200/200'
  }
  
  export default function ProfilePage() {
    return (
      <>
        <div className="p-4">
          <Card>
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
              <CardTitle className="font-headline text-2xl">{user.name}</CardTitle>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="mt-4 flex flex-col gap-2">
                <Button variant="outline" asChild>
                  <Link href="/user/profile/setup">Edit Profile</Link>
                </Button>
                <Button variant="outline">Change Password</Button>
                <Button variant="destructive">Logout</Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }
