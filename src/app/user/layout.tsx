
'use client';

import Link from 'next/link';
import { Bell, User, Search } from 'lucide-react';
import BottomNavbar from '@/components/bottom-navbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

// Mock user data for display
const user = {
    name: 'Alice Johnson',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBwb3J0cmFpdHxlbnwwfHx8fDE3NTk0ODMzNTV8MA&ixlib=rb-4.1.0&q=80&w=1080'
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === '/user';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center">
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-xs text-muted-foreground">Hi, Welcome Back!</p>
                    <p className="font-semibold text-foreground">{user.name}</p>
                </div>
            </div>

            <div className="ml-auto">
                 <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                    <span className="sr-only">View notifications</span>
                </Button>
            </div>
        </div>
      </header>
      <main className="flex-1 pb-24">{children}</main>
      <BottomNavbar />
    </div>
  );
}
