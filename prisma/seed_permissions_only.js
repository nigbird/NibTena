const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const corePermissions = [
    { key: 'DOCTOR_MANAGE', name: 'Doctor Management', category: 'Doctors', description: 'Create, update, delete, and view doctors' },
    { key: 'APPOINTMENT_MANAGE', name: 'Appointment Management', category: 'Appointments', description: 'Create, update and view appointments' },
    { key: 'QUEUE_MANAGE', name: 'Queue Management', category: 'Queue', description: 'Manage patient flow and queue' },
    { key: 'SCHEDULE_MANAGE', name: 'Schedule Management', category: 'Schedules', description: 'Manage doctors schedules' },
  { key: 'SCHEDULE_CREATE', name: 'Schedule Create', category: 'Schedules', description: 'Create new schedules for doctors' },
  { key: 'SCHEDULE_EDIT', name: 'Schedule Edit', category: 'Schedules', description: 'Edit existing doctor schedules' },
  { key: 'SCHEDULE_DELETE', name: 'Schedule Delete', category: 'Schedules', description: 'Delete doctor schedules' },
    { key: 'REPORTS_VIEW', name: 'Reports & Dashboard', category: 'Reports', description: 'View and generate analytics and reports' },
    { key: 'USER_MANAGE', name: 'User Management', category: 'Users', description: 'Create and manage staff users and roles' },
    { key: 'SETTINGS_MANAGE', name: 'Settings Management', category: 'Settings', description: 'Manage hospital general settings and configuration' },
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
