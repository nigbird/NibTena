
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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
      update: { name: p.name, category: p.category, description: p.description },
      create: { key: p.key, name: p.name, category: p.category, description: p.description },
    });
    console.log('Upserted permission', p.key);
  }
}

main()
  .then(async () => {
    console.log('Done');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
