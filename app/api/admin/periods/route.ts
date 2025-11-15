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
    const result = await pool.request().query(`
      SELECT 
        RatingPeriodID,
        PeriodName,
        StartDate,
        EndDate,
        IsActive,
        CreatedBy,
        DateCreated
      FROM tblRatingPeriod
      ORDER BY DateCreated DESC
    `);

    return NextResponse.json({ periods: result.recordset });
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, periodName, startDate, endDate, isActive } = body;

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!periodName || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // If setting this period as active, deactivate all others
    if (isActive) {
      await pool.request().query(`UPDATE tblRatingPeriod SET IsActive = 0`);
    }

    const result = await pool
      .request()
      .input('periodName', sql.NVarChar, periodName)
      .input('startDate', sql.Date, startDate)
      .input('endDate', sql.Date, endDate)
      .input('isActive', sql.Bit, isActive ? 1 : 0)
      .input('createdBy', sql.NVarChar, email)
      .query(`
        INSERT INTO tblRatingPeriod (PeriodName, StartDate, EndDate, IsActive, CreatedBy, DateCreated)
        OUTPUT INSERTED.RatingPeriodID
        VALUES (@periodName, @startDate, @endDate, @isActive, @createdBy, GETDATE())
      `);

    return NextResponse.json({
      success: true,
      periodId: result.recordset[0].RatingPeriodID,
    });
  } catch (error) {
    console.error('Error creating period:', error);
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, periodId, isActive } = body;

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = await getConnection();

    // If activating this period, deactivate all others
    if (isActive) {
      await pool.request().query(`UPDATE tblRatingPeriod SET IsActive = 0`);
    }

    await pool
      .request()
      .input('periodId', sql.Int, periodId)
      .input('isActive', sql.Bit, isActive ? 1 : 0)
      .query(`
        UPDATE tblRatingPeriod 
        SET IsActive = @isActive
        WHERE RatingPeriodID = @periodId
      `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating period:', error);
    return NextResponse.json({ error: 'Failed to update period' }, { status: 500 });
  }
}
