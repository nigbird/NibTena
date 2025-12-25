
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Hospital,
  LayoutGrid,
  // Settings,
  CircleUser,
  Mail,
  LineChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from './icons';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from 'next-auth/react';
import { revokeThenSignOut } from '@/lib/auth-client';

const navLinks = [
  { href: '/super-admin', label: 'Dashboard', icon: LayoutGrid },
  { href: '/super-admin/hospitals', label: 'Hospitals', icon: Hospital },
  { href: '/super-admin/hospital-approvals', label: 'Approvals', icon: Bell },
  { href: '/super-admin/create-super-admin', label: 'Super Admins', icon: CircleUser },
  { href: '/super-admin/email', label: 'Email', icon: Mail },
  { href: '/super-admin/reports', label: 'Reports', icon: LineChart },
  // { href: '/super-admin/settings', label: 'Settings', icon: Settings },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden md:flex flex-col w-[220px] lg:w-[280px] bg-background border-r fixed top-0 left-0 h-full">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 lg:p-4">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-secondary hover:bg-muted/50',
              (pathname === href || (href !== '/super-admin' && pathname.startsWith(href))) && 'bg-primary text-secondary font-bold'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t p-4">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="w-full justify-start gap-2 h-auto p-2">
                    <Avatar className="h-10 w-10 border">
                        <AvatarFallback>SA</AvatarFallback>
                    </Avatar>
                    <div className="text-left overflow-hidden">
                        <p className="font-semibold text-sm leading-tight truncate">{session?.user?.name || 'Super Admin'}</p>
                        <p className="text-xs text-muted-foreground truncate">NibAppointment Platform</p>
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <CircleUser className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                </DropdownMenuItem>
                 {/* <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => revokeThenSignOut({ callbackUrl: '/super-admin/login' })}>
                  Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
