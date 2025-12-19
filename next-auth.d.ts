
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
      mustChangePassword?: boolean;
    };
  }

  interface User {
      role?: string;
      imageUrl?: string | null;
      mustChangePassword?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    hospitalId?: number | null;
    doctorHospitalIds?: number[] | null;
    mustChangePassword?: boolean;
  }
}

    
