import { auth } from '../../../auth';
import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';
import { DoctorPortalProvider } from '@/components/doctor-portal/doctor-portal-context';
import { prisma } from '@/lib/prisma';
import type { Doctor, Hospital } from '@/lib/definitions';

async function getDoctorData(userId: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: parseInt(userId, 10) },
    include: {
      hospitals: {
        include: { hospital: true },
      },
    },
  });

  if (!doctor) {
    return { doctor: null, doctorHospitals: [] };
  }

  const doctorHospitals = doctor.hospitals.map((h) => h.hospital);
  return { doctor, doctorHospitals };
}

export default async function DoctorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // ✅ NextAuth's `authorized` callback already protects this route.
  // So we only fetch doctor data if user exists and is a doctor.
  const userId = session?.user?.role === 'doctor' ? session.user.id : null;

  let doctor = null;
  let doctorHospitals: Hospital[] = [];

  if (userId) {
    const result = await getDoctorData(userId);
    doctor = result.doctor;
    doctorHospitals = result.doctorHospitals;
  }

  return (
    <DoctorPortalProvider
      doctor={doctor as Doctor}
      doctorHospitals={doctorHospitals as Hospital[]}
    >
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
