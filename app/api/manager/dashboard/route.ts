import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { extractAuthParams } from '@/lib/params';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { uid, email } = extractAuthParams(searchParams as any);

    if (!uid || !email) {
      return NextResponse.json({ error: 'Invalid or missing auth parameter' }, { status: 400 });
    }

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active period
    const activePeriod = await prisma.ratingPeriod.findFirst({
      where: { isActive: true },
      orderBy: { dateCreated: 'desc' },
    });

    if (!activePeriod) {
      return NextResponse.json({
        message: 'No active period',
        stats: null,
      });
    }

    // Get manager's assignments only
    const assignments = await prisma.managerAssignment.findMany({
      where: { 
        managerId: validation.managerId,
        ratingPeriodId: activePeriod.id,
      },
      select: {
        raterUserId: true,
        isCompleted: true,
      },
    });

    const uniqueRaters = new Set(assignments.map(a => a.raterUserId)).size;
    const completedCount = assignments.filter(a => a.isCompleted).length;

    // Average scores by category (for manager's assignments)
    const categoryAverages = await prisma.$queryRaw<Array<{
      CategoryName: string;
      AverageScore: number;
      ResponseCount: bigint;
    }>>`
      SELECT 
        c.CategoryName,
        AVG(r.RatingValue) as AverageScore,
        COUNT(r.ManagerResponseID) as ResponseCount
      FROM Timesheet.tblManagerResponse r
      INNER JOIN Timesheet.tblManagerAssignment ma ON r.ManagerAssignmentID = ma.ManagerAssignmentID
      INNER JOIN Timesheet.tblRatingCategory c ON r.CategoryID = c.CategoryID
      WHERE ma.ManagerID = ${validation.managerId}
        AND ma.RatingPeriodID = ${activePeriod.id}
      GROUP BY c.CategoryName, c.SortOrder
      ORDER BY c.SortOrder
    `;

    // Top rated individuals (in manager's assignments)
    const topRated = await prisma.$queryRaw<Array<{
      rateeEmail: string;
      AverageScore: number;
      RatingCount: bigint;
    }>>`
      SELECT 
        ma.RateeEmail as rateeEmail,
        AVG(r.RatingValue) as AverageScore,
        COUNT(DISTINCT r.ManagerAssignmentID) as RatingCount
      FROM Timesheet.tblManagerResponse r
      INNER JOIN Timesheet.tblManagerAssignment ma ON r.ManagerAssignmentID = ma.ManagerAssignmentID
      WHERE ma.ManagerID = ${validation.managerId}
        AND ma.RatingPeriodID = ${activePeriod.id}
      GROUP BY ma.RateeEmail
      HAVING COUNT(DISTINCT r.ManagerAssignmentID) > 0
      ORDER BY AverageScore DESC
      LIMIT 10
    `;

    // Bottom rated individuals (in manager's assignments)
    const bottomRated = await prisma.$queryRaw<Array<{
      rateeEmail: string;
      AverageScore: number;
      RatingCount: bigint;
    }>>`
      SELECT 
        ma.RateeEmail as rateeEmail,
        AVG(r.RatingValue) as AverageScore,
        COUNT(DISTINCT r.ManagerAssignmentID) as RatingCount
      FROM Timesheet.tblManagerResponse r
      INNER JOIN Timesheet.tblManagerAssignment ma ON r.ManagerAssignmentID = ma.ManagerAssignmentID
      WHERE ma.ManagerID = ${validation.managerId}
        AND ma.RatingPeriodID = ${activePeriod.id}
      GROUP BY ma.RateeEmail
      HAVING COUNT(DISTINCT r.ManagerAssignmentID) > 0
      ORDER BY AverageScore ASC
      LIMIT 10
    `;

    // Progress over time (manager's assignments)
    const progressOverTime = await prisma.$queryRaw<Array<{
      CompletionDate: Date;
      CompletedCount: bigint;
    }>>`
      SELECT 
        DATE(DateCompleted) as CompletionDate,
        COUNT(*) as CompletedCount
      FROM Timesheet.tblManagerAssignment
      WHERE ManagerID = ${validation.managerId}
        AND RatingPeriodID = ${activePeriod.id}
        AND IsCompleted = 1
        AND DateCompleted IS NOT NULL
      GROUP BY DATE(DateCompleted)
      ORDER BY CompletionDate
    `;

    return NextResponse.json({
      period: {
        PeriodName: activePeriod.periodName,
      },
      stats: {
        totalRaters: uniqueRaters,
        totalAssignments: assignments.length,
        completedAssignments: completedCount,
        pendingAssignments: assignments.length - completedCount,
      },
      categoryAverages: categoryAverages.map(c => ({
        ...c,
        ResponseCount: Number(c.ResponseCount),
      })),
      topRated: topRated.map(t => ({
        ...t,
        RatingCount: Number(t.RatingCount),
      })),
      bottomRated: bottomRated.map(b => ({
        ...b,
        RatingCount: Number(b.RatingCount),
      })),
      progressOverTime: progressOverTime.map(p => ({
        ...p,
        CompletedCount: Number(p.CompletedCount),
      })),
    });
  } catch (error) {
    console.error('Error fetching manager dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
