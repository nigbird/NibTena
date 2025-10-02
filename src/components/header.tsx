import Link from 'next/link';
import { Logo } from './icons';

type HeaderProps = {
    title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 p-4 flex items-center gap-4">
        <Link href="/">
            <Logo />
        </Link>
      <h1 className="font-headline text-xl font-bold text-foreground">{title}</h1>
    </header>
  );
}
