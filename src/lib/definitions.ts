
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
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapDisplayAddress?: string | null;
  imageUrl: string | null;
  description: string;
  ownerName?: string | null;
  ownerPhone?: string | null;
  bankDistrict?: string | null;
  bankBranch?: string | null;
  contactEmail: string;
  contactPhone: string;
  password?: string;
  status: 'active' | 'inactive';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  createdBySuperAdminId?: number | null;
  approvedBySuperAdminId?: number | null;
  approvedAt?: string | null;
  bookingWindow: number;
  startTime: string;
  endTime: string;
  accountNumber: string;
};

export type Doctor = {
  id: number;
  name: string;
  specialty: string;
  imageUrl: string | null;
  bio: string;
  consultationFee: number;
  rating: number;
  experience?: number;
  contact?: string;
  password?: string;
  status?: 'active' | 'inactive';
};

export type Patient = {
  id: number;
  phone: string;
  name: string;
  email?: string | null;
  age?: number | null;
  gender?: 'male' | 'female' | null;
};

export type Appointment = {
  id: string;
  patientId: number;
  symptoms: string;
  doctorId: number;
  hospitalId: number;
  appointmentSlot: string; // e.g., "09:00 AM - 09:30 AM"
  appointmentDate: Date;
  status: 'pending-payment' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'checked-in' | 'in-progress';
  transactionId?: string | null;
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

    
