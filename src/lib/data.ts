import { PrismaClient } from '@prisma/client';
import type { Hospital, Doctor, Appointment } from './definitions';
import { format } from 'date-fns';

const prisma = new PrismaClient();

// API functions to interact with the database
export async function getHospitals(): Promise<Hospital[]> {
  const hospitals = await prisma.hospital.findMany();
  return hospitals.map(h => ({ ...h, status: h.status as 'active' | 'inactive'}));
}

export async function getHospitalById(id: number): Promise<Hospital | null> {
  const hospital = await prisma.hospital.findUnique({ where: { id } });
  if (!hospital) return null;
  return { ...hospital, status: hospital.status as 'active' | 'inactive' };
}

export async function addHospital(hospital: Omit<Hospital, 'id' | 'imageId'>): Promise<Hospital> {
    const newHospital = await prisma.hospital.create({
        data: {
            ...hospital,
            imageId: `hospital-1`, // Placeholder
        }
    });
    return { ...newHospital, status: newHospital.status as 'active' | 'inactive' };
}

export async function updateHospital(id: number, updatedData: Partial<Omit<Hospital, 'id'>>): Promise<Hospital | undefined> {
    const updatedHospital = await prisma.hospital.update({
        where: { id },
        data: {
          ...updatedData,
          status: updatedData.status as any
        }
    });
    return { ...updatedHospital, status: updatedHospital.status as 'active' | 'inactive' };
}

export async function deleteHospital(id: number): Promise<{ success: boolean }> {
    await prisma.doctorsOnHospitals.deleteMany({ where: { hospitalId: id } });
    await prisma.hospital.delete({ where: { id } });
    return { success: true };
}

export async function getDoctorsByHospitalId(hospitalId: number): Promise<Doctor[]> {
  const doctorsOnHospitals = await prisma.doctorsOnHospitals.findMany({
    where: { hospitalId },
    include: { doctor: true }
  });
  return doctorsOnHospitals.map(doh => ({
    ...doh.doctor,
    hospitalIds: [hospitalId], // context specific
    status: doh.doctor.status as any,
  }));
}

export async function getDoctors(specialty?: string): Promise<Doctor[]> {
    const where: any = {};
    if (specialty) {
        where.specialty = specialty;
    }
    const doctors = await prisma.doctor.findMany({ 
        where,
        include: { hospitals: { include: { hospital: true } } }
    });
    return doctors.map(d => ({
        ...d,
        status: d.status as any,
        hospitalIds: d.hospitals.map(h => h.hospitalId),
    }));
}

export async function getDoctorById(id: number): Promise<Doctor | null> {
  const doctor = await prisma.doctor.findUnique({ 
    where: { id },
    include: { hospitals: { include: { hospital: true } } }
  });
  if (!doctor) return null;
  return {
    ...doctor,
    status: doctor.status as any,
    hospitalIds: doctor.hospitals.map(h => h.hospitalId)
  };
}

export async function addDoctor(doctor: Omit<Doctor, 'id' | 'rating' | 'imageId' | 'status' | 'hospitalIds'> & { hospitalId: number }): Promise<Doctor> {
    const newDoctor = await prisma.doctor.create({
        data: {
            ...doctor,
            rating: Math.floor(Math.random() * (50 - 45) + 45) / 10,
            imageId: `doctor-1`, // Placeholder
            status: 'active',
            hospitals: {
                create: [
                    {
                        hospital: {
                            connect: { id: doctor.hospitalId }
                        }
                    }
                ]
            }
        },
        include: { hospitals: true }
    });
    return { ...newDoctor, status: 'active', hospitalIds: [doctor.hospitalId] };
}

export async function updateDoctor(id: number, updatedData: Partial<Omit<Doctor, 'id' | 'hospitalIds'>>): Promise<Doctor | undefined> {
    const updatedDoctor = await prisma.doctor.update({
        where: { id },
        data: {
          ...updatedData,
          status: updatedData.status as any,
        },
        include: { hospitals: true }
    });
    return {
        ...updatedDoctor,
        status: updatedDoctor.status as any,
        hospitalIds: updatedDoctor.hospitals.map(h => h.hospitalId)
    };
}

export async function deleteDoctor(id: number): Promise<{ success: boolean }> {
    await prisma.doctorsOnHospitals.deleteMany({ where: { doctorId: id } });
    await prisma.doctor.delete({ where: { id } });
    return { success: true };
}


export async function getAppointmentsByDoctorId(doctorId: number): Promise<Appointment[]> {
    const appointments = await prisma.appointment.findMany({ where: { doctorId } });
    return appointments.map(a => ({
        ...a,
        appointmentDate: format(new Date(a.appointmentDate), 'yyyy-MM-dd'),
        status: a.status as any,
        patientGender: a.patientGender as any,
    }));
}

export async function getAppointmentsByHospitalId(hospitalId: number): Promise<Appointment[]> {
  const appointments = await prisma.appointment.findMany({ where: { hospitalId } });
  return appointments.map(a => ({
        ...a,
        appointmentDate: format(new Date(a.appointmentDate), 'yyyy-MM-dd'),
        status: a.status as any,
        patientGender: a.patientGender as any,
    }));
}

export async function getAppointmentById(id: string): Promise<Appointment | undefined> {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return undefined;
    return {
        ...appointment,
        appointmentDate: format(new Date(appointment.appointmentDate), 'yyyy-MM-dd'),
        status: appointment.status as any,
        patientGender: appointment.patientGender as any,
    };
}

export async function addAppointment(appointment: Omit<Appointment, 'id' | 'status'>): Promise<Appointment> {
    const newAppointment = await prisma.appointment.create({
        data: {
            ...appointment,
            appointmentDate: new Date(appointment.appointmentDate),
            status: 'confirmed',
        }
    });
    return {
        ...newAppointment,
        appointmentDate: format(new Date(newAppointment.appointmentDate), 'yyyy-MM-dd'),
        status: 'confirmed',
        patientGender: newAppointment.patientGender as 'male' | 'female',
    };
}


export async function updateAppointment(id: string, updatedData: Partial<Omit<Appointment, 'id'>>): Promise<Appointment | undefined> {
    const dataToUpdate: any = { ...updatedData };
    if (updatedData.appointmentDate) {
        dataToUpdate.appointmentDate = new Date(updatedData.appointmentDate);
    }
     if (updatedData.status) {
        dataToUpdate.status = updatedData.status as any;
    }
    const updated = await prisma.appointment.update({
        where: { id },
        data: dataToUpdate,
    });
    if (!updated) return undefined;
    return {
        ...updated,
        appointmentDate: format(new Date(updated.appointmentDate), 'yyyy-MM-dd'),
        status: updated.status as any,
        patientGender: updated.patientGender as any,
    };
}

export async function deleteAppointment(id: string): Promise<{ success: boolean }> {
    await prisma.appointment.delete({ where: { id } });
    return { success: true };
}

export async function getSpecialties(): Promise<string[]> {
    const allSpecialties = [
      'Cardiology', 
      'Dermatology', 
      'Neurology', 
      'Pediatrics', 
      'Orthopedics', 
      'Dentistry',
      'General Practice',
      'Urology',
      'Gastroenterology'
    ];
    const doctorSpecialties = await prisma.doctor.findMany({
        select: { specialty: true },
        distinct: ['specialty']
    });

    const specialties = new Set([...allSpecialties, ...doctorSpecialties.map(d => d.specialty)]);
    return Array.from(specialties);
}

export async function getHospitalSpecialties(hospitalId: number): Promise<string[]> {
    const doctors = await prisma.doctor.findMany({
        where: { hospitals: { some: { hospitalId } } },
        select: { specialty: true },
        distinct: ['specialty']
    });
    const specialties = new Set(doctors.map(d => d.specialty));
    return Array.from(specialties);
}
