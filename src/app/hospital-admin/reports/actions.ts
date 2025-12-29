
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
  if (!session?.user) return { appointments: [], doctors: [] };

  const allowed = await requireHospitalPermission('Reports:View', hospitalId);
  if (!allowed) return { appointments: [], doctors: [] };

  const appointmentDateFilter: any = {};
  if (dateRange?.from) {
    appointmentDateFilter.gte = startOfDay(dateRange.from);
  }
  if (dateRange?.to) {
    appointmentDateFilter.lte = endOfDay(dateRange.to);
  }

  const doctorFilter = doctorId ? { doctorId: doctorId } : {};
  const patientFilter = patientName ? { patient: { name: { contains: patientName, mode: 'insensitive' } } } : {};

  const appointments = await prisma.appointment.findMany({
    where: { 
      hospitalId,
      ...(Object.keys(appointmentDateFilter).length > 0 && { appointmentDate: appointmentDateFilter }),
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

  return {
    appointments: appointments as (Appointment & { patient: Patient, doctor: Doctor | null })[],
    doctors,
  };
}

