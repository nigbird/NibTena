
import { type SessionOptions } from 'iron-session';

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
  description: string;
  contactEmail: string;
  contactPhone: string;
  accountNumber: string;
  status: 'active' | 'inactive';
  bookingWindow: number;
  startTime: string;
  endTime: string;
};

export type Doctor = {
  id: number;
  name: string;
  specialty: string;
  hospitalIds: number[];
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
  hospitalId: number;
  patientName: string;
  patientPhone: string;
  patientGender: 'male' | 'female';
  patientAge: number;
  symptoms: string;
  appointmentSummary?: string;
  doctorId: number;
  appointmentSlot: string; // This will now store the time window, e.g., "09:00 AM - 09:30 AM"
  appointmentDate: Date;
  status: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
  bookedBy?: string;
  relationship?: string;
  createdAt: string;
};

export type TimeSlot = {
  startTime: string;
  endTime:string;
};

export type DoctorSchedule = {
  id: number;
  doctorId: number;
  hospitalId: number;
  dayOfWeek: string;
  workingHours: TimeSlot[];
  breakHours: TimeSlot[];
  createdAt: Date;
  updatedAt: Date;
};

// --- SESSION ---
export type SessionData = {
  userId?: number;
  name?: string;
  role?: 'superadmin' | 'hospital' | 'doctor';
  isLoggedIn: boolean;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string,
  cookieName: 'mediverse-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};
