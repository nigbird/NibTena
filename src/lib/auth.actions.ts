
'use server';

import { z } from 'zod';
import { getSession } from './session';
import { prisma } from './prisma';
import { redirect } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['superadmin', 'hospital', 'doctor']),
});

type LoginState = {
  success: boolean;
  message: string;
} | undefined;

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const validatedFields = loginSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Invalid form data.',
    };
  }

  const { email, password, role } = validatedFields.data;
  const session = await getSession();

  // IMPORTANT: In a real application, you would use a library like bcrypt to
  // compare a hashed password. Storing and comparing plain-text passwords is
  // not secure.
  
  if (role === 'superadmin') {
    // This is a mock implementation for the super admin.
    if (email === 'super@mediverse.com' && password === 'password123') {
        session.userId = 999;
        session.name = 'Super Admin';
        session.role = 'superadmin';
        session.isLoggedIn = true;
        await session.save();
        return { success: true, message: 'Logged in successfully' };
    }
  } else if (role === 'hospital') {
     const hospital = await prisma.hospital.findUnique({ where: { contactEmail: email } });
     // Mock password check. Replace with bcrypt.compare in a real app.
     if (hospital && hospital.password === password) {
        session.userId = hospital.id;
        session.name = hospital.name;
        session.role = 'hospital';
        session.isLoggedIn = true;
        await session.save();
        return { success: true, message: 'Logged in successfully' };
     }
  } else if (role === 'doctor') {
    const doctor = await prisma.doctor.findUnique({ where: { contact: email } });
    
    // Mock password check. Replace with bcrypt.compare in a real app.
    if (doctor && doctor.password === password) {
        session.userId = doctor.id;
        session.name = doctor.name;
        session.role = 'doctor';
        session.isLoggedIn = true;
        await session.save();
        return { success: true, message: 'Logged in successfully' };
    }
  }

  return {
    success: false,
    message: 'Invalid email or password.',
  };
}

export async function logout() {
  const session = await getSession();
  const role = session.role;
  session.destroy();
  
  let redirectPath = '/';
  if (role === 'superadmin') redirectPath = '/super-admin/login';
  if (role === 'hospital') redirectPath = '/hospital-admin/login';
  if (role === 'doctor') redirectPath = '/doctor-portal/login';

  redirect(redirectPath);
}
