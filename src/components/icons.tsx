import { Stethoscope } from 'lucide-react';

export function Logo() {
  return (
    <div
      className="flex items-center gap-2"
      aria-label="MediVerse homepage"
    >
      <div className="rounded-lg bg-accent/20 p-2">
        <Stethoscope className="h-6 w-6 text-accent-foreground" />
      </div>
      <span className="font-headline text-xl font-bold text-foreground">
        MediVerse
      </span>
    </div>
  );
}
