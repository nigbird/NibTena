
'use server';

import { prisma } from '@/lib/prisma';
import type { Appointment, Doctor } from '@/lib/definitions';
import { auth } from '@/../../auth';
import { requireHospitalPermission } from '@/lib/permissions';

export async function getReportData(hospitalId: number) {
  const session = await auth();
  if (!session?.user) return { appointments: [], doctors: [], stats: { totalAppointments: 0, cancelledAppointments: 0, rescheduledAppointments: 0, totalRevenue: 0 }, doctorRevenueBreakdown: [] };

  const allowed = await requireHospitalPermission('Reports:View', hospitalId);
  if (!allowed) return { appointments: [], doctors: [], stats: { totalAppointments: 0, cancelledAppointments: 0, rescheduledAppointments: 0, totalRevenue: 0 }, doctorRevenueBreakdown: [] };

  const [appointments, doctors] = await Promise.all([
    prisma.appointment.findMany({
      where: { hospitalId },
    }),
    prisma.doctor.findMany({
      where: {
        hospitals: {
          some: { hospitalId }
        }
      }
    })
  ]);

  const totalAppointments = appointments.length;
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
  const rescheduledAppointments = appointments.filter(a => a.status === 'rescheduled').length;

  // Corrected logic: Revenue is counted for any appointment that is not pending payment.
  const totalRevenue = appointments
    .filter(a => a.status !== 'pending-payment')
    .reduce((sum, a) => {
        const doctor = doctors.find(d => d.id === a.doctorId);
        return sum + (doctor?.consultationFee || 0);
    }, 0);

  const doctorRevenueBreakdown = doctors.map(doctor => {
    // Corrected logic: Revenue is counted for any appointment that is not pending payment.
    const revenueAppointments = appointments.filter(a => a.doctorId === doctor.id && a.status !== 'pending-payment');
    const revenue = revenueAppointments.reduce((sum, a) => sum + (doctor?.consultationFee || 0), 0);
    return {
      name: doctor.name.replace('Dr. ', ''),
      appointments: revenueAppointments.length,
      revenue: revenue
    };
  }).filter(d => d.appointments > 0);

  return {
    appointments,
    doctors,
    stats: {
        totalAppointments,
        cancelledAppointments,
        rescheduledAppointments,
        totalRevenue,
    },
    doctorRevenueBreakdown
  };
}
