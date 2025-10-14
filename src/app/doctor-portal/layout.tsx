
import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';
import { DoctorPortalProvider } from '@/components/doctor-portal/doctor-portal-context';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

async function getDoctorData(doctorId: number) {
    const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
            hospitals: {
                include: {
                    hospital: true
                }
            }
        }
    });

    if (!doctor) {
        return { doctor: null, doctorHospitals: [] };
    }

    const doctorHospitals = doctor.hospitals.map(h => h.hospital);
    
    const serializableDoctor = {
        ...doctor,
        hospitalIds: doctor.hospitals.map(h => h.hospitalId),
    };

    return { doctor: serializableDoctor, doctorHospitals };
}


export default async function DoctorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const { doctor, doctorHospitals } = session.userId ? await getDoctorData(session.userId) : { doctor: null, doctorHospitals: [] };

  return (
    <DoctorPortalProvider doctor={doctor} doctorHospitals={doctorHospitals}>
      <div className="flex min-h-screen w-full">
        <DoctorPortalSidebar />
        <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
          <DoctorPortalHeader user={session} />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            {children}
          </main>
        </div>
      </div>
    </DoctorPortalProvider>
  );
}
