const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node scripts/inspect-user.js <email>');
    process.exit(2);
  }

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, password: true, mustChangePassword: true, tokenVersion: true, hospitalId: true, roleId: true } });
    const hospital = await prisma.hospital.findUnique({ where: { contactEmail: email }, select: { id: true, contactEmail: true, name: true, password: true, mustChangePassword: true, tokenVersion: true } });

    console.log('User record:', user);
    console.log('Hospital record (by contactEmail):', hospital);

    if (!user && !hospital) {
      console.log('No user or hospital found with that email.');
    }
  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
