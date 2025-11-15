import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
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

    // Total raters and assignments
    const assignments = await prisma.ratingAssignment.findMany({
      where: { ratingPeriodId: activePeriod.id },
      select: {
        raterUserId: true,
        isCompleted: true,
      },
    });

    const uniqueRaters = new Set(assignments.map(a => a.raterUserId)).size;
    const completedCount = assignments.filter(a => a.isCompleted).length;

    // Average scores by category
    const categoryAverages = await prisma.$queryRaw<Array<{
      CategoryName: string;
      AverageScore: number;
      ResponseCount: number;
    }>>`
      SELECT 
        c.CategoryName,
        AVG(r.RatingValue) as AverageScore,
        COUNT(r.ResponseID) as ResponseCount
      FROM tblRatingResponse r
      INNER JOIN tblRatingAssignment a ON r.AssignmentID = a.AssignmentID
      INNER JOIN tblRatingCategory c ON r.CategoryID = c.CategoryID
      WHERE a.RatingPeriodID = ${activePeriod.id}
      GROUP BY c.CategoryName, c.SortOrder
      ORDER BY c.SortOrder
    `;

    // Top rated individuals
    const topRated = await prisma.$queryRaw<Array<{
      RateeEmail: string;
      AverageScore: number;
      RatingCount: number;
    }>>`
      SELECT 
        a.RateeEmail,
        AVG(r.RatingValue) as AverageScore,
        COUNT(DISTINCT r.AssignmentID) as RatingCount
      FROM tblRatingResponse r
      INNER JOIN tblRatingAssignment a ON r.AssignmentID = a.AssignmentID
      WHERE a.RatingPeriodID = ${activePeriod.id}
      GROUP BY a.RateeEmail
      HAVING COUNT(DISTINCT r.AssignmentID) > 0
      ORDER BY AverageScore DESC
      LIMIT 10
    `;

    // Bottom rated individuals
    const bottomRated = await prisma.$queryRaw<Array<{
      RateeEmail: string;
      AverageScore: number;
      RatingCount: number;
    }>>`
      SELECT 
        a.RateeEmail,
        AVG(r.RatingValue) as AverageScore,
        COUNT(DISTINCT r.AssignmentID) as RatingCount
      FROM tblRatingResponse r
      INNER JOIN tblRatingAssignment a ON r.AssignmentID = a.AssignmentID
      WHERE a.RatingPeriodID = ${activePeriod.id}
      GROUP BY a.RateeEmail
      HAVING COUNT(DISTINCT r.AssignmentID) > 0
      ORDER BY AverageScore ASC
      LIMIT 10
    `;

    // Progress over time
    const progressOverTime = await prisma.$queryRaw<Array<{
      CompletionDate: Date;
      CompletedCount: number;
    }>>`
      SELECT 
        DATE(DateCompleted) as CompletionDate,
        COUNT(*) as CompletedCount
      FROM tblRatingAssignment
      WHERE RatingPeriodID = ${activePeriod.id}
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
      categoryAverages,
      topRated,
      bottomRated,
      progressOverTime,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}