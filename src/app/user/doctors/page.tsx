
import { prisma } from '@/lib/prisma';
import { Stethoscope } from 'lucide-react';
import DoctorSearch from './DoctorSearch';
import { DoctorRow, EmptyState, PageShell } from '@/components/patient-portal/ui';

async function getDoctorsWithHospitals() {
  const doctors = await prisma.doctor.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      name: true,
      specialty: true,
      imageUrl: true,
      hospitals: {
        where: { hospital: { status: 'active' } },
        select: {
          hospital: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        take: 1,
      },
    }
  });
  return doctors;
}

async function getSpecialties() {
    const distinctSpecialties = await prisma.doctor.findMany({
        where: {
            status: 'active',
        },
        select: {
            specialty: true,
        },
        distinct: ['specialty'],
    });
    return distinctSpecialties
        .map(d => d.specialty)
        .filter((s): s is string => !!s && s.trim().length > 0)
        .sort();
}


export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<{
    specialty?: string;
    q?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const specialtyQuery = resolvedSearchParams?.specialty;
  const nameQuery = resolvedSearchParams?.q;

  const [allDoctors, specialties] = await Promise.all([
    getDoctorsWithHospitals(),
    getSpecialties()
  ]);

  let filteredDoctors = allDoctors;

  if (specialtyQuery && specialtyQuery !== 'all') {
    filteredDoctors = filteredDoctors.filter((doc) => doc.specialty === specialtyQuery);
  }

  if (nameQuery) {
     filteredDoctors = filteredDoctors.filter((doc) =>
        doc.name.toLowerCase().includes(nameQuery.toLowerCase()) ||
        doc.hospitals.some(h => h.hospital.name.toLowerCase().includes(nameQuery.toLowerCase()))
     );
  }


  return (
    <PageShell>
      <DoctorSearch
          specialties={specialties}
          initialSpecialty={specialtyQuery}
          initialQuery={nameQuery}
      />

      {filteredDoctors.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            {filteredDoctors.length} {filteredDoctors.length === 1 ? 'doctor' : 'doctors'}
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredDoctors.map((doctor) => (
              <DoctorRow
                key={doctor.id}
                doctor={doctor}
                href={`/user/doctors/${doctor.id}`}
                hospitalName={doctor.hospitals[0]?.hospital.name}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Stethoscope}
          title="No doctors found"
          description="Try adjusting your search or specialty filter."
        />
      )}
    </PageShell>
  );
}
