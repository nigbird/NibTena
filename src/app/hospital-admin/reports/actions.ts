'use server';

import { prisma } from '@/lib/prisma';
import type { Appointment, Doctor } from '@/lib/definitions';

export async function getReportData(hospitalId: number) {
  const appointments = await prisma.appointment.findMany({
    where: { hospitalId },
    include: {
      doctor: true,
    },
  });

  const doctors = await prisma.doctor.findMany({
      where: {
          hospitals: {
              some: { hospitalId }
          }
      }
  });

  const totalRevenue = appointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + (a.doctor?.consultationFee || 0), 0);
    
  const upcomingAppointments = appointments.filter(a => a.status === 'confirmed' || a.status === 'rescheduled').length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;

  const doctorRevenueBreakdown = doctors.map(doctor => {
    const doctorAppointments = appointments.filter(a => a.doctorId === doctor.id && a.status === 'completed');
    const revenue = doctorAppointments.reduce((sum, a) => sum + (a.doctor?.consultationFee || 0), 0);
    return {
      name: doctor.name.replace('Dr. ', ''),
      appointments: doctorAppointments.length,
      revenue: revenue
    };
  }).filter(d => d.appointments > 0);


  return {
    appointments,
    doctors,
    stats: {
        totalRevenue,
        upcomingAppointments,
        completedAppointments,
        cancelledAppointments,
    },
    doctorRevenueBreakdown
  };
}

export async function getAppointmentsByHospitalId(hospitalId: number) {
    return await prisma.appointment.findMany({
        where: { hospitalId },
        include: {
            patient: true,
        }
    });
}

export async function getDoctorsByHospitalId(hospitalId: number) {
    return await prisma.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } },
    });
}
