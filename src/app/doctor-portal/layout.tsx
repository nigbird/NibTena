
import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import DoctorPortalSidebar from '@/components/doctor-portal-sidebar';
import DoctorPortalHeader from '@/components/doctor-portal-header';
import { DoctorPortalProvider } from '@/components/doctor-portal/doctor-portal-context';
import type { Doctor, Hospital } from '@/lib/definitions';
import { prisma } from '@/lib/prisma';
import { usePathname } from 'next/navigation';

async function getDoctorData(userId: string): Promise<{ doctor: Doctor | null; doctorHospitals: Hospital[] }> {
  if (!userId) return { doctor: null, doctorHospitals: [] };

  const doctorId = parseInt(userId, 10);
  if (isNaN(doctorId)) return { doctor: null, doctorHospitals: [] };

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: {
      hospitals: {
        include: {
          hospital: true,
        },
      },
    },
  });

  if (!doctor) {
    return { doctor: null, doctorHospitals: [] };
  }

  const doctorHospitals = doctor.hospitals.map(h => h.hospital);

  return { doctor: doctor as Doctor, doctorHospitals: doctorHospitals as Hospital[] };
}


export default async function DoctorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // This is a server component, so we can't use usePathname here.
  // The check for login will be handled by middleware and the client wrapper if needed.
  if (!session?.user || session.user.role !== 'doctor') {
      redirect('/doctor-portal/login');
  }

  const { doctor, doctorHospitals } = await getDoctorData(session.user.id);
  
  if (!doctor) {
      // This could happen if the user exists in auth but not in the doctor table.
      // Redirecting to login might be the safest option.
      redirect('/doctor-portal/login');
  }

  return (
    <DoctorPortalProvider
      doctor={doctor}
      doctorHospitals={doctorHospitals}
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
