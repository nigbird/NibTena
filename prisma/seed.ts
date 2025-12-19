
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;

  // --- Create Super Admin ---
  const superAdminPassword = await bcrypt.hash('Admin@123', saltRounds);
  await prisma.superAdmin.upsert({
    where: { email: 'superadmin@NibTena.com' },
    update: { password: superAdminPassword, role: 'both' },
    create: {
      email: 'superadmin@NibTena.com',
      name: 'Super Admin',
      password: superAdminPassword,
      role: 'both',
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
      address: 'Churchill Ave, Addis Ababa',
      ownerName: 'Dr. Alemayehu Teklu',
      ownerPhone: '0911123456',
      bankDistrict: 'Addis Ababa Central',
      bankBranch: 'Main Branch',
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
      address: 'Main Campus, Hawassa',
      ownerName: 'Mr. Fikadu Wondimu',
      ownerPhone: '0916123456',
      bankDistrict: 'Southern Region',
      bankBranch: 'Hawassa City Branch',
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
      address: 'Bole Sub-city, Addis Ababa',
      ownerName: 'Mrs. Fatuma Mohammed',
      ownerPhone: '0911789012',
      bankDistrict: 'Addis Ababa East',
      bankBranch: 'Bole Branch',
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
      address: 'Kebele 05, Hawassa',
      ownerName: 'Dr. Tadesse Birhanu',
      ownerPhone: '0916234567',
      bankDistrict: 'Southern Region',
      bankBranch: 'Lancet Hawassa Branch',
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
      address: 'Kirkos Sub-city, Addis Ababa',
      ownerName: 'Mr. Daniel Abebe',
      ownerPhone: '0911345678',
      bankDistrict: 'Addis Ababa West',
      bankBranch: 'Kirkos Branch',
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
    { key: 'Queue:Update', name: 'Update Queue', category: 'Queue', description: 'Can update patient status in the queue (e.g., check-in)' },
    // Schedules
    { key: 'Schedules:View', name: 'View Schedules', category: 'Schedules', description: 'Can view doctor schedules' },
    { key: 'Schedules:Create', name: 'Create Schedules', category: 'Schedules', description: 'Can create doctor schedules' },
    { key: 'Schedules:Update', name: 'Update Schedules', category: 'Schedules', description: 'Can update existing doctor schedules' },
    { key: 'Schedules:Delete', name: 'Delete Schedules', category: 'Schedules', description: 'Can delete doctor schedules' },
    // Reports
    { key: 'Reports:View', name: 'View Reports', category: 'Reports', description: 'Can access and view all reports and analytics' },
    // Dashboard
    { key: 'Dashboard:View', name: 'View Dashboard', category: 'Dashboard', description: 'Can access the hospital dashboard' },
    // Users & Roles
    { key: 'Users:View', name: 'View Users', category: 'Users', description: 'Can view staff users and their assigned roles' },
    { key: 'Users:Create', name: 'Create Users', category: 'Users', description: 'Can create staff users' },
    { key: 'Users:Update', name: 'Update Users', category: 'Users', description: 'Can update staff users' },
    { key: 'Users:Delete', name: 'Delete Users', category: 'Users', description: 'Can delete staff users' },
    { key: 'Roles:View', name: 'View Roles', category: 'Roles', description: 'Can view roles and their permissions' },
    { key: 'Roles:Create', name: 'Create Roles', category: 'Roles', description: 'Can create roles and assign permissions' },
    { key: 'Roles:Update', name: 'Update Roles', category: 'Roles', description: 'Can update roles and their permissions' },
    { key: 'Roles:Delete', name: 'Delete Roles', category: 'Roles', description: 'Can delete roles' },
    // Settings
    { key: 'Settings:View', name: 'View Settings', category: 'Settings', description: 'Can view hospital settings' },
    { key: 'Settings:Update', name: 'Update Settings', category: 'Settings', description: 'Can update hospital-wide settings and data' },
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
  
  // --- Create Owner roles for each hospital and grant all permissions ---
  const hospitals = await prisma.hospital.findMany();
  const allPerms = await prisma.permission.findMany({ select: { id: true } });

  for (const h of hospitals) {
    const existingOwner = await prisma.role.findFirst({ where: { hospitalId: h.id, name: 'Owner' } });
    if (!existingOwner) {
      console.log(`Creating Owner role for hospital ${h.id} (${h.name})`);
      const owner = await prisma.role.create({ data: { name: 'Owner', hospitalId: h.id, isAdmin: true } });
      if (allPerms.length > 0) {
        const rp = allPerms.map(p => ({ roleId: owner.id, permissionId: p.id, allowed: true }));
        await prisma.rolePermission.createMany({ data: rp });
      }

      // If a user exists with the hospital contact email, assign the Owner role to them
      const user = await prisma.user.findUnique({ where: { email: h.contactEmail } });
      if (user) {
        console.log(`Assigning Owner role to user ${user.email}`);
        await prisma.user.update({ where: { id: user.id }, data: { roleId: owner.id } });
      }
    } else {
      console.log(`Hospital ${h.id} already has Owner role (id=${existingOwner.id})`);
    }
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
