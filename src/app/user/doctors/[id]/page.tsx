
import { notFound } from 'next/navigation';
import { Wallet, Hospital as HospitalIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import DoctorBooking from './DoctorBooking';
import { prisma } from '@/lib/prisma';
import { DetailRow, PageShell, PortalCard, SectionTitle, SpecialtyPill } from '@/components/patient-portal/ui';


async function getDoctorData(doctorId: number) {
  // Only fields rendered here or by DoctorBooking; this data is serialized
  // into the RSC payload, so never add contact, bank or status fields.
  const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, status: 'active' },
      select: {
        id: true,
        name: true,
        specialty: true,
        imageUrl: true,
        bio: true,
        consultationFee: true,
        hospitals: {
          where: { hospital: { status: 'active' } },
          select: {
            hospital: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
  });

  if (!doctor) {
    return { doctor: null, doctorHospitals: [] };
  }

  const doctorHospitals = doctor.hospitals.map(h => h.hospital);

  return { doctor, doctorHospitals };
}


export default async function DoctorProfilePage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const doctorId = Number(id);
  if (!Number.isInteger(doctorId)) notFound();

  const { doctor, doctorHospitals } = await getDoctorData(doctorId);

  if (!doctor) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const hospitalIdParam = resolvedSearchParams?.hospitalId;
  const initialHospitalId = hospitalIdParam
    ? Number(hospitalIdParam)
    : (doctorHospitals[0]?.id || null);

  const selectedHospital = doctorHospitals.find(h => h.id === initialHospitalId) || doctorHospitals[0];

  return (
    <PageShell size="wide" className="max-w-5xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <PortalCard className="relative overflow-hidden p-6 text-center">
            <div aria-hidden className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-secondary/10 to-transparent" />
            <Avatar className="relative mx-auto mb-4 h-24 w-24 shadow-md ring-4 ring-card md:h-28 md:w-28">
              {doctor.imageUrl && (
                <AvatarImage src={doctor.imageUrl} alt={doctor.name} className="object-cover" />
              )}
              <AvatarFallback className="bg-secondary/10 text-3xl font-semibold text-secondary">
                {doctor.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <h1 className="font-headline text-xl font-bold tracking-tight md:text-2xl">
              {doctor.name}
            </h1>
            <SpecialtyPill className="mt-2 text-sm">{doctor.specialty}</SpecialtyPill>

            <div className="mt-6 space-y-3 border-t pt-5 text-left">
              {selectedHospital && (
                <DetailRow icon={HospitalIcon} label="Hospital">{selectedHospital.name}</DetailRow>
              )}
              <DetailRow icon={Wallet} label="Consultation fee">
                <span className="text-base font-bold">{doctor.consultationFee} ETB</span>
              </DetailRow>
            </div>
          </PortalCard>
          {doctor.bio && (
            <PortalCard className="p-6">
              <SectionTitle title="Professional Bio" />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{doctor.bio}</p>
            </PortalCard>
          )}
        </div>
        <div className="lg:col-span-2">
          <PortalCard className="p-5 sm:p-6">
            <SectionTitle title="Book an Appointment" subtitle="Choose a date and an available time" />
            <div className="mt-5">
              <DoctorBooking
                doctor={{ id: doctor.id }}
                doctorHospitals={doctorHospitals}
                searchParams={resolvedSearchParams}
              />
            </div>
          </PortalCard>
        </div>
      </div>
    </PageShell>
  );
}
