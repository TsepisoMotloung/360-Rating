import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { validateRatingInput } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, assignmentId, ratings, comment } = body;

    // Validate user
    const validation = await validateUser(uid, email);
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate ratings format
    if (!Array.isArray(ratings) || ratings.length === 0) {
      return NextResponse.json(
        { error: 'Invalid ratings format' },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verify assignment belongs to this rater - UserID is INT
    const assignmentCheck = await pool
      .request()
      .input('assignmentId', sql.Int, assignmentId)
      .input('raterUserId', sql.Int, parseInt(uid))
      .query(`
        SELECT AssignmentID 
        FROM tblRatingAssignment 
        WHERE AssignmentID = @assignmentId AND RaterUserID = @raterUserId
      `);

    if (assignmentCheck.recordset.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found or unauthorized' },
        { status: 404 }
      );
    }

    // Start transaction
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Delete existing ratings for this assignment
      await transaction.request()
        .input('assignmentId', sql.Int, assignmentId)
        .query(`
          DELETE FROM tblRatingResponse WHERE AssignmentID = @assignmentId
        `);

      // Insert new ratings
      for (const rating of ratings) {
        const validation = validateRatingInput({
          assignmentId,
          categoryId: rating.categoryId,
          ratingValue: rating.value,
        });

        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        await transaction.request()
          .input('assignmentId', sql.Int, assignmentId)
          .input('categoryId', sql.Int, rating.categoryId)
          .input('ratingValue', sql.Int, rating.value)
          .input('comment', sql.NVarChar, comment || null)
          .query(`
            INSERT INTO tblRatingResponse (AssignmentID, CategoryID, RatingValue, Comment, UpdatedDate)
            VALUES (@assignmentId, @categoryId, @ratingValue, @comment, GETDATE())
          `);
      }

      // Update assignment as completed
      await transaction.request()
        .input('assignmentId', sql.Int, assignmentId)
        .query(`
          UPDATE tblRatingAssignment 
          SET IsCompleted = 1, DateCompleted = GETDATE()
          WHERE AssignmentID = @assignmentId
        `);

      await transaction.commit();

      return NextResponse.json({
        success: true,
        message: 'Rating submitted successfully',
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error submitting rating:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
