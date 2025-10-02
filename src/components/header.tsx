import Link from 'next/link';
import { Menu, Search, Home } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from './icons';

const navLinks = [
  { href: '/', label: 'Dashboard', icon: <Home /> },
  { href: '/hospitals', label: 'Hospitals', icon: <Search /> },
  { href: '/search', label: 'Search Doctors', icon: <Search /> },
  { href: '/doctor-dashboard', label: 'For Doctors' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-auto hidden md:flex">
          <Link href="/" className="mr-6 flex items-center gap-2">
            <Logo />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 font-medium text-foreground/60 transition-colors hover:text-foreground/80"
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="px-2">
              <Link href="/" className="my-6 block">
                <Logo />
              </Link>
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-foreground/70 transition-colors hover:text-foreground"
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="flex flex-1 items-center justify-end gap-2">
             <div className="md:hidden">
                 <Link href="/" className="ml-4">
                    <Logo />
                </Link>
             </div>
             <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                    <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild variant="accent" className="hidden sm:inline-flex">
                    <Link href="/signup">Sign Up</Link>
                </Button>
             </div>
        </div>
      </div>
    </header>
  );
}
