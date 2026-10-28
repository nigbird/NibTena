
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Hospital as HospitalIcon, MapPin } from 'lucide-react';
import type { Doctor } from '@/lib/definitions';
import { getHospitalData } from './actions';
import HospitalDoctorsList from '@/components/patient-portal/hospital-doctors-list';
import HospitalMapDisplay from '@/components/patient-portal/hospital-map-display';
import { PageShell, isExternalImage } from '@/components/patient-portal/ui';

export default async function HospitalDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hospitalId = Number(id);
  if (!Number.isInteger(hospitalId)) notFound();
  const { hospital, doctors, specialties } = await getHospitalData(hospitalId);

  if (!hospital) {
    notFound();
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-56 w-full overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-[hsl(var(--primary-foreground))] via-[hsl(28_38%_28%)] to-secondary sm:h-72">
        {hospital.imageUrl ? (
          <Image
            src={hospital.imageUrl}
            alt={hospital.name}
            fill
            unoptimized={isExternalImage(hospital.imageUrl)}
            className="object-cover"
          />
        ) : (
          <HospitalIcon aria-hidden className="absolute right-6 top-6 h-28 w-28 text-white/[0.08]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-6 text-white">
          <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">{hospital.name}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
            <MapPin className="h-4 w-4" /> {hospital.city}
          </p>
        </div>
      </div>

      <PageShell>
        <HospitalMapDisplay
          latitude={(hospital as any).latitude}
          longitude={(hospital as any).longitude}
          mapDisplayAddress={(hospital as any).mapDisplayAddress}
          city={hospital.city}
          address={(hospital as any).address}
          contactEmail={hospital.contactEmail}
          contactPhone={hospital.contactPhone}
        />

        <HospitalDoctorsList
          hospitalId={hospitalId}
          doctors={doctors as Doctor[]}
          specialties={specialties}
        />
      </PageShell>
    </div>
  );
}
