
'use client';

import Link from 'next/link';
import {
  CircleUser,
  LayoutGrid,
  Hospital,
  Settings,
  Menu,
  Mail,
  Bell,
  LineChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Logo } from './icons';
import { signOut, useSession } from 'next-auth/react';

export default function SuperAdminHeader() {
    const { data: session } = useSession();
    const saRole = (session?.user as any)?.superAdminRole as 'maker' | 'checker' | 'both' | undefined;
    const visible = {
      dashboard: true,
      hospitals: true,
      approvals: saRole === 'checker' || saRole === 'both',
      superAdmins: saRole === 'both',
      email: saRole === 'both',
      reports: saRole === 'both',
      settings: false,
    };
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <Logo />
                </Link>
              </div>
                <nav className="grid gap-2 text-lg font-medium p-2">
                    {visible.dashboard && <Link
                        href="/super-admin"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <LayoutGrid className="h-5 w-5" />
                        Dashboard
                    </Link>}
                    {visible.hospitals && <Link
                        href="/super-admin/hospitals"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <Hospital className="h-5 w-5" />
                        Hospitals
                    </Link>}
                    {visible.approvals && <Link
                        href="/super-admin/hospital-approvals"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <Bell className="h-5 w-5" />
                        Approvals
                    </Link>}
                    {visible.superAdmins && <Link
                        href="/super-admin/create-super-admin"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <CircleUser className="h-5 w-5" />
                        Super Admins
                    </Link>}
                    {visible.email && <Link
                        href="/super-admin/email"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <Mail className="h-5 w-5" />
                        Email
                    </Link>}
                    {visible.reports && <Link
                        href="/super-admin/reports"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <LineChart className="h-5 w-5" />
                        Reports
                    </Link>}
                    {visible.settings && <Link
                        href="/super-admin/settings"
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                        >
                        <Settings className="h-5 w-5" />
                        Settings
                    </Link>}
                </nav>
            </SheetContent>
          </Sheet>

          <div className="w-full flex-1" />
          {saRole && (
            <span className={
              (saRole === 'maker' && 'bg-amber-100 text-amber-800 border border-amber-300') ||
              (saRole === 'checker' && 'bg-sky-100 text-sky-800 border border-sky-300') ||
              'bg-emerald-100 text-emerald-800 border border-emerald-300'
            } style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6 }}>
              {saRole === 'both' ? 'Super Admin (Maker+Checker)' : saRole.charAt(0).toUpperCase() + saRole.slice(1)}
            </span>
          )}
        </header>
    )
}
