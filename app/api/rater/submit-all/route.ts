import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { validateRatingInput } from '@/lib/validators';
import { extractAuthParams } from '@/lib/params';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissions } = body;
    const { uid, email } = extractAuthParams(body as any);

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

    // Separate admin and manager assignment IDs
    const adminIds: number[] = [];
    const managerIds: number[] = [];

    for (const submission of submissions) {
      if (submission.source === 'manager') {
        managerIds.push(submission.assignmentId);
      } else {
        adminIds.push(submission.assignmentId);
      }
    }

    // Verify all admin assignments belong to this rater
    if (adminIds.length > 0) {
      const adminCheck = await prisma.ratingAssignment.findMany({
        where: {
          raterUserId: validation.userId,
          id: { in: adminIds },
        },
        select: { id: true },
      });
      if (adminCheck.length !== adminIds.length) {
        return NextResponse.json(
          { error: 'Some admin assignments not found or unauthorized' },
          { status: 404 }
        );
      }
    }

    // Verify all manager assignments belong to this rater
    if (managerIds.length > 0) {
      const managerCheck = await prisma.managerAssignment.findMany({
        where: {
          raterUserId: validation.userId,
          id: { in: managerIds },
        },
        select: { id: true },
      });
      if (managerCheck.length !== managerIds.length) {
        return NextResponse.json(
          { error: 'Some manager assignments not found or unauthorized' },
          { status: 404 }
        );
      }
    }

    // Process all submissions in a transaction
    let successCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const submission of submissions) {
        const { assignmentId, ratings, comment, source } = submission;

        if (source === 'manager') {
          // Delete existing manager ratings
          await tx.managerResponse.deleteMany({
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

            await tx.managerResponse.create({
              data: {
                assignmentId,
                categoryId: rating.categoryId,
                ratingValue: rating.value,
                comment: comment || null,
                updatedDate: new Date(),
              },
            });
          }

          // Update manager assignment as completed
          await tx.managerAssignment.update({
            where: { id: assignmentId },
            data: {
              isCompleted: true,
              dateCompleted: new Date(),
            },
          });
        } else {
          // Delete existing admin ratings
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

          // Update admin assignment as completed
          await tx.ratingAssignment.update({
            where: { id: assignmentId },
            data: {
              isCompleted: true,
              dateCompleted: new Date(),
            },
          });
        }

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