import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const uid = form.get('uid')?.toString() || null;
    const email = form.get('email')?.toString() || null;
    const periodIdRaw = form.get('periodId')?.toString() || null;

    const file = form.get('file') as any;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) {
      return NextResponse.json({ error: 'Empty CSV' }, { status: 400 });
    }

    const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const raterIdx = header.indexOf('rateremail');
    const rateeIdx = header.indexOf('rateeemail');
    const relIdx = header.indexOf('relationship');
    if (raterIdx === -1 || rateeIdx === -1) {
      return NextResponse.json({ error: 'CSV must have headers: raterEmail, rateeEmail' }, { status: 400 });
    }

    // Determine target period
    let targetPeriodId: number | null = periodIdRaw ? parseInt(periodIdRaw, 10) : null;
    if (!targetPeriodId) {
      const active = await prisma.ratingPeriod.findFirst({ where: { isActive: true } });
      if (active) targetPeriodId = active.id;
    }
    if (!targetPeriodId) {
      return NextResponse.json({ error: 'No target rating period available' }, { status: 400 });
    }

    const results = { created: 0, skipped: 0, errors: [] as Array<{ index: number; reason: string }> };
    const failedRows: Array<{ index: number; reason: string; row: any }> = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c: string) => c.trim());
      const raterEmail = cols[raterIdx];
      const rateeEmail = cols[rateeIdx];
      const rel = relIdx !== -1 && cols[relIdx] ? parseInt(cols[relIdx], 10) : null;

      if (!raterEmail || !rateeEmail) {
        results.errors.push({ index: i - 1, reason: 'Missing rater or ratee email' });
        failedRows.push({ index: i - 1, reason: 'Missing rater or ratee email', row: { raterEmail, rateeEmail, relationship: rel } });
        continue;
      }

      if (!rel || rel < 1 || rel > 4) {
        results.errors.push({ index: i - 1, reason: 'Missing or invalid relationship (1-4)' });
        failedRows.push({ index: i - 1, reason: 'Missing or invalid relationship (1-4)', row: { raterEmail, rateeEmail, relationship: rel } });
        continue;
      }

      const raterVal = await validateUser(null, raterEmail);
      const rateeVal = await validateUser(null, rateeEmail);

      if (!raterVal.isValid || !raterVal.userId) {
        results.errors.push({ index: i - 1, reason: `Rater not found: ${raterEmail}` });
        failedRows.push({ index: i - 1, reason: `Rater not found: ${raterEmail}`, row: { raterEmail, rateeEmail, relationship: rel } });
        continue;
      }
      if (!rateeVal.isValid || !rateeVal.userId) {
        results.errors.push({ index: i - 1, reason: `Ratee not found: ${rateeEmail}` });
        failedRows.push({ index: i - 1, reason: `Ratee not found: ${rateeEmail}`, row: { raterEmail, rateeEmail, relationship: rel } });
        continue;
      }

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

      await prisma.ratingAssignment.create({
        data: {
          ratingPeriodId: targetPeriodId,
          raterUserId: raterVal.userId,
          raterEmail,
          rateeUserId: rateeVal.userId,
          rateeEmail,
          isCompleted: false,
          relationship: rel,
        },
      });

      results.created++;
    }

    return NextResponse.json({ success: true, results, failedRows });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 });
  }
}

export { POST as PUT };
