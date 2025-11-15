import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { validateRatingInput } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, submissions } = body;

    // Validate user
    const validation = await validateUser(uid, email);
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid submissions format' },
        { status: 400 }
      );
    }

    const pool = await getConnection();

    // Verify all assignments belong to this rater - UserID is INT
    const assignmentIds = submissions.map((s: any) => s.assignmentId);
    const assignmentCheck = await pool
      .request()
      .input('raterUserId', sql.Int, parseInt(uid))
      .query(`
        SELECT AssignmentID 
        FROM tblRatingAssignment 
        WHERE RaterUserID = @raterUserId 
          AND AssignmentID IN (${assignmentIds.join(',')})
      `);

    if (assignmentCheck.recordset.length !== assignmentIds.length) {
      return NextResponse.json(
        { error: 'Some assignments not found or unauthorized' },
        { status: 404 }
      );
    }

    // Start transaction
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      let successCount = 0;

      for (const submission of submissions) {
        const { assignmentId, ratings, comment } = submission;

        // Delete existing ratings
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
            throw new Error(`Invalid rating: ${validation.error}`);
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

        successCount++;
      }

      await transaction.commit();

      return NextResponse.json({
        success: true,
        message: `Successfully submitted ${successCount} ratings`,
        count: successCount,
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error submitting bulk ratings:', error);
    return NextResponse.json(
      { error: 'Failed to submit bulk ratings' },
      { status: 500 }
    );
  }
}
