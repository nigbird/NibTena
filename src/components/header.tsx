import Link from 'next/link';
import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from './icons';

const navLinks = [
  { href: '/hospitals', label: 'Hospitals' },
  { href: '/search', label: 'Doctors' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Desktop Nav */}
        <div className="hidden md:flex w-full items-center">
            <div className="mr-auto">
              <Link href="/" className="flex items-center gap-2">
                <Logo />
              </Link>
            </div>
            <nav className="flex items-center gap-6 text-sm">
                {navLinks.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className="font-medium text-foreground/60 transition-colors hover:text-foreground/80"
                >
                    {link.label}
                </Link>
                ))}
            </nav>
            <div className="ml-auto" />
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex w-full items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="px-2 pt-12">
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-lg font-medium text-foreground/70 transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
