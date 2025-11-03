
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
      imageUrl: "data:image/jpeg;base64,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",
      contactEmail: 'admin@tikuranbessa.com',
      contactPhone: '+251-11-551-1211',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:00',
      endTime: '19:00',
      bookingWindow: 30,
      accountNumber: 'ACCT-TAS-001',
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
      imageUrl: 'https://img.semafor.com/a65644297a8e84eb692c88504ba4123a2e7e5679-1600x900.jpg?rect=200,0,1200,900&w=800&h=600&q=75&auto=format',
      contactEmail: 'admin@hu.com',
      contactPhone: '+251-46-220-5576',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:30',
      endTime: '18:30',
      bookingWindow: 14,
      accountNumber: 'ACCT-HUCSH-003',
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
      imageUrl: 'https://img.semafor.com/a65644297a8e84eb692c88504ba4123a2e7e5679-1600x900.jpg?rect=200,0,1200,900&w=800&h=600&q=75&auto=format',
      contactEmail: 'admin@ethiotibeb.com',
      contactPhone: '+251-46-220-5576',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:30',
      endTime: '18:30',
      bookingWindow: 14,
      accountNumber: '7000023456',
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
      imageUrl: 'https://img.semafor.com/a65644297a8e84eb692c88504ba4123a2e7e5679-1600x900.jpg?rect=200,0,1200,900&w=800&h=600&q=75&auto=format',
      contactEmail: 'admin@lancet.com',
      contactPhone: '+251-46-220-5576',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:30',
      endTime: '18:30',
      bookingWindow: 14,
      accountNumber: '7003546565',
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
      imageUrl: 'https://img.semafor.com/a65644297a8e84eb692c88504ba4123a2e7e5679-1600x900.jpg?rect=200,0,1200,900&w=800&h=600&q=75&auto=format',
      contactEmail: 'admin@mekrez.com',
      contactPhone: '+251-46-220-5576',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:30',
      endTime: '18:30',
      bookingWindow: 14,
      accountNumber: '7000067678',
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
    },
  });
 
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
