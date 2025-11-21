import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { extractAuthParams } from '@/lib/params';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { uid, email } = extractAuthParams(searchParams as any);

    // Validate user
    const validation = await validateUser(uid, email);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get active rating period
    const activePeriod = await prisma.ratingPeriod.findFirst({
      where: { isActive: true },
      orderBy: { dateCreated: 'desc' },
      select: {
        id: true,
        periodName: true,
      },
    });

    if (!activePeriod) {
      return NextResponse.json({
        assignments: [],
        categories: [],
        message: 'No active rating period',
      });
    }

    // Get all categories
    const categories = await prisma.ratingCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        categoryName: true,
        sortOrder: true,
      },
    });

    // Get admin assignments
    const adminAssignments = await prisma.ratingAssignment.findMany({
      where: {
        raterUserId: validation.userId,
        ratingPeriodId: activePeriod.id,
      },
      include: {
        responses: {
          select: {
            categoryId: true,
            ratingValue: true,
            comment: true,
          },
        },
        ratee: {
          select: {
            FName: true,
            Surname: true,
            Username: true,
          },
        },
      },
      orderBy: {
        rateeEmail: 'asc',
      },
    });

    // Get manager assignments
    const managerAssignments = await prisma.managerAssignment.findMany({
      where: {
        raterUserId: validation.userId,
        ratingPeriodId: activePeriod.id,
      },
      include: {
        responses: {
          select: {
            categoryId: true,
            ratingValue: true,
            comment: true,
          },
        },
        ratee: {
          select: {
            FName: true,
            Surname: true,
            Username: true,
          },
        },
      },
      orderBy: {
        rateeEmail: 'asc',
      },
    });

    // Transform data to match frontend expectations
    const format = (assignment: any, isManager = false) => ({
      assignmentId: assignment.id,
      rateeUserId: assignment.rateeUserId,
      rateeEmail: assignment.rateeEmail,
      rateeFName: assignment.ratee?.FName || null,
      rateeSurname: assignment.ratee?.Surname || null,
      isCompleted: assignment.isCompleted,
      dateCompleted: assignment.dateCompleted,
      ratings: assignment.responses.map((r) => ({
        CategoryID: r.categoryId,
        RatingValue: r.ratingValue,
        Comment: r.comment || '',
      })),
      source: isManager ? 'manager' : 'admin',
    });

    const formattedAdmin = adminAssignments.map(a => format(a, false));
    const formattedManager = managerAssignments.map(a => format(a, true));

    // No deduplication, just return all assignments
    return NextResponse.json({
      period: {
        id: activePeriod.id,
        name: activePeriod.periodName,
      },
      categories: categories.map((c) => ({
        CategoryID: c.id,
        CategoryName: c.categoryName,
        SortOrder: c.sortOrder,
      })),
      adminAssignments: formattedAdmin,
      managerAssignments: formattedManager,
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}