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
    };
  }

  interface User {
      role?: string;
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
