import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
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

    // If no period specified, get active period
    let targetPeriodId = periodId ? parseInt(periodId) : null;
    if (!targetPeriodId) {
      const activePeriod = await prisma.ratingPeriod.findFirst({
        where: { isActive: true },
      });
      if (activePeriod) {
        targetPeriodId = activePeriod.id;
      }
    }

    if (!targetPeriodId) {
      return NextResponse.json({ assignments: [], message: 'No active period' });
    }

    const assignments = await prisma.ratingAssignment.findMany({
      where: { ratingPeriodId: targetPeriodId },
      orderBy: [
        { rateeEmail: 'asc' },
        { raterEmail: 'asc' },
      ],
    });

    return NextResponse.json({
      assignments: assignments.map(a => ({
        AssignmentID: a.id,
        RaterUserID: a.raterUserId,
        RaterEmail: a.raterEmail,
        RateeUserID: a.rateeUserId,
        RateeEmail: a.rateeEmail,
        IsCompleted: a.isCompleted,
        DateCompleted: a.dateCompleted,
        RatingPeriodID: a.ratingPeriodId,
      })),
      periodId: targetPeriodId,
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

    // Get UserIDs from emails - UserID is INT in tblUser
    const rater = await prisma.tblUser.findFirst({
      where: { Username: raterEmail },
      select: { UserID: true },
    });

    const ratee = await prisma.tblUser.findFirst({
      where: { Username: rateeEmail },
      select: { UserID: true },
    });

    if (!rater) {
      return NextResponse.json(
        { error: `Rater email not found: ${raterEmail}` },
        { status: 404 }
      );
    }

    if (!ratee) {
      return NextResponse.json(
        { error: `Ratee email not found: ${rateeEmail}` },
        { status: 404 }
      );
    }

    // Check for duplicate
    const duplicate = await prisma.ratingAssignment.findFirst({
      where: {
        ratingPeriodId: periodId,
        raterUserId: rater.id,
        rateeUserId: ratee.id,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Assignment already exists' },
        { status: 409 }
      );
    }

    // Insert assignment
    const assignment = await prisma.ratingAssignment.create({
      data: {
        ratingPeriodId: periodId,
        raterUserId: rater.id,
        raterEmail,
        rateeUserId: ratee.id,
        rateeEmail,
        isCompleted: false,
      },
    });

    return NextResponse.json({
      success: true,
      assignmentId: assignment.id,
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

    // Prisma will automatically delete related responses due to onDelete: Cascade
    await prisma.ratingAssignment.delete({
      where: { id: parseInt(assignmentId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}