import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { validateUser } from '@/lib/auth';

// GET all assignments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');
    const periodId = searchParams.get('periodId');

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = await getConnection();

    // If no period specified, get active period
    let targetPeriodId = periodId;
    if (!targetPeriodId) {
      const activePeriod = await pool.request().query(`
        SELECT TOP 1 RatingPeriodID FROM tblRatingPeriod WHERE IsActive = 1
      `);
      if (activePeriod.recordset.length > 0) {
        targetPeriodId = activePeriod.recordset[0].RatingPeriodID;
      }
    }

    if (!targetPeriodId) {
      return NextResponse.json({ assignments: [], message: 'No active period' });
    }

    const result = await pool
      .request()
      .input('periodId', sql.Int, targetPeriodId)
      .query(`
        SELECT 
          a.AssignmentID,
          a.RaterUserID,
          a.RaterEmail,
          a.RateeUserID,
          a.RateeEmail,
          a.IsCompleted,
          a.DateCompleted,
          a.RatingPeriodID
        FROM tblRatingAssignment a
        WHERE a.RatingPeriodID = @periodId
        ORDER BY a.RateeEmail, a.RaterEmail
      `);

    return NextResponse.json({ 
      assignments: result.recordset,
      periodId: targetPeriodId 
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, raterEmail, rateeEmail, periodId } = body;

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!raterEmail || !rateeEmail || !periodId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Get UserIDs from emails - UserID is INT in tblUser
    const raterResult = await pool
      .request()
      .input('email', sql.NVarChar, raterEmail)
      .query(`SELECT UserID FROM tblUser WHERE Username = @email`);

    const rateeResult = await pool
      .request()
      .input('email', sql.NVarChar, rateeEmail)
      .query(`SELECT UserID FROM tblUser WHERE Username = @email`);

    if (raterResult.recordset.length === 0) {
      return NextResponse.json(
        { error: `Rater email not found: ${raterEmail}` },
        { status: 404 }
      );
    }

    if (rateeResult.recordset.length === 0) {
      return NextResponse.json(
        { error: `Ratee email not found: ${rateeEmail}` },
        { status: 404 }
      );
    }

    const raterUserId = raterResult.recordset[0].UserID;
    const rateeUserId = rateeResult.recordset[0].UserID;

    // Check for duplicate
    const duplicate = await pool
      .request()
      .input('periodId', sql.Int, periodId)
      .input('raterUserId', sql.Int, raterUserId)
      .input('rateeUserId', sql.Int, rateeUserId)
      .query(`
        SELECT AssignmentID FROM tblRatingAssignment
        WHERE RatingPeriodID = @periodId
          AND RaterUserID = @raterUserId
          AND RateeUserID = @rateeUserId
      `);

    if (duplicate.recordset.length > 0) {
      return NextResponse.json(
        { error: 'Assignment already exists' },
        { status: 409 }
      );
    }

    // Insert assignment - UserID is INT
    const result = await pool
      .request()
      .input('periodId', sql.Int, periodId)
      .input('raterUserId', sql.Int, raterUserId)
      .input('raterEmail', sql.NVarChar, raterEmail)
      .input('rateeUserId', sql.Int, rateeUserId)
      .input('rateeEmail', sql.NVarChar, rateeEmail)
      .query(`
        INSERT INTO tblRatingAssignment 
        (RatingPeriodID, RaterUserID, RaterEmail, RateeUserID, RateeEmail, IsCompleted)
        OUTPUT INSERTED.AssignmentID
        VALUES (@periodId, @raterUserId, @raterEmail, @rateeUserId, @rateeEmail, 0)
      `);

    return NextResponse.json({
      success: true,
      assignmentId: result.recordset[0].AssignmentID,
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}

// DELETE - Remove assignment
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');
    const assignmentId = searchParams.get('assignmentId');

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID required' },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Delete related responses first
    await pool
      .request()
      .input('assignmentId', sql.Int, assignmentId)
      .query(`DELETE FROM tblRatingResponse WHERE AssignmentID = @assignmentId`);

    // Delete assignment
    await pool
      .request()
      .input('assignmentId', sql.Int, assignmentId)
      .query(`DELETE FROM tblRatingAssignment WHERE AssignmentID = @assignmentId`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}
