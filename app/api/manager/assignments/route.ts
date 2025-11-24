import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { extractAuthParams, buildAuthToken } from '@/lib/params';
import { sendAssignmentNotificationEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const { uid, email } = extractAuthParams(request.nextUrl.searchParams);
    
    if (!uid || !email) {
      return NextResponse.json({ error: 'Invalid or missing auth parameter' }, { status: 400 });
    }

    const validation = await validateUser(uid, email);

    if (!validation.isValid || !validation.isManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active rating period
    const period = await prisma.ratingPeriod.findFirst({
      where: { isActive: true },
    });

    if (!period) {
      return NextResponse.json(
        { error: 'No active rating period' },
        { status: 404 }
      );
    }

    // Get categories
    const categories = await prisma.ratingCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Get assignments for this manager
    const assignments = await prisma.managerAssignment.findMany({
      where: {
        managerId: validation.managerId,
        ratingPeriodId: period.id,
      },
      include: {
        responses: {
          select: {
            id: true,
            categoryId: true,
            ratingValue: true,
            comment: true,
          },
        },
        ratee: {
          select: {
            UserID: true,
            Username: true,
            FName: true,
            Surname: true,
          },
        },
        rater: {
          select: {
            UserID: true,
            Username: true,
            FName: true,
            Surname: true,
          },
        },
      },
    });

    const formattedAssignments = assignments.map(a => ({
      assignmentId: a.id,
      raterUserId: a.rater.UserID,
      raterEmail: a.raterEmail,
      raterFName: a.rater.FName,
      raterSurname: a.rater.Surname,
      raterPosition: a.raterPosition || null,
      rateeUserId: a.ratee.UserID,
      rateeEmail: a.rateeEmail,
      rateeFName: a.ratee.FName,
      rateeSurname: a.ratee.Surname,
      rateePosition: a.rateePosition || null,
      isCompleted: a.isCompleted,
      dateCompleted: a.dateCompleted,
      ratings: a.responses.map(r => ({
        CategoryID: r.categoryId,
        RatingValue: r.ratingValue,
        Comment: r.comment,
      })),
    }));

    return NextResponse.json({
      period: { name: period.periodName },
      categories,
      assignments: formattedAssignments,
    });
  } catch (error) {
    console.error('Error fetching manager assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth, assignments } = body;

    if (!auth) {
      return NextResponse.json({ error: 'Missing auth parameter' }, { status: 400 });
    }

    const { uid, email } = extractAuthParams(auth);
    
    if (!uid || !email) {
      return NextResponse.json({ error: 'Invalid or missing auth parameter' }, { status: 400 });
    }

    const validation = await validateUser(uid, email);

    if (!validation.isValid || !validation.isManager) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: 'No assignments provided' },
        { status: 400 }
      );
    }

    // Get active rating period
    const period = await prisma.ratingPeriod.findFirst({
      where: { isActive: true },
    });

    if (!period) {
      return NextResponse.json(
        { error: 'No active rating period' },
        { status: 404 }
      );
    }

    // Create assignments
    const results = await Promise.all(
      assignments.map(async (assignment: any) => {
        try {
          // Look up rater and ratee by email
          const rater = await prisma.tblUser.findFirst({
            where: { Username: assignment.raterEmail },
            select: { UserID: true },
          });

          const ratee = await prisma.tblUser.findFirst({
            where: { Username: assignment.rateeEmail },
            select: { UserID: true },
          });

          if (!rater || !ratee) {
            return { success: false, error: `User not found for assignment` };
          }

          const result = await prisma.managerAssignment.create({
            data: {
              managerId: validation.managerId!,
              ratingPeriodId: period.id,
              raterUserId: rater.UserID,
              raterEmail: assignment.raterEmail,
              rateeUserId: ratee.UserID,
              rateeEmail: assignment.rateeEmail,
              relationship: assignment.relationship || 1,
              raterPosition: assignment.raterPosition || null,
              rateePosition: assignment.rateePosition || null,
            },
          });

          // Send notification email to rater and capture result
          let emailSent = false;
          try {
            const raterUser = await prisma.tblUser.findFirst({ where: { Username: assignment.raterEmail }, select: { FName: true, Surname: true } });
            const rateeUser = await prisma.tblUser.findFirst({ where: { Username: assignment.rateeEmail }, select: { FName: true, Surname: true } });
            const raterName = raterUser ? `${(raterUser.FName || '').trim()} ${(raterUser.Surname || '').trim()}`.trim() : assignment.raterEmail;
            const rateeName = rateeUser ? `${(rateeUser.FName || '').trim()} ${(rateeUser.Surname || '').trim()}`.trim() : assignment.rateeEmail;

            const token = buildAuthToken(String(rater.UserID), assignment.raterEmail);
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
            const ratingLink = `${baseUrl}/rater?auth=${encodeURIComponent(token)}`;

            emailSent = await sendAssignmentNotificationEmail(assignment.raterEmail, raterName, rateeName, assignment.rateeEmail, period.periodName, ratingLink).catch((e) => {
              console.error('Failed to send manager assignment notification:', e);
              return false;
            });
          } catch (e) {
            console.warn('Manager assignment notification attempt failed (non-fatal):', e);
          }

          return { success: true, assignment: result, emailSent };
        } catch (error: any) {
          if (error.code === 'P2002') {
            return { success: false, error: 'Assignment already exists' };
          }
          throw error;
        }
      })
    );

    const failed = results.filter(r => !r.success);
    const created = results
      .filter((r): r is { success: true; assignment: any; emailSent: boolean } => r.success === true && !!(r as any).assignment)
      .map(r => ({
        id: r.assignment.id,
        raterId: r.assignment.raterUserId,
        rateeId: r.assignment.rateeUserId,
        positionId: r.assignment.raterPosition || null,
        raterEmail: r.assignment.raterEmail,
        emailSent: r.emailSent || false,
      }));

    if (failed.length > 0) {
      return NextResponse.json(
        {
          success: false,
          created,
          message: `Created ${created.length} assignments. ${failed.length} already exist.`,
        },
        { status: 207 }
      );
    }

    return NextResponse.json(
      { success: true, created },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating manager assignments:', error);
    return NextResponse.json(
      { error: 'Failed to create assignments' },
      { status: 500 }
    );
  }
}
