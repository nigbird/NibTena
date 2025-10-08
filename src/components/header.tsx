
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Logo } from './icons';

type HeaderProps = {
    title: string;
    backHref?: string;
}

export default function Header({ title, backHref }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 p-4 flex items-center gap-4">
      {backHref && (
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-5 w-5 text-secondary" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
      )}
      <h1 className="font-headline text-xl font-bold text-foreground">{title}</h1>
    </header>
  );
}
