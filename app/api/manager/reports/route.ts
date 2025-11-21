import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { extractAuthParams } from '@/lib/params';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { uid, email } = extractAuthParams(searchParams as any);
    const reportType = searchParams.get('type') || 'assignments';

    if (!uid || !email) {
      return NextResponse.json({ error: 'Invalid or missing auth parameter' }, { status: 400 });
    }

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activePeriod = await prisma.ratingPeriod.findFirst({
      where: { isActive: true },
    });

    if (!activePeriod) {
      return NextResponse.json(
        { error: 'No active rating period' },
        { status: 404 }
      );
    }

    let csvContent = '';
    let filename = '';

    if (reportType === 'assignments') {
      // Export all manager's assignments
      const assignments = await prisma.managerAssignment.findMany({
        where: {
          managerId: validation.managerId,
          ratingPeriodId: activePeriod.id,
        },
        include: {
          rater: { select: { FName: true, Surname: true } },
          ratee: { select: { FName: true, Surname: true } },
        },
      });

      const headers = [
        'Rater Email',
        'Rater Name',
        'Rater Position',
        'Ratee Email',
        'Ratee Name',
        'Ratee Position',
        'Relationship',
        'Status',
        'Completed Date',
      ];
      csvContent = headers.join(',') + '\n';

      const relationshipMap = ['Peer', 'Supervisor', 'Manager', 'Subordinate'];
      assignments.forEach((a) => {
        const raterName = `${a.rater.FName || ''} ${a.rater.Surname || ''}`.trim();
        const rateeName = `${a.ratee.FName || ''} ${a.ratee.Surname || ''}`.trim();
        const relationship = (a.relationship && relationshipMap[a.relationship - 1]) || 'Unknown';
        const status = a.isCompleted ? 'Completed' : 'Pending';
        const completedDate = a.dateCompleted ? new Date(a.dateCompleted).toLocaleDateString() : '';

        const row = [
          a.raterEmail,
          raterName,
          a.raterPosition || '',
          a.rateeEmail,
          rateeName,
          a.rateePosition || '',
          relationship,
          status,
          completedDate,
        ];
        csvContent += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',') + '\n';
      });

      filename = `manager-assignments-${Date.now()}.csv`;
    } else {
      // Export all responses for manager's assignments
      const responses = await prisma.managerResponse.findMany({
        where: {
          assignment: {
            managerId: validation.managerId,
            ratingPeriodId: activePeriod.id,
          },
        },
        include: {
          assignment: {
            include: {
              rater: { select: { FName: true, Surname: true } },
              ratee: { select: { FName: true, Surname: true } },
            },
          },
          category: { select: { categoryName: true } },
        },
      });

      const headers = [
        'Rater Email',
        'Rater Name',
        'Ratee Email',
        'Ratee Name',
        'Category',
        'Rating',
        'Comment',
      ];
      csvContent = headers.join(',') + '\n';

      responses.forEach((r) => {
        const raterName = `${r.assignment.rater.FName || ''} ${r.assignment.rater.Surname || ''}`.trim();
        const rateeName = `${r.assignment.ratee.FName || ''} ${r.assignment.ratee.Surname || ''}`.trim();

        const row = [
          r.assignment.raterEmail,
          raterName,
          r.assignment.rateeEmail,
          rateeName,
          r.category.categoryName,
          String(r.ratingValue),
          r.comment || '',
        ];
        csvContent += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',') + '\n';
      });

      filename = `manager-responses-${Date.now()}.csv`;
    }

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating manager report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
