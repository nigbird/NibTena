
import type { Hospital, Doctor, Appointment } from './definitions';

const hospitals: Hospital[] = [
  { id: 1, name: 'Tikur Anbessa Specialized Hospital', city: 'Addis Ababa', imageId: 'hospital-1' },
  { id: 2, name: 'St. Paul’s Millennium Medical College', city: 'Addis Ababa', imageId: 'hospital-2' },
  { id: 3, name: 'Hawassa Referral Hospital', city: 'Hawassa', imageId: 'hospital-3' },
];

let doctors: Doctor[] = [
  { id: 1, name: 'Dr. Mulugeta Tesfaye', specialty: 'Cardiology', hospitalId: 1, imageId: 'doctor-1', bio: 'Dr. Mulugeta is a senior cardiologist with over 15 years of experience treating heart and vascular conditions.', consultationFee: 150, rating: 4.9, status: 'active', experience: 15 },
  { id: 2, name: 'Dr. Selamawit Bekele', specialty: 'Dermatology', hospitalId: 1, imageId: 'doctor-2', bio: 'Dr. Selamawit specializes in both cosmetic and clinical dermatology, focusing on holistic skin care.', consultationFee: 120, rating: 4.8, status: 'active', experience: 10 },
  { id: 3, name: 'Dr. Tewodros Mekonnen', specialty: 'Neurology', hospitalId: 2, imageId: 'doctor-3', bio: 'Dr. Tewodros is a neurologist focusing on brain and spinal disorders, epilepsy, and stroke recovery.', consultationFee: 200, rating: 4.9, status: 'active', experience: 12 },
  { id: 4, name: 'Dr. Meron Alemu', specialty: 'Pediatrics', hospitalId: 2, imageId: 'doctor-4', bio: 'Dr. Meron provides compassionate pediatric care for children from infancy through adolescence.', consultationFee: 100, rating: 4.7, status: 'active', experience: 8 },
  { id: 5, name: 'Dr. Yoseph Hailemariam', specialty: 'Orthopedics', hospitalId: 3, imageId: 'doctor-5', bio: 'Dr. Yoseph specializes in sports medicine and joint replacement, helping patients recover mobility.', consultationFee: 180, rating: 4.8, status: 'active', experience: 9 },
  { id: 6, name: 'Dr. Rahel Tadesse', specialty: 'Dentistry', hospitalId: 3, imageId: 'doctor-6', bio: 'Dr. Rahel offers a full range of dental care — from preventive cleanings to restorative and cosmetic procedures.', consultationFee: 90, rating: 4.9, status: 'active', experience: 7 },
  { id: 7, name: 'Dr. Dawit Abebe', specialty: 'Cardiology', hospitalId: 1, imageId: 'doctor-7', bio: 'Dr. Dawit focuses on preventive cardiology and lifestyle-based treatment approaches for heart health.', consultationFee: 160, rating: 4.8, status: 'active', experience: 5 },
];

function getISODate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

// In-memory store for appointments
let appointments: Appointment[] = [
  // Today's appointments for Queue
  { id: 'q1', patientName: 'Hana Worku', patientPhone: '0912-345678', patientAge: 28, patientGender: 'female', symptoms: 'Annual check-up.', doctorId: 1, appointmentDate: getISODate(0), appointmentSlot: '09:00 AM', status: 'confirmed' },
  { id: 'q2', patientName: 'Kebede Alemayehu', patientPhone: '0911-987654', patientAge: 52, patientGender: 'male', symptoms: 'Follow-up on blood pressure.', doctorId: 1, appointmentDate: getISODate(0), appointmentSlot: '09:30 AM', status: 'confirmed' },
  { id: 'q3', patientName: 'Marta Gebremedhin', patientPhone: '0913-222333', patientAge: 35, patientGender: 'female', symptoms: 'Skin rash consultation.', doctorId: 2, appointmentDate: getISODate(0), appointmentSlot: '10:00 AM', status: 'confirmed' },
  { id: 'q4', patientName: 'Abel Tesema', patientPhone: '0910-444555', patientAge: 41, patientGender: 'male', symptoms: 'Migraine and fatigue.', doctorId: 3, appointmentDate: getISODate(0), appointmentSlot: '10:30 AM', status: 'confirmed' },
  { id: 'q5', patientName: 'Lulit Fikre', patientPhone: '0919-111222', patientAge: 6, patientGender: 'female', symptoms: 'Child vaccination.', doctorId: 4, appointmentDate: getISODate(0), appointmentSlot: '11:00 AM', status: 'confirmed' },

  // Past appointments for reports
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `p_c_${i}`,
    patientName: `Completed Patient ${i + 1}`,
    patientPhone: `0912-00${i.toString().padStart(2, '0')}`,
    patientAge: 20 + i * 2,
    patientGender: i % 2 === 0 ? 'female' : 'male',
    symptoms: `Symptom description ${i + 1}`,
    doctorId: (i % 7) + 1,
    appointmentDate: getISODate(- (i + 1)),
    appointmentSlot: '10:00 AM',
    status: 'completed' as 'completed',
  })),
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `p_x_${i}`,
    patientName: `Cancelled Patient ${i + 1}`,
    patientPhone: `0913-01${i.toString().padStart(2, '0')}`,
    patientAge: 30 + i * 3,
    patientGender: 'female',
    symptoms: `Reason for cancellation ${i + 1}`,
    doctorId: (i % 7) + 1,
    appointmentDate: getISODate(- (i + 2)),
    appointmentSlot: '11:00 AM',
    status: 'cancelled' as 'cancelled',
  })),
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `p_c2_${i}`,
    patientName: `Past Patient ${i + 1}`,
    patientPhone: `0914-02${i.toString().padStart(2, '0')}`,
    patientAge: 25 + i * 2,
    patientGender: i % 2 === 0 ? 'male' : 'female',
    symptoms: `Past issue ${i + 1}`,
    doctorId: (i % 4) + 1,
    appointmentDate: getISODate(- (i + 15)),
    appointmentSlot: '02:00 PM',
    status: 'completed' as 'completed',
  })),
];


// API functions to interact with mock data
export async function getHospitals(): Promise<Hospital[]> {
  return hospitals;
}

export async function getHospitalById(id: number): Promise<Hospital | undefined> {
  return hospitals.find(h => h.id === id);
}

export async function getDoctorsByHospitalId(hospitalId: number): Promise<Doctor[]> {
  return doctors.filter(d => d.hospitalId === hospitalId);
}

export async function getDoctors(specialty?: string): Promise<Doctor[]> {
    if (specialty) {
        return doctors.filter(d => d.specialty.toLowerCase() === specialty.toLowerCase());
    }
    return doctors;
}

export async function getDoctorById(id: number): Promise<Doctor | undefined> {
  return doctors.find(d => d.id === id);
}

export async function addDoctor(doctor: Omit<Doctor, 'id' | 'rating' | 'imageId' | 'status'> & { hospitalId: number }): Promise<Doctor> {
    const newDoctor: Doctor = {
        ...doctor,
        id: doctors.length > 0 ? Math.max(...doctors.map(d => d.id)) + 1 : 1,
        rating: Math.floor(Math.random() * (50 - 45) + 45) / 10, // random rating between 4.5 and 5
        imageId: `doctor-${((doctors.length + 1) % 7) + 1}`, // cycle through placeholder images
        status: 'active',
    };
    doctors.push(newDoctor);
    return newDoctor;
}

export async function updateDoctor(id: number, updatedData: Partial<Omit<Doctor, 'id'>>): Promise<Doctor | undefined> {
    const doctorIndex = doctors.findIndex(d => d.id === id);
    if (doctorIndex === -1) {
        return undefined;
    }
    doctors[doctorIndex] = { ...doctors[doctorIndex], ...updatedData };
    return doctors[doctorIndex];
}

export async function deleteDoctor(id: number): Promise<{ success: boolean }> {
    const initialLength = doctors.length;
    doctors = doctors.filter(d => d.id !== id);
    return { success: doctors.length < initialLength };
}


export async function getAppointmentsByDoctorId(doctorId: number): Promise<Appointment[]> {
    return appointments.filter(a => a.doctorId === doctorId);
}

export async function getAppointmentsByHospitalId(hospitalId: number): Promise<Appointment[]> {
  const hospitalDoctors = await getDoctorsByHospitalId(hospitalId);
  const doctorIds = hospitalDoctors.map(d => d.id);
  return appointments.filter(a => doctorIds.includes(a.doctorId));
}

export async function getAppointmentById(id: string): Promise<Appointment | undefined> {
    return appointments.find(a => a.id === id);
}

export async function addAppointment(appointment: Omit<Appointment, 'id' | 'status'>): Promise<Appointment> {
    const newAppointment: Appointment = {
        ...appointment,
        id: `apt_${Date.now()}`,
        status: 'confirmed',
    };
    appointments.push(newAppointment);
    return newAppointment;
}


export async function updateAppointment(id: string, updatedData: Partial<Omit<Appointment, 'id'>>): Promise<Appointment | undefined> {
    const appointmentIndex = appointments.findIndex(a => a.id === id);
    if (appointmentIndex === -1) {
        return undefined;
    }
    appointments[appointmentIndex] = { ...appointments[appointmentIndex], ...updatedData };
    return appointments[appointmentIndex];
}

export async function deleteAppointment(id: string): Promise<{ success: boolean }> {
    const initialLength = appointments.length;
    appointments = appointments.filter(a => a.id !== id);
    return { success: appointments.length < initialLength };
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
    const specialties = new Set([...allSpecialties, ...doctors.map(d => d.specialty)]);
    return Array.from(specialties);
}

export async function getHospitalSpecialties(hospitalId: number): Promise<string[]> {
    const hospitalDoctors = doctors.filter(d => d.hospitalId === hospitalId);
    const specialties = new Set(hospitalDoctors.map(d => d.specialty));
    return Array.from(specialties);
}
