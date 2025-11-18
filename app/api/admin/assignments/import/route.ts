import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';

type Assignment = { raterEmail: string; rateeEmail: string; relationship?: number };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, assignments, periodId } = body as {
      uid?: string;
      email?: string;
      assignments?: Assignment[];
      periodId?: number;
    };

    const validation = await validateUser(uid ?? null, email ?? null);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'No assignments provided' }, { status: 400 });
    }

    // Determine target period
    let targetPeriodId = periodId ?? null;
    if (!targetPeriodId) {
      const active = await prisma.ratingPeriod.findFirst({ where: { isActive: true } });
      if (active) targetPeriodId = active.id;
    }

    if (!targetPeriodId) {
      return NextResponse.json({ error: 'No target rating period available' }, { status: 400 });
    }

    const results: {
      created: number;
      skipped: number;
      errors: Array<{ index: number; reason: string }>;
    } = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      if (!a || !a.raterEmail || !a.rateeEmail) {
        results.errors.push({ index: i, reason: 'Invalid item format' });
        continue;
      }

      // relationship must be provided (1-4)
      const rel = typeof a.relationship === 'number' ? a.relationship : null;
      if (!rel || rel < 1 || rel > 4) {
        results.errors.push({ index: i, reason: 'Missing or invalid relationship (1-4)' });
        continue;
      }

      // Resolve canonical users
      const raterVal = await validateUser(null, a.raterEmail);
      const rateeVal = await validateUser(null, a.rateeEmail);

      if (!raterVal.isValid || !raterVal.userId) {
        results.errors.push({ index: i, reason: `Rater not found: ${a.raterEmail}` });
        continue;
      }
      if (!rateeVal.isValid || !rateeVal.userId) {
        results.errors.push({ index: i, reason: `Ratee not found: ${a.rateeEmail}` });
        continue;
      }

      // Check duplicate
      const exists = await prisma.ratingAssignment.findFirst({
        where: {
          ratingPeriodId: targetPeriodId,
          raterUserId: raterVal.userId,
          rateeUserId: rateeVal.userId,
        },
      });

      if (exists) {
        results.skipped++;
        continue;
      }

      // Create assignment
      await prisma.ratingAssignment.create({
        data: {
          ratingPeriodId: targetPeriodId,
          raterUserId: raterVal.userId,
          raterEmail: a.raterEmail,
          rateeUserId: rateeVal.userId,
          rateeEmail: a.rateeEmail,
          isCompleted: false,
          relationship: rel,
        },
      });

      results.created++;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import assignments' }, { status: 500 });
  }
}

export { POST as PUT };
