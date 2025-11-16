import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Check if categories already exist
    const existingCategories = await prisma.ratingCategory.count();
    
    if (existingCategories === 0) {
      console.log('Creating rating categories...');
      
      const categories = [
        { categoryName: 'Customer', sortOrder: 1 },
        { categoryName: 'Accountability', sortOrder: 2 },
        { categoryName: 'Trust', sortOrder: 3 },
        { categoryName: 'Care', sortOrder: 4 },
        { categoryName: 'Innovation', sortOrder: 5 },
      ];

      // Use createMany for better performance
      await prisma.ratingCategory.createMany({
        data: categories,
        skipDuplicates: true,
      });

      console.log('✅ Rating categories created');
    } else {
      console.log(`ℹ️  ${existingCategories} rating categories already exist, skipping...`);
    }

    // Check if rating period already exists
    const existingPeriod = await prisma.ratingPeriod.findFirst({
      where: { periodName: 'Q4 2024 - 360 Review' }
    });

    if (!existingPeriod) {
      console.log('Creating sample rating period...');
      
      const period = await prisma.ratingPeriod.create({
        data: {
          periodName: 'Q4 2024 - 360 Review',
          startDate: new Date('2024-11-01'),
          endDate: new Date('2024-12-31'),
          isActive: true,
          createdBy: 'system',
        },
      });

      console.log('✅ Sample rating period created:', period.periodName);
    } else {
      console.log('ℹ️  Rating period already exists, skipping...');
    }

    // Check existing users
    const userCount = await prisma.tblUser.count();
    console.log(`📊 Found ${userCount} users in tblUser`);

    if (userCount === 0) {
      console.log('⚠️  Warning: No users found in tblUser. Please ensure your existing user data is present.');
    } else {
      // Show sample of users
      const sampleUsers = await prisma.tblUser.findMany({
        take: 5,
        select: {
          UserID: true,
          Username: true,
          FName: true,
          Surname: true,
        }
      });
      console.log('Sample users:', sampleUsers);
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });