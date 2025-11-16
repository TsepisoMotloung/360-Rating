/**
 * Import Rating Assignments Script
 * 
 * This script imports rating assignments from CSV or JSON file
 * Usage: npx tsx scripts/import-assignments.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface AssignmentData {
  raterEmail: string;
  rateeEmail: string;
}

async function importAssignments() {
  console.log('📥 Starting assignment import...');

  try {
    // Get active period
    const activePeriod = await prisma.ratingPeriod.findFirst({
      where: { isActive: true },
      orderBy: { dateCreated: 'desc' },
    });

    if (!activePeriod) {
      console.error('❌ No active rating period found. Please create one first.');
      process.exit(1);
    }

    console.log(`✅ Using period: ${activePeriod.periodName} (ID: ${activePeriod.id})`);

    // Read assignments from JSON file
    const assignmentsFile = path.join(process.cwd(), 'data', 'assignments.json');
    
    if (!fs.existsSync(assignmentsFile)) {
      console.error(`❌ File not found: ${assignmentsFile}`);
      console.log('💡 Create data/assignments.json with format:');
      console.log(`[
  { "raterEmail": "user1@alliance.co.ls", "rateeEmail": "manager1@alliance.co.ls" },
  { "raterEmail": "user2@alliance.co.ls", "rateeEmail": "manager1@alliance.co.ls" }
]`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(assignmentsFile, 'utf-8');
    const assignments: AssignmentData[] = JSON.parse(fileContent);

    console.log(`📊 Found ${assignments.length} assignments to import`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const assignment of assignments) {
      try {
        const { raterEmail, rateeEmail } = assignment;

        // Get rater user
        const rater = await prisma.tblUser.findFirst({
          where: { Username: raterEmail },
          select: { UserID: true },
        });

        if (!rater) {
          console.warn(`⚠️  Rater not found: ${raterEmail}`);
          errorCount++;
          continue;
        }

        // Get ratee user
        const ratee = await prisma.tblUser.findFirst({
          where: { Username: rateeEmail },
          select: { UserID: true },
        });

        if (!ratee) {
          console.warn(`⚠️  Ratee not found: ${rateeEmail}`);
          errorCount++;
          continue;
        }

        // Check if assignment already exists
        const existing = await prisma.ratingAssignment.findFirst({
          where: {
            ratingPeriodId: activePeriod.id,
            raterUserId: rater.id,
            rateeUserId: ratee.id,
          },
        });

        if (existing) {
          skipCount++;
          continue;
        }

        // Create assignment
        await prisma.ratingAssignment.create({
          data: {
            ratingPeriodId: activePeriod.id,
            raterUserId: rater.id,
            raterEmail,
            rateeUserId: ratee.id,
            rateeEmail,
            isCompleted: false,
          },
        });

        successCount++;
        
        // Progress indicator
        if (successCount % 10 === 0) {
          console.log(`📝 Imported ${successCount} assignments...`);
        }
      } catch (error) {
        console.error(`❌ Error importing assignment:`, error);
        errorCount++;
      }
    }

    console.log('\n✅ Import completed!');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`⏭️  Skipped (duplicates): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Sample assignment data generator
async function generateSampleData() {
  console.log('🎲 Generating sample assignment data...');

  const users = await prisma.tblUser.findMany({
    where: {
      username: { endsWith: '@alliance.co.ls' },
    },
    select: {
      id: true,
      username: true,
    },
    take: 20,
  });

  if (users.length < 2) {
    console.error('❌ Not enough users found in database');
    process.exit(1);
  }

  // Generate sample assignments
  const assignments: AssignmentData[] = [];
  
  // Each manager (first 5 users) gets rated by others
  const managers = users.slice(0, 5);
  const raters = users.slice(5);

  for (const manager of managers) {
    for (const rater of raters) {
      if (manager.username && rater.username) {
        assignments.push({
          rateeEmail: manager.username,
          raterEmail: rater.username,
        });
      }
    }
  }

  // Save to file
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const outputFile = path.join(dataDir, 'assignments.json');
  fs.writeFileSync(outputFile, JSON.stringify(assignments, null, 2));

  console.log(`✅ Generated ${assignments.length} sample assignments`);
  console.log(`📄 Saved to: ${outputFile}`);
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--generate')) {
  generateSampleData().then(() => process.exit(0));
} else {
  importAssignments().then(() => process.exit(0));
}