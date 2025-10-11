
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function getDoctorsByHospitalId(hospitalId: number) {
    return await prisma.doctor.findMany({
        where: {
            hospitals: {
                some: { hospitalId }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });
}

const ScheduleFormSchema = z.object({
  doctorId: z.coerce.number({ required_error: 'Please select a doctor.' }),
  workingDays: z.array(z.string()).min(1, 'Please select at least one working day.'),
  startTime: z.string().min(1, 'Start time is required.'),
  endTime: z.string().min(1, 'End time is required.'),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
});

export type ScheduleFormState = {
  errors?: {
    doctorId?: string[];
    workingDays?: string[];
    startTime?: string[];
    endTime?: string[];
    breakStart?: string[];
    breakEnd?: string[];
  };
  message?: string | null;
  success?: boolean;
};

// In a real application, this would save to a DoctorSchedule model
// For this mock, we'll just log it and revalidate
export async function addDoctorSchedule(
    hospitalId: number,
    prevState: ScheduleFormState,
    formData: FormData
): Promise<ScheduleFormState> {
    
    const workingDays = formData.getAll('workingDays');
    
    const validatedFields = ScheduleFormSchema.safeParse({
        doctorId: formData.get('doctorId'),
        workingDays: workingDays,
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        breakStart: formData.get('breakStart'),
        breakEnd: formData.get('breakEnd'),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Failed to add schedule. Please check the fields.',
            success: false,
        };
    }

    console.log('New Schedule Data:', validatedFields.data);
    
    // This is where you would typically create/update the schedule in the database
    // e.g., await prisma.doctorSchedule.create({ data: ... });

    revalidatePath('/hospital-admin/schedule');

    return {
        success: true,
        message: 'Doctor schedule added successfully.',
    };
}
