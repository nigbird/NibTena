import type { Hospital, Doctor, Appointment } from './definitions';

const hospitals: Hospital[] = [
  { id: 1, name: 'City General Hospital', city: 'Metropolis', imageId: 'hospital-1' },
  { id: 2, name: 'County Medical Center', city: 'Star City', imageId: 'hospital-2' },
  { id: 3, name: 'Sunrise Health Clinic', city: 'Gotham', imageId: 'hospital-3' },
];

let doctors: Doctor[] = [
  { id: 1, name: 'Dr. Emily Carter', specialty: 'Cardiology', hospitalId: 1, imageId: 'doctor-1', bio: 'Dr. Carter is a board-certified cardiologist with over 15 years of experience in treating heart conditions.', consultationFee: 150, rating: 4.9, status: 'active', experience: 15 },
  { id: 2, name: 'Dr. Benjamin Lee', specialty: 'Dermatology', hospitalId: 1, imageId: 'doctor-2', bio: 'Dr. Lee specializes in cosmetic and medical dermatology, helping patients achieve healthy skin.', consultationFee: 120, rating: 4.8, status: 'active', experience: 10 },
  { id: 3, name: 'Dr. Sophia Rodriguez', specialty: 'Neurology', hospitalId: 2, imageId: 'doctor-3', bio: 'A leading neurologist, Dr. Rodriguez focuses on degenerative brain diseases and stroke recovery.', consultationFee: 200, rating: 4.9, status: 'active', experience: 12 },
  { id: 4, name: 'Dr. Michael Chen', specialty: 'Pediatrics', hospitalId: 2, imageId: 'doctor-4', bio: 'Dr. Chen provides compassionate care for children from infancy through adolescence.', consultationFee: 100, rating: 4.7, status: 'active', experience: 8 },
  { id: 5, name: 'Dr. Olivia Garcia', specialty: 'Orthopedics', hospitalId: 3, imageId: 'doctor-5', bio: 'Specializing in sports medicine, Dr. Garcia helps athletes recover from injuries and improve performance.', consultationFee: 180, rating: 4.8, status: 'active', experience: 9 },
  { id: 6, name: 'Dr. David Kim', specialty: 'Dentistry', hospitalId: 3, imageId: 'doctor-6', bio: 'Dr. Kim offers a wide range of dental services, from routine check-ups to complex restorative procedures.', consultationFee: 90, rating: 4.9, status: 'active', experience: 7 },
  { id: 7, name: 'Dr. Sarah Jones', specialty: 'Cardiology', hospitalId: 1, imageId: 'doctor-7', bio: 'Dr. Jones brings a fresh perspective to cardiology, with a focus on preventative care and lifestyle management.', consultationFee: 160, rating: 4.8, status: 'active', experience: 5 },
];

// In-memory store for appointments
let appointments: Appointment[] = [
    {
        id: 'apt_1625488800000',
        patientName: 'John Smith',
        patientPhone: '555-0101',
        patientAge: 45,
        patientGender: 'male',
        symptoms: 'Chest pain and shortness of breath.',
        summary: 'Patient presents with chest pain and shortness of breath, possible cardiac event.',
        doctorId: 1,
        appointmentDate: '2024-08-15',
        appointmentSlot: '10:00 AM',
        status: 'confirmed',
    },
    {
        id: 'apt_1625492400000',
        patientName: 'Jane Doe',
        patientPhone: '555-0102',
        patientAge: 32,
        patientGender: 'female',
        symptoms: 'Severe headache and dizziness.',
        summary: 'Patient reports severe headache and dizziness, requires neurological assessment.',
        doctorId: 3,
        appointmentDate: '2024-08-15',
        appointmentSlot: '11:00 AM',
        status: 'confirmed',
    },
    {
        id: 'apt_1625575200000',
        patientName: 'Peter Jones',
        patientPhone: '555-0103',
        patientAge: 8,
        patientGender: 'male',
        symptoms: 'Fever and sore throat.',
        summary: 'Child with fever and sore throat, likely strep or viral infection.',
        doctorId: 4,
        appointmentDate: '2024-08-16',
        appointmentSlot: '09:30 AM',
        status: 'completed',
    },
     {
        id: 'apt_1625661600000',
        patientName: 'Mary Johnson',
        patientPhone: '555-0104',
        patientAge: 68,
        patientGender: 'female',
        symptoms: 'Follow-up for knee replacement surgery.',
        summary: 'Post-op follow-up for knee replacement.',
        doctorId: 5,
        appointmentDate: '2024-07-20',
        appointmentSlot: '02:00 PM',
        status: 'completed',
    },
     {
        id: 'apt_1625748000000',
        patientName: 'David Williams',
        patientPhone: '555-0105',
        patientAge: 25,
        patientGender: 'male',
        symptoms: 'Cancelled due to conflict.',
        summary: 'N/A',
        doctorId: 2,
        appointmentDate: '2024-08-18',
        appointmentSlot: '03:00 PM',
        status: 'cancelled',
    },
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

export async function addAppointment(appointment: Omit<Appointment, 'id' | 'status' | 'summary'>): Promise<Appointment> {
    const newAppointment: Appointment = {
        ...appointment,
        id: `apt_${Date.now()}`,
        status: 'confirmed',
        summary: appointment.symptoms, // Default summary to symptoms
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
