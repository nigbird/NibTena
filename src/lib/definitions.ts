

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
  imageUrl?: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  password?: string;
  status: 'active' | 'inactive';
  bookingWindow: number;
  startTime: string;
  endTime: string;
  accountNumber: string;
};

export type Doctor = {
  id: number;
  name: string;
  specialty: string;
  hospitalIds: number[];
  imageId: string;
  imageUrl?: string;
  bio: string;
  consultationFee: number;
  rating: number;
  experience?: number;
  contact?: string;
  password?: string;
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
  hospitalId?: number; // For hospital admins
  hospitalIds?: number[]; // For doctors who can work at multiple hospitals
};

export const sessionOptions: SessionOptions = {
  // Validate that the SECRET_COOKIE_PASSWORD env var is present. iron-session
  // requires a password between 32 and 1024 characters. Throwing here gives a
  // clear, early error message for developers instead of the generic
  // 'Bad usage. Missing password.' runtime error.
  password: ((): string => {
    const pw = process.env.SECRET_COOKIE_PASSWORD;
    if (!pw) {
      throw new Error('Missing SECRET_COOKIE_PASSWORD environment variable. Create a .env.local file with SECRET_COOKIE_PASSWORD set to a secure value (32+ chars) and restart the dev server.');
    }
    if (pw.length < 32 || pw.length > 1024) {
      throw new Error('SECRET_COOKIE_PASSWORD must be between 32 and 1024 characters.');
    }
    return pw;
  })(),
  cookieName: 'mediverse-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};
