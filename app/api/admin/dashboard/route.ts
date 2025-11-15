import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
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

    const pool = await getConnection();

    // Get active period
    const periodResult = await pool.request().query(`
      SELECT TOP 1 RatingPeriodID, PeriodName
      FROM tblRatingPeriod
      WHERE IsActive = 1
      ORDER BY DateCreated DESC
    `);

    if (periodResult.recordset.length === 0) {
      return NextResponse.json({
        message: 'No active period',
        stats: null,
      });
    }

    const activePeriod = periodResult.recordset[0];

    // Total raters and assignments
    const assignmentStats = await pool
      .request()
      .input('periodId', sql.Int, activePeriod.RatingPeriodID)
      .query(`
        SELECT 
          COUNT(DISTINCT RaterUserID) as TotalRaters,
          COUNT(*) as TotalAssignments,
          SUM(CASE WHEN IsCompleted = 1 THEN 1 ELSE 0 END) as CompletedAssignments
        FROM tblRatingAssignment
        WHERE RatingPeriodID = @periodId
      `);

    // Average scores by category
    const categoryAverages = await pool
      .request()
      .input('periodId', sql.Int, activePeriod.RatingPeriodID)
      .query(`
        SELECT 
          c.CategoryName,
          AVG(CAST(r.RatingValue as FLOAT)) as AverageScore,
          COUNT(r.ResponseID) as ResponseCount
        FROM tblRatingResponse r
        INNER JOIN tblRatingAssignment a ON r.AssignmentID = a.AssignmentID
        INNER JOIN tblRatingCategory c ON r.CategoryID = c.CategoryID
        WHERE a.RatingPeriodID = @periodId
        GROUP BY c.CategoryName, c.SortOrder
        ORDER BY c.SortOrder
      `);

    // Top rated individuals
    const topRated = await pool
      .request()
      .input('periodId', sql.Int, activePeriod.RatingPeriodID)
      .query(`
        SELECT TOP 10
          a.RateeEmail,
          AVG(CAST(r.RatingValue as FLOAT)) as AverageScore,
          COUNT(DISTINCT r.AssignmentID) as RatingCount
        FROM tblRatingResponse r
        INNER JOIN tblRatingAssignment a ON r.AssignmentID = a.AssignmentID
        WHERE a.RatingPeriodID = @periodId
        GROUP BY a.RateeEmail
        HAVING COUNT(DISTINCT r.AssignmentID) > 0
        ORDER BY AverageScore DESC
      `);

    // Bottom rated individuals
    const bottomRated = await pool
      .request()
      .input('periodId', sql.Int, activePeriod.RatingPeriodID)
      .query(`
        SELECT TOP 10
          a.RateeEmail,
          AVG(CAST(r.RatingValue as FLOAT)) as AverageScore,
          COUNT(DISTINCT r.AssignmentID) as RatingCount
        FROM tblRatingResponse r
        INNER JOIN tblRatingAssignment a ON r.AssignmentID = a.AssignmentID
        WHERE a.RatingPeriodID = @periodId
        GROUP BY a.RateeEmail
        HAVING COUNT(DISTINCT r.AssignmentID) > 0
        ORDER BY AverageScore ASC
      `);

    // Progress over time
    const progressOverTime = await pool
      .request()
      .input('periodId', sql.Int, activePeriod.RatingPeriodID)
      .query(`
        SELECT 
          CAST(DateCompleted as DATE) as CompletionDate,
          COUNT(*) as CompletedCount
        FROM tblRatingAssignment
        WHERE RatingPeriodID = @periodId
          AND IsCompleted = 1
          AND DateCompleted IS NOT NULL
        GROUP BY CAST(DateCompleted as DATE)
        ORDER BY CompletionDate
      `);

    return NextResponse.json({
      period: activePeriod,
      stats: {
        totalRaters: assignmentStats.recordset[0].TotalRaters,
        totalAssignments: assignmentStats.recordset[0].TotalAssignments,
        completedAssignments: assignmentStats.recordset[0].CompletedAssignments,
        pendingAssignments:
          assignmentStats.recordset[0].TotalAssignments -
          assignmentStats.recordset[0].CompletedAssignments,
      },
      categoryAverages: categoryAverages.recordset,
      topRated: topRated.recordset,
      bottomRated: bottomRated.recordset,
      progressOverTime: progressOverTime.recordset,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
