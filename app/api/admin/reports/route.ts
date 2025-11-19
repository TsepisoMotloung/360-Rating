import { NextRequest } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { extractAuthParams } from '@/lib/params';

function escapeCsv(value: any) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { uid, email } = extractAuthParams(searchParams as any);
    const type = (searchParams.get('type') || 'assignments').toLowerCase();
    const periodIdParam = searchParams.get('periodId');

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Resolve period
    let targetPeriodId = periodIdParam ? parseInt(periodIdParam) : null;
    if (!targetPeriodId) {
      const active = await prisma.ratingPeriod.findFirst({ where: { isActive: true } });
      if (active) targetPeriodId = active.id;
    }
    if (!targetPeriodId) {
      return new Response('No active period found', { status: 400 });
    }

    const period = await prisma.ratingPeriod.findUnique({ where: { id: targetPeriodId } });
    const periodLabel = period ? period.periodName.replace(/[^a-z0-9-_]/gi, '_') : `period_${targetPeriodId}`;

    let csv = '';
    let filename = `report-${type}-${periodLabel}.csv`;

    if (type === 'assignments') {
      const assignments = await prisma.ratingAssignment.findMany({
        where: { ratingPeriodId: targetPeriodId },
        orderBy: [{ rateeEmail: 'asc' }, { raterEmail: 'asc' }],
      });

      const headers = [
        'AssignmentID',
        'RatingPeriodID',
        'RaterUserID',
        'RaterEmail',
        'RateeUserID',
        'RateeEmail',
        'IsCompleted',
        'DateCompleted',
        'CreatedDate',
      ];

      csv += headers.join(',') + '\n';
      for (const a of assignments) {
        const row = [
          a.id,
          a.ratingPeriodId,
          a.raterUserId,
          a.raterEmail,
          a.rateeUserId,
          a.rateeEmail,
          a.isCompleted ? '1' : '0',
          a.dateCompleted ? a.dateCompleted.toISOString() : '',
          a.createdDate ? a.createdDate.toISOString() : '',
        ].map(escapeCsv);
        csv += row.join(',') + '\n';
      }
    } else if (type === 'responses' || type === 'ratings') {
      // Export individual responses with category name
      const responses = await prisma.ratingResponse.findMany({
        where: { assignment: { ratingPeriodId: targetPeriodId } },
        include: { assignment: true, category: true },
        orderBy: [{ assignment: { rateeEmail: 'asc' } }, { assignment: { raterEmail: 'asc' } }, { category: { sortOrder: 'asc' } }],
      });

      const headers = [
        'ResponseID',
        'AssignmentID',
        'RatingPeriodID',
        'RaterUserID',
        'RaterEmail',
        'RateeUserID',
        'RateeEmail',
        'CategoryID',
        'CategoryName',
        'RatingValue',
        'Comment',
        'UpdatedDate',
      ];

      csv += headers.join(',') + '\n';
      for (const r of responses) {
        const row = [
          r.id,
          r.assignmentId,
          r.assignment.ratingPeriodId,
          r.assignment.raterUserId,
          r.assignment.raterEmail,
          r.assignment.rateeUserId,
          r.assignment.rateeEmail,
          r.categoryId,
          r.category ? r.category.categoryName : '',
          r.ratingValue,
          r.comment || '',
          r.updatedDate ? r.updatedDate.toISOString() : '',
        ].map(escapeCsv);
        csv += row.join(',') + '\n';
      }
    } else {
      return new Response('Invalid report type', { status: 400 });
    }

    // Log the report export
    try {
      await prisma.adminReportsLog.create({
        data: { adminEmail: validation.email || email || 'unknown', reportType: type },
      });
    } catch (err) {
      console.error('Failed to log report export', err);
    }

    const headers = new Headers();
    headers.set('Content-Type', 'text/csv; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new Response(csv, { status: 200, headers });
  } catch (error) {
    console.error('Error generating report:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
