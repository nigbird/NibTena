
import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
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
    return { doctor, doctorHospitals };
}


export default async function DoctorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // If there's no session and the user isn't already on the login page, redirect them.
  if (!session?.user || session.user.role !== 'doctor') {
    return redirect('/doctor-portal/login');
  }

  const { doctor, doctorHospitals } = await getDoctorData(session.user.id);
  
  if (!doctor) {
     return redirect('/doctor-portal/login');
  }

  return (
    <DoctorPortalProvider doctor={doctor as Doctor} doctorHospitals={doctorHospitals as Hospital[]}>
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
