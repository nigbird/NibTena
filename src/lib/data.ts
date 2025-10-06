import type { Hospital, Doctor, Appointment } from './definitions';

const hospitals: Hospital[] = [
  { id: 1, name: 'City General Hospital', city: 'Metropolis', imageId: 'hospital-1' },
  { id: 2, name: 'County Medical Center', city: 'Star City', imageId: 'hospital-2' },
  { id: 3, name: 'Sunrise Health Clinic', city: 'Gotham', imageId: 'hospital-3' },
];

const doctors: Doctor[] = [
  { id: 1, name: 'Dr. Emily Carter', specialty: 'Cardiology', hospitalId: 1, imageId: 'doctor-1', bio: 'Dr. Carter is a board-certified cardiologist with over 15 years of experience in treating heart conditions.', consultationFee: 150, rating: 4.9 },
  { id: 2, name: 'Dr. Benjamin Lee', specialty: 'Dermatology', hospitalId: 1, imageId: 'doctor-2', bio: 'Dr. Lee specializes in cosmetic and medical dermatology, helping patients achieve healthy skin.', consultationFee: 120, rating: 4.8 },
  { id: 3, name: 'Dr. Sophia Rodriguez', specialty: 'Neurology', hospitalId: 2, imageId: 'doctor-3', bio: 'A leading neurologist, Dr. Rodriguez focuses on degenerative brain diseases and stroke recovery.', consultationFee: 200, rating: 4.9 },
  { id: 4, name: 'Dr. Michael Chen', specialty: 'Pediatrics', hospitalId: 2, imageId: 'doctor-4', bio: 'Dr. Chen provides compassionate care for children from infancy through adolescence.', consultationFee: 100, rating: 4.7 },
  { id: 5, name: 'Dr. Olivia Garcia', specialty: 'Orthopedics', hospitalId: 3, imageId: 'doctor-5', bio: 'Specializing in sports medicine, Dr. Garcia helps athletes recover from injuries and improve performance.', consultationFee: 180, rating: 4.8 },
  { id: 6, name: 'Dr. David Kim', specialty: 'Dentistry', hospitalId: 3, imageId: 'doctor-6', bio: 'Dr. Kim offers a wide range of dental services, from routine check-ups to complex restorative procedures.', consultationFee: 90, rating: 4.9 },
  { id: 7, name: 'Dr. Sarah Jones', specialty: 'Cardiology', hospitalId: 1, imageId: 'doctor-7', bio: 'Dr. Jones brings a fresh perspective to cardiology, with a focus on preventative care and lifestyle management.', consultationFee: 160, rating: 4.8 },
];

// In-memory store for appointments
let appointments: Appointment[] = [];

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

export async function getSpecialties(): Promise<string[]> {
    const specialties = new Set(doctors.map(d => d.specialty));
    return Array.from(specialties);
}

export async function getHospitalSpecialties(hospitalId: number): Promise<string[]> {
    const hospitalDoctors = doctors.filter(d => d.hospitalId === hospitalId);
    const specialties = new Set(hospitalDoctors.map(d => d.specialty));
    return Array.from(specialties);
}
