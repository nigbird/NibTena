
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

type HeaderProps = {
    title: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 p-4 flex items-center gap-2">
      <Button variant="ghost" size="icon" className="-ml-2" onClick={() => router.back()}>
        <ArrowLeft className="h-5 w-5 text-secondary hover:text-primary" />
        <span className="sr-only">Back</span>
      </Button>
      <h1 className="font-headline text-xl font-bold text-foreground">{title}</h1>
    </header>
  );
}
