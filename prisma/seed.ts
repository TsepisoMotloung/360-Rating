import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed Rating Categories
  console.log('Creating rating categories...');
  
  const categories = [
    { categoryName: 'Customer', sortOrder: 1 },
    { categoryName: 'Accountability', sortOrder: 2 },
    { categoryName: 'Trust', sortOrder: 3 },
    { categoryName: 'Care', sortOrder: 4 },
    { categoryName: 'Innovation', sortOrder: 5 },
  ];

  for (const category of categories) {
    await prisma.ratingCategory.upsert({
      where: { id: category.sortOrder },
      update: category,
      create: category,
    });
  }

  console.log('✅ Rating categories created');

  // Create a sample rating period
  console.log('Creating sample rating period...');
  
  const period = await prisma.ratingPeriod.upsert({
    where: { id: 1 },
    update: {},
    create: {
      periodName: 'Q4 2024 - 360 Review',
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-12-31'),
      isActive: true,
      createdBy: 'system',
    },
  });

  console.log('✅ Sample rating period created:', period.periodName);

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });