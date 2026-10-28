
'use client';

import { useContext } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, LogOut, UserPen, CalendarCheck, ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PatientContext } from '@/context/PatientContext';
import PatientAuth from '../appointments/PatientAuth';
import { IconBadge, PageShell, PortalCard } from '@/components/patient-portal/ui';

function MenuRow({ href, icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60">
      <IconBadge icon={icon} size="sm" />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { patient, setPatient } = useContext(PatientContext);

  const handleLogout = () => {
    // Clear the patient from context to log them out
    setPatient(null);
    router.push('/user');
  };

  if (!patient) {
    return <PatientAuth />;
  }

  return (
    <PageShell size="narrow" className="py-8">
      <PortalCard className="relative overflow-hidden p-6 text-center">
        <div aria-hidden className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/40 to-transparent" />
        <Avatar className="relative mx-auto h-20 w-20 shadow-md ring-4 ring-card">
          {/* The user model doesn't have an avatar, so we use a fallback */}
          <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
            {patient.name ? patient.name.charAt(0) : <User />}
          </AvatarFallback>
        </Avatar>
        <h1 className="mt-3 font-headline text-xl font-bold tracking-tight">{patient.name}</h1>
        <p className="text-sm text-muted-foreground">{patient.phone}</p>
      </PortalCard>

      <PortalCard className="divide-y overflow-hidden">
        <MenuRow href="/user/profile/setup" icon={UserPen} label="Edit profile" />
        <MenuRow href="/user/appointments" icon={CalendarCheck} label="My bookings" />
      </PortalCard>

      <PortalCard className="overflow-hidden">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-destructive transition-colors hover:bg-destructive/5"
        >
          <IconBadge icon={LogOut} size="sm" tone="danger" />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </PortalCard>
    </PageShell>
  );
}
