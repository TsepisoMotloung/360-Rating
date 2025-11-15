import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { validateUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');

    // Validate user
    const validation = await validateUser(uid, email);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const pool = await getConnection();

    // Get active rating period
    const periodResult = await pool.request().query(`
      SELECT TOP 1 RatingPeriodID, PeriodName
      FROM tblRatingPeriod
      WHERE IsActive = 1
      ORDER BY DateCreated DESC
    `);

    if (periodResult.recordset.length === 0) {
      return NextResponse.json({
        assignments: [],
        categories: [],
        message: 'No active rating period',
      });
    }

    const activePeriod = periodResult.recordset[0];

    // Get all categories
    const categoriesResult = await pool.request().query(`
      SELECT CategoryID, CategoryName, SortOrder
      FROM tblRatingCategory
      ORDER BY SortOrder
    `);

    // Get assignments for this rater - UserID is INT
    const assignmentsResult = await pool
      .request()
      .input('raterUserId', sql.Int, parseInt(uid || '0'))
      .input('periodId', sql.Int, activePeriod.RatingPeriodID)
      .query(`
        SELECT 
          a.AssignmentID,
          a.RateeUserID,
          a.RateeEmail,
          a.IsCompleted,
          a.DateCompleted
        FROM tblRatingAssignment a
        WHERE a.RaterUserID = @raterUserId
          AND a.RatingPeriodID = @periodId
        ORDER BY a.RateeEmail
      `);

    // Get existing ratings for these assignments
    const assignmentIds = assignmentsResult.recordset.map((a: any) => a.AssignmentID);
    
    let ratingsMap: { [key: number]: any[] } = {};
    
    if (assignmentIds.length > 0) {
      const ratingsResult = await pool
        .request()
        .query(`
          SELECT 
            r.AssignmentID,
            r.CategoryID,
            r.RatingValue,
            r.Comment
          FROM tblRatingResponse r
          WHERE r.AssignmentID IN (${assignmentIds.join(',')})
        `);

      ratingsResult.recordset.forEach((rating: any) => {
        if (!ratingsMap[rating.AssignmentID]) {
          ratingsMap[rating.AssignmentID] = [];
        }
        ratingsMap[rating.AssignmentID].push(rating);
      });
    }

    // Combine data
    const assignments = assignmentsResult.recordset.map((assignment: any) => ({
      assignmentId: assignment.AssignmentID,
      rateeUserId: assignment.RateeUserID,
      rateeEmail: assignment.RateeEmail,
      isCompleted: assignment.IsCompleted,
      dateCompleted: assignment.DateCompleted,
      ratings: ratingsMap[assignment.AssignmentID] || [],
    }));

    return NextResponse.json({
      period: {
        id: activePeriod.RatingPeriodID,
        name: activePeriod.PeriodName,
      },
      categories: categoriesResult.recordset,
      assignments,
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
