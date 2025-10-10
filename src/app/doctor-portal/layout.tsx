import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';
import { DoctorPortalProvider } from '@/components/doctor-portal/doctor-portal-context';
import { prisma } from '@/lib/prisma';
import type { Hospital } from '@/lib/definitions';

// In a real app, this would come from an authentication session
const LOGGED_IN_DOCTOR_ID = 1;

async function getDoctorData() {
    const doctor = await prisma.doctor.findUnique({
        where: { id: LOGGED_IN_DOCTOR_ID },
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
    
    // Create a serializable doctor object
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
  const { doctor, doctorHospitals } = await getDoctorData();

  return (
    <DoctorPortalProvider doctor={doctor} doctorHospitals={doctorHospitals}>
      <div className="flex min-h-screen w-full">
        <DoctorPortalSidebar />
        <div className="flex flex-col flex-1 md:ml-[220px] lg:ml-[280px]">
          <DoctorPortalHeader />
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            {children}
          </main>
        </div>
      </div>
    </DoctorPortalProvider>
  );
}
