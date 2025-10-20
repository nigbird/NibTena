
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      hospitalId?: number | null;
      doctorHospitalIds?: number[] | null;
      image?: string | null;
    };
  }

  interface User {
      role?: string;
      imageUrl?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    hospitalId?: number | null;
    doctorHospitalIds?: number[] | null;
  }
}
