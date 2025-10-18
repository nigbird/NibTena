import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log(`🌱 Start seeding ...`);
  const saltRounds = 10;

  // --- Create Super Admin ---
  const superAdminPassword = await bcrypt.hash('Admin@123', saltRounds);
  const superAdmin = await prisma.superAdmin.upsert({
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
  const hospital1 = await prisma.hospital.upsert({
    where: { contactEmail: 'admin@tikuranbessa.com' },
    update: { password: hospitalPassword },
    create: {
      name: 'Tikur Anbessa Specialized Hospital',
      description:
        'A leading public hospital in Addis Ababa, providing comprehensive healthcare services and medical education. It is the largest specialized hospital in Ethiopia.',
      city: 'Addis Ababa',
      imageId: 'hospital-1',
      contactEmail: 'admin@tikuranbessa.com',
      contactPhone: '+251-11-551-1211',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:00',
      endTime: '20:00',
      bookingWindow: 30,
      accountNumber: 'ACCT-TASH-001',
    },
  });

  const hospital2 = await prisma.hospital.upsert({
    where: { contactEmail: 'admin@sphmmc.com' },
    update: { password: hospitalPassword },
    create: {
      name: "St. Paul's Hospital Millennium Medical College",
      description:
        'A specialized teaching hospital in Addis Ababa, known for its advanced medical training and patient care services in various fields.',
      city: 'Addis Ababa',
      imageId: 'hospital-2',
      contactEmail: 'admin@sphmmc.com',
      contactPhone: '+251-11-275-0125',
      password: hospitalPassword,
      status: 'active',
      startTime: '08:00',
      endTime: '19:00',
      bookingWindow: 21,
      accountNumber: 'ACCT-SPHMMC-002',
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
      imageId: 'hospital-3',
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
      imageId: 'doctor-1',
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
      imageId: 'doctor-2',
      bio: 'Dr. Selamawit specializes in both clinical and cosmetic dermatology. With 10 years of experience, she offers expert care for skin, hair, and nail disorders.',
      consultationFee: 1800,
      rating: 4.9,
      experience: 10,
      status: 'active',
    },
  });

  // ... (rest of the doctors remain unchanged)
  // You can keep all your doctor3–doctor8 and relations as they were.

  console.log(`✅ Seeding finished.`);
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
