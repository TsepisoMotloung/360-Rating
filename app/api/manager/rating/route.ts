import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth, assignmentId, ratings, comment } = body;

    if (!auth) {
      return NextResponse.json({ error: 'Missing auth parameter' }, { status: 400 });
    }

    const { uid, email } = JSON.parse(Buffer.from(auth, 'base64').toString());
    const validation = await validateUser(uid, email);

    if (!validation.isValid || !validation.isManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the assignment belongs to this manager
    const assignment = await prisma.managerAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.managerId !== validation.managerId) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Delete existing responses
    await prisma.managerResponse.deleteMany({
      where: { assignmentId },
    });

    // Create new responses
    const responses = await Promise.all(
      ratings.map((rating: any) =>
        prisma.managerResponse.create({
          data: {
            assignmentId,
            categoryId: rating.categoryId,
            ratingValue: rating.value,
            comment: comment || null,
          },
        })
      )
    );

    // Mark assignment as completed
    const updated = await prisma.managerAssignment.update({
      where: { id: assignmentId },
      data: {
        isCompleted: true,
        dateCompleted: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      assignment: updated,
      responses,
    });
  } catch (error) {
    console.error('Error submitting manager rating:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  }
}
