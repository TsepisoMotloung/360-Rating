import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { extractAuthParams } from '@/lib/params';

// GET all assignments
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { uid, email } = extractAuthParams(searchParams as any);
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
      include: {
        ratee: { select: { FName: true, Surname: true, Username: true } },
        rater: { select: { FName: true, Surname: true, Username: true } },
      },
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
        RaterFName: a.rater?.FName || null,
        RaterSurname: a.rater?.Surname || null,
        RateeUserID: a.rateeUserId,
        RateeEmail: a.rateeEmail,
        RateeFName: a.ratee?.FName || null,
        RateeSurname: a.ratee?.Surname || null,
        Relationship: a.relationship || null,
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
    const { raterEmail, rateeEmail, periodId, relationship } = body;
    const { uid, email } = extractAuthParams(body as any);

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

    // Resolve rater/ratee to canonical user ids (handles duplicate users)
    const raterValidation = await validateUser(null, raterEmail);
    if (!raterValidation.isValid || !raterValidation.userId) {
      return NextResponse.json(
        { error: `Rater email not found: ${raterEmail}` },
        { status: 404 }
      );
    }

    const rateeValidation = await validateUser(null, rateeEmail);
    if (!rateeValidation.isValid || !rateeValidation.userId) {
      return NextResponse.json(
        { error: `Ratee email not found: ${rateeEmail}` },
        { status: 404 }
      );
    }

    // Check for duplicate (use canonical user ids)
    const duplicate = await prisma.ratingAssignment.findFirst({
      where: {
        ratingPeriodId: periodId,
        raterUserId: raterValidation.userId,
        rateeUserId: rateeValidation.userId,
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
        raterUserId: raterValidation.userId,
        raterEmail,
        rateeUserId: rateeValidation.userId,
        rateeEmail,
        isCompleted: false,
        relationship: typeof relationship === 'number' ? relationship : undefined,
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
    const { uid, email } = extractAuthParams(searchParams as any);
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

// PATCH - Update an assignment (e.g., relationship)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { assignmentId, relationship } = body;
    const { uid, email } = extractAuthParams(body as any);

    const validation = await validateUser(uid ?? null, email ?? null);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId required' }, { status: 400 });
    }

    const rel = typeof relationship === 'number' ? relationship : null;
    if (!rel || rel < 1 || rel > 4) {
      return NextResponse.json({ error: 'Invalid relationship (1-4)' }, { status: 400 });
    }

    const updated = await prisma.ratingAssignment.update({
      where: { id: parseInt(String(assignmentId)) },
      data: { relationship: rel },
    });

    return NextResponse.json({ success: true, assignmentId: updated.id });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}