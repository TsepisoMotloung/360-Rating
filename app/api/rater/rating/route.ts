import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { validateRatingInput } from '@/lib/validators';
import { extractAuthParams } from '@/lib/params';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, ratings, comment, source } = body;
    const { uid, email } = extractAuthParams(body as any);

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

    // Determine assignment type: check if it's admin or manager assignment
    let isManagerAssignment = false;
    let assignment: any = null;

    // Try to find as admin assignment first
    assignment = await prisma.ratingAssignment.findFirst({
      where: {
        id: assignmentId,
        raterUserId: validation.userId,
      },
    });

    // If not found, try as manager assignment
    if (!assignment) {
      assignment = await prisma.managerAssignment.findFirst({
        where: {
          id: assignmentId,
          raterUserId: validation.userId,
        },
      });
      isManagerAssignment = true;
    }

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found or unauthorized' },
        { status: 404 }
      );
    }

    // Use Prisma transaction
    await prisma.$transaction(async (tx) => {
      if (isManagerAssignment) {
        // Delete existing ratings for manager assignment
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
            throw new Error(validation.error);
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
        // Delete existing ratings for admin assignment
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
            throw new Error(validation.error);
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
    });

    return NextResponse.json({
      success: true,
      message: 'Rating submitted successfully',
    });
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