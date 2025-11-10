const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hospitals = await prisma.hospital.findMany();
  const allPerms = await prisma.permission.findMany({ select: { id: true, key: true } });

  for (const h of hospitals) {
    const existingOwner = await prisma.role.findFirst({ where: { hospitalId: h.id, name: 'Owner' } });
    if (!existingOwner) {
      console.log(`Creating Owner role for hospital ${h.id} (${h.name})`);
      const owner = await prisma.role.create({ data: { name: 'Owner', hospitalId: h.id, isAdmin: true } });
      if (allPerms.length > 0) {
        const rp = allPerms.map(p => ({ roleId: owner.id, permissionId: p.id, allowed: true }));
        await prisma.rolePermission.createMany({ data: rp });
      }

      // assign to existing user with same email if present
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
    console.log('Done');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
