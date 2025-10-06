export type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'patient' | 'doctor' | 'hospital_admin' | 'super_admin';
};

export type Hospital = {
  id: number;
  name: string;
  city: string;
  imageId: string;
};

export type Doctor = {
  id: number;
  name: string;
  specialty: string;
  hospitalId: number;
  imageId: string;
  bio: string;
  consultationFee: number;
  rating: number;
  experience?: number;
  contact?: string;
  status?: 'active' | 'inactive';
};

export type Appointment = {
  id: string;
  patientName: string;
  patientPhone: string;
  patientGender: 'male' | 'female' | 'other';
  patientAge: number;
  symptoms: string;
  doctorId: number;
  appointmentSlot: string;
  appointmentDate: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
};
