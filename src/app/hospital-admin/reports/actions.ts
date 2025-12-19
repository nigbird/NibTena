
'use server';

import { prisma } from '@/lib/prisma';
import type { Appointment, Doctor, Patient } from '@/lib/definitions';
import { auth } from '@/../../auth';
import { requireHospitalPermission } from '@/lib/permissions';
import { startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export async function getReportData(
    hospitalId: number, 
    dateRange?: DateRange,
    doctorId?: number,
    patientName?: string
) {
  const session = await auth();
  if (!session?.user) return { appointments: [], doctors: [], stats: { totalAppointments: 0, cancelledAppointments: 0, rescheduledAppointments: 0, totalRevenue: 0 }, doctorRevenueBreakdown: [] };

  const allowed = await requireHospitalPermission('Reports:View', hospitalId);
  if (!allowed) return { appointments: [], doctors: [], stats: { totalAppointments: 0, cancelledAppointments: 0, rescheduledAppointments: 0, totalRevenue: 0 }, doctorRevenueBreakdown: [] };

  const createdAtDateFilter = dateRange?.from && dateRange.to ? {
    createdAt: {
      gte: startOfDay(dateRange.from),
      lte: endOfDay(dateRange.to),
    }
  } : {};

  const doctorFilter = doctorId ? { doctorId: doctorId } : {};
  const patientFilter = patientName ? { patient: { name: { contains: patientName, mode: 'insensitive' } } } : {};

  const appointments = await prisma.appointment.findMany({
    where: { 
      hospitalId,
      ...createdAtDateFilter,
      ...doctorFilter,
      ...patientFilter
    },
    include: {
      doctor: true,
      patient: true,
    }
  });
  
  const doctors = await prisma.doctor.findMany({
    where: {
      hospitals: {
        some: { hospitalId }
      }
    }
  })

  const totalAppointments = appointments.length;
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
  const rescheduledAppointments = appointments.filter(a => a.status === 'rescheduled').length;
  
  const totalRevenue = appointments
    .filter(a => a.status !== 'pending-payment')
    .reduce((sum, a) => {
        // Fix: Add a null check for the doctor to prevent crash if doctor is deleted
        if (!a.doctor) {
            return sum;
        }
        return sum + (a.doctor.consultationFee || 0);
    }, 0);

  const doctorRevenueBreakdown = doctors.map(doctor => {
    const revenueAppointments = appointments.filter(a => a.doctorId === doctor.id && a.status !== 'pending-payment');
    const revenue = revenueAppointments.reduce((sum) => sum + (doctor.consultationFee || 0), 0);
    return {
      name: doctor.name.replace('Dr. ', ''),
      appointments: revenueAppointments.length,
      revenue: revenue
    };
  }).filter(d => d.appointments > 0);

  return {
    appointments: appointments as (Appointment & { patient: Patient, doctor: Doctor | null })[],
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
