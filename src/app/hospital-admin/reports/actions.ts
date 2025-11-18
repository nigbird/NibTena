'use server';

import { prisma } from '@/lib/prisma';
import type { Appointment, Doctor } from '@/lib/definitions';

export async function getReportData(hospitalId: number) {
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

  const totalRevenue = appointments
    .filter(a => a.status === 'confirmed')
    .reduce((sum, a) => {
        const doctor = doctors.find(d => d.id === a.doctorId);
        return sum + (doctor?.consultationFee || 0);
    }, 0);

  const doctorRevenueBreakdown = doctors.map(doctor => {
    const confirmedAppointments = appointments.filter(a => a.doctorId === doctor.id && a.status === 'confirmed');
    const revenue = confirmedAppointments.reduce((sum, a) => sum + (doctor?.consultationFee || 0), 0);
    return {
      name: doctor.name.replace('Dr. ', ''),
      appointments: confirmedAppointments.length,
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
