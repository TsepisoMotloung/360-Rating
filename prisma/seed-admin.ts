import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const bootstrapAdmin = 'tmotloung@alliance.co.ls';

  try {
    console.log('🔐 Starting administrator-only seed...');

    const existingAdmins = await prisma.tblAdministrators.findMany({ where: {}, take: 100 });
    const found = existingAdmins.find((a) => (a.Username || '').toLowerCase() === bootstrapAdmin.toLowerCase());
    if (found) {
      console.log(`ℹ️ Admin already present: ${found.Username} (ID=${found.AdministratorID})`);
      return;
    }

    if (existingAdmins.length === 0) {
      console.log('No admins present — creating bootstrap admin...');
    } else {
      console.log('Admins exist but bootstrap email not found — creating bootstrap admin row...');
    }

    const created = await prisma.tblAdministrators.create({
      data: { Username: bootstrapAdmin, Description: 'Bootstrap admin (seed-admin)', IsActive: 1 },
    });
    console.log(`✅ Created admin: ${created.Username} (ID=${created.AdministratorID})`);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
