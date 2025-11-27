
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;

  // --- Create Super Admin ---
  const superAdminPassword = await bcrypt.hash('Admin@123', saltRounds);
  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@NibTena.com' },
    update: { password: superAdminPassword },
    create: {
      email: 'superadmin@NibTena.com',
      name: 'Super Admin',
      password: superAdminPassword,
    },
  });

  // --- Create Hospitals ---
  const hospitalPassword = await bcrypt.hash('password123', saltRounds);
  await prisma.hospital.upsert({
    where: { contactEmail: 'admin@tikuranbessa.com' },
    update: { password: hospitalPassword },
    create: {
      name: 'Tikur Anbessa Specialized Hospital',
      description:
        'A leading public hospital in Addis Ababa, providing comprehensive healthcare services and medical education. It is the largest specialized hospital in Ethiopia.',
      city: 'Addis Ababa',
      imageUrl: 'https://img.semafor.com/a65644297a8e84eb692c88504ba4123a2e7e5679-1600x900.jpg?rect=200,0,1200,900&w=800&h=600&q=75&auto=format',
      contactEmail: 'admin@tikuranbessa.com',
      contactPhone: '+251-11-551-1211',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:00',
      endTime: '19:00',
      bookingWindow: 30,
      accountNumber: 'ACCT-TAS-001',
      mustChangePassword: true,
    },
  });

  const hospital3 = await prisma.hospital.upsert({
    where: { contactEmail: 'admin@hu.com' },
    update: { password: hospitalPassword },
    create: {
      name: 'Hawassa University Specialized Hospital',
      description:
        'A major referral hospital in the Sidama region, providing a wide range of medical services and serving as a teaching center for Hawassa University.',
      city: 'Hawassa',
      imageUrl: 'https://img.semafor.com/a65644297a8e84eb692c88504ba4123a2e7e5679-1600x900.jpg?rect=200,0,1200,900&w=800&h=600&q=75&auto-format',
      contactEmail: 'admin@hu.com',
      contactPhone: '+251-46-220-5576',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:30',
      endTime: '18:30',
      bookingWindow: 14,
      accountNumber: 'ACCT-HUCSH-003',
      mustChangePassword: true,
    },
  });

  const hospital4 = await prisma.hospital.upsert({
    where: { contactEmail: 'admin@ethiotibeb.com' },
    update: { password: hospitalPassword },
    create: {
      name: 'Ethio Tibeb Specialized Hospital',
      description:
        'A major referral hospital in the Sidama region, providing a wide range of medical services and serving as a teaching center for Hawassa University.',
      city: 'Addis Ababa',
      imageUrl: 'https://img.semafor.com/a65644297a8e84eb692c88504ba4123a2e7e5679-1600x900.jpg?rect=200,0,1200,900&w=800&h=600&q=75&auto-format',
      contactEmail: 'admin@ethiotibeb.com',
      contactPhone: '+251-46-220-5576',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:30',
      endTime: '18:30',
      bookingWindow: 14,
      accountNumber: '7000023456',
      mustChangePassword: true,
    },
  });
  const hospital5 = await prisma.hospital.upsert({
    where: { contactEmail: 'admin@lancet.com' },
    update: { password: hospitalPassword },
    create: {
      name: 'Lancet Specialized Hospital',
      description:
        'A major referral hospital in the Sidama region, providing a wide range of medical services and serving as a teaching center for Hawassa University.',
      city: 'Hawassa',
      imageUrl: 'https://img.semafor.com/a65644297a8e84eb692c88504ba4123a2e7e5679-1600x900.jpg?rect=200,0,1200,900&w=800&h=600&q=75&auto-format',
      contactEmail: 'admin@lancet.com',
      contactPhone: '+251-46-220-5576',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:30',
      endTime: '18:30',
      bookingWindow: 14,
      accountNumber: '7003546565',
      mustChangePassword: true,
    },
  });
  const hospital7 = await prisma.hospital.upsert({
    where: { contactEmail: 'admin@mekrez.com' },
    update: { password: hospitalPassword },
    create: {
      name: 'Mekrez Specialized Hospital',
      description:
        'A major referral hospital in the Sidama region, providing a wide range of medical services and serving as a teaching center for Hawassa University.',
      city: 'Addis Ababa',
      imageUrl: 'https://img.semafor.com/a65644297a8e84eb692c88504ba4123a2e7e5679-1600x900.jpg?rect=200,0,1200,900&w=800&h=600&q=75&auto-format',
      contactEmail: 'admin@mekrez.com',
      contactPhone: '+251-46-220-5576',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:30',
      endTime: '18:30',
      bookingWindow: 14,
      accountNumber: '7000067678',
      mustChangePassword: true,
    },
  });


  // --- Create Doctors ---
  const doctorPassword = await bcrypt.hash('password123', saltRounds);
  const doctor1 = await prisma.doctor.upsert({
    where: { contact: 'mulugeta.t@NibTena.com' },
    update: { password: doctorPassword },
    create: {
      name: 'Dr. Mulugeta Tesfaye',
      contact: 'mulugeta.t@NibTena.com',
      password: doctorPassword,
      specialty: 'Cardiology',
      imageUrl: 'https://media.istockphoto.com/id/2214934999/photo/african-american-male-nurse-or-doctor-in-blue-scrubs.webp?a=1&b=1&s=612x612&w=0&k=20&c=1ydf7CHwZ1eyHjvEB-ukk0Lb78WLzGGeBUKSUevB77c=',
      bio: 'Dr. Mulugeta is a senior cardiologist with over 15 years of experience in treating complex heart conditions. He is known for his patient-centric approach and dedication to cardiovascular health.',
      consultationFee: 2500,
      rating: 4.8,
      experience: 15,
      status: 'active',
      mustChangePassword: true,
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { contact: 'selamawit.b@NibTena.com' },
    update: { password: doctorPassword },
    create: {
      name: 'Dr. Selamawit Bekele',
      contact: 'selamawit.b@NibTena.com',
      password: doctorPassword,
      specialty: 'Dermatology',
      imageUrl: 'https://media.istockphoto.com/id/2200417032/photo/portrait-of-a-home-care-healthcare-worker.webp?a=1&b=1&s=612x612&w=0&k=20&c=MhFwwFMXuVsLfJ4k3_0V7bmkPDwA0foCX7CHnNtc1Bc=',
      bio: 'Dr. Selamawit specializes in both clinical and cosmetic dermatology. With 10 years of experience, she offers expert care for skin, hair, and nail disorders.',
      consultationFee: 1800,
      rating: 4.9,
      experience: 10,
      status: 'active',
      mustChangePassword: true,
    },
  });
  const doctor3 = await prisma.doctor.upsert({
    where: { contact: 'hawi.b@NibTena.com' },
    update: { password: doctorPassword },
    create: {
      name: 'Dr. Hawi B.',
      contact: 'hawi.b@NibTena.com',
      password: doctorPassword,
      specialty: 'Dermatology',
      imageUrl: 'https://media.istockphoto.com/id/2200417032/photo/portrait-of-a-home-care-healthcare-worker.webp?a=1&b=1&s=612x612&w=0&k=20&c=MhFwwFMXuVsLfJ4k3_0V7bmkPDwA0foCX7CHnNtc1Bc=',
      bio: 'Dr. Hawi B. specializes in both clinical and cosmetic dermatology. With 10 years of experience, she offers expert care for skin, hair, and nail disorders.',
      consultationFee: 1800,
      rating: 4.9,
      experience: 10,
      status: 'active',
      mustChangePassword: true,
    },
  });
  const doctor4 = await prisma.doctor.upsert({
    where: { contact: 'Nuhamin.b@NibTena.com' },
    update: { password: doctorPassword },
    create: {
      name: 'Dr. Nuhamin B.',
      contact: 'Nuhamin.b@NibTena.com',
      password: doctorPassword,
      specialty: 'Dermatology',
      imageUrl: 'https://media.istockphoto.com/id/2200417032/photo/portrait-of-a-home-care-healthcare-worker.webp?a=1&b=1&s=612x612&w=0&k=20&c=MhFwwFMXuVsLfJ4k3_0V7bmkPDwA0foCX7CHnNtc1Bc=',
      bio: 'Dr. Nuhamin B. specializes in both clinical and cosmetic dermatology. With 10 years of experience, she offers expert care for skin, hair, and nail disorders.',
      consultationFee: 1800,
      rating: 4.9,
      experience: 10,
      status: 'active',
      mustChangePassword: true,
    },
  });
  // --- Seed Permissions ---
  const corePermissions = [
    // Doctors
    { key: 'Doctors:View', name: 'View Doctors', category: 'Doctors', description: 'Can view doctor profiles and lists' },
    { key: 'Doctors:Create', name: 'Create Doctors', category: 'Doctors', description: 'Can add new doctors to the hospital' },
    { key: 'Doctors:Update', name: 'Update Doctors', category: 'Doctors', description: 'Can edit existing doctor details' },
    { key: 'Doctors:Delete', name: 'Delete Doctors', category: 'Doctors', description: 'Can remove doctors from the hospital' },
    // Appointments
    { key: 'Appointments:View', name: 'View Appointments', category: 'Appointments', description: 'Can view all appointments' },
    { key: 'Appointments:Create', name: 'Create Appointments', category: 'Appointments', description: 'Can book new appointments for patients' },
    { key: 'Appointments:Update', name: 'Update Appointments', category: 'Appointments', description: 'Can reschedule or change appointment details' },
    { key: 'Appointments:Cancel', name: 'Cancel Appointments', category: 'Appointments', description: 'Can cancel existing appointments' },
    // Queue
    { key: 'Queue:View', name: 'View Queue', category: 'Queue', description: 'Can view the live patient queue' },
    { key: 'Queue:Manage', name: 'Manage Queue', category: 'Queue', description: 'Can update patient status in the queue (e.g., check-in)' },
    // Schedules
    { key: 'Schedules:View', name: 'View Schedules', category: 'Schedules', description: 'Can view doctor schedules' },
    { key: 'Schedules:Manage', name: 'Manage Schedules', category: 'Schedules', description: 'Can create, update, and delete doctor schedules' },
    // Reports
    { key: 'Reports:View', name: 'View Reports', category: 'Reports', description: 'Can access and view all reports and analytics' },
    // Users & Roles
    { key: 'Users:View', name: 'View Users', category: 'Users', description: 'Can view staff users and their assigned roles' },
    { key: 'Users:Manage', name: 'Manage Users', category: 'Users', description: 'Can create, update, and delete staff users' },
    { key: 'Roles:View', name: 'View Roles', category: 'Roles', description: 'Can view roles and their permissions' },
    { key: 'Roles:Manage', name: 'Manage Roles', category: 'Roles', description: 'Can create, update, and delete roles and their permissions' },
    // Settings
    { key: 'Settings:View', name: 'View Settings', category: 'Settings', description: 'Can view hospital settings' },
    { key: 'Settings:Manage', name: 'Manage Settings', category: 'Settings', description: 'Can update hospital-wide settings' },
  ];

  for (const p of corePermissions) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: {
        name: p.name,
        category: p.category,
        description: p.description,
      },
      create: {
        key: p.key,
        name: p.name,
        category: p.category,
        description: p.description,
      },
    });
  }
 
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(`❌ Seeding failed:`, e);
    await prisma.$disconnect();
    process.exit(1);
  });
