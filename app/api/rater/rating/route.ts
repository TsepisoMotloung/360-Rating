import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { validateRatingInput } from '@/lib/validators';
import { decodeAuthToken } from '@/lib/params';

export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    let { uid, email, assignmentId, ratings, comment, auth } = body as any;
    if (auth && (!uid || !email)) {
      const parsed = decodeAuthToken(String(auth));
      uid = parsed.uid ?? uid;
      email = parsed.email ?? email;
    }

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

    // Verify assignment belongs to this rater
    const assignment = await prisma.ratingAssignment.findFirst({
      where: {
        id: assignmentId,
        raterUserId: validation.userId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found or unauthorized' },
        { status: 404 }
      );
    }

    // Use Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing ratings for this assignment
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

      // Update assignment as completed
      await tx.ratingAssignment.update({
        where: { id: assignmentId },
        data: {
          isCompleted: true,
          dateCompleted: new Date(),
        },
      });
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