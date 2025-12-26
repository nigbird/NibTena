
"use client";

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { PatientContext } from '@/context/PatientContext';

type HeaderProps = {
    title: string;
}

export default function Header({ title }: HeaderProps) {
  const router = useRouter();
  const { superAppToken } = useContext(PatientContext);
  const isMiniApp = !!superAppToken;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 flex items-center h-16">
      {!isMiniApp && (
        <Button variant="ghost" size="icon" className="ml-4" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5 text-secondary hover:text-primary" />
          <span className="sr-only">Back</span>
        </Button>
      )}
      <div className="flex-1 px-4">
        <h1 className="font-headline text-xl font-bold text-foreground">{title}</h1>
      </div>
    </header>
  );
}
