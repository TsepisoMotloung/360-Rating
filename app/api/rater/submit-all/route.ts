import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
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

    // Verify all assignments belong to this rater
    const assignmentIds = submissions.map((s: any) => s.assignmentId);
    const assignmentCheck = await prisma.ratingAssignment.findMany({
      where: {
        raterUserId: validation.userId,
        id: { in: assignmentIds },
      },
      select: { id: true },
    });

    if (assignmentCheck.length !== assignmentIds.length) {
      return NextResponse.json(
        { error: 'Some assignments not found or unauthorized' },
        { status: 404 }
      );
    }

    // Process all submissions in a transaction
    let successCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const submission of submissions) {
        const { assignmentId, ratings, comment } = submission;

        // Delete existing ratings
        await tx.ratingResponse.deleteMany({
          where: { assignmentId },
        });

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

          await tx.ratingResponse.create({
            data: {
              assignmentId,
              categoryId: rating.categoryId,
              ratingValue: rating.value,
              comment: comment || null,
              updatedDate: new Date(),
            },
          });
        }

        // Update assignment as completed
        await tx.ratingAssignment.update({
          where: { id: assignmentId },
          data: {
            isCompleted: true,
            dateCompleted: new Date(),
          },
        });

        successCount++;
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully submitted ${successCount} ratings`,
      count: successCount,
    });
  } catch (error) {
    console.error('Error submitting bulk ratings:', error);
    return NextResponse.json(
      { error: 'Failed to submit bulk ratings' },
      { status: 500 }
    );
  }
}