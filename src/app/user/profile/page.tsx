
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '@/components/ui/card'
  import Header from '@/components/header'
  import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
  import { User } from 'lucide-react'
  import { Button } from '@/components/ui/button'
  
  // Mock user data, in a real app this would come from your auth provider
  const user = {
    name: 'Alice Johnson',
    email: 'alice.j@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHx1c2VyJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzU5Mzk0MjEwfDA&ixlib=rb-4.1.0&q=80&w=1080'
  }
  
  export default function ProfilePage() {
    return (
      <>
        <Header title="My Profile" />
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
                <Button variant="outline">Edit Profile</Button>
                <Button variant="outline">Change Password</Button>
                <Button variant="destructive">Logout</Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }
