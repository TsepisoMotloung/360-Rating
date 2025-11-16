import { NextRequest, NextResponse } from 'next/server';
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

    // Get assignments for this rater with existing ratings
    const assignments = await prisma.ratingAssignment.findMany({
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
      },
      orderBy: {
        rateeEmail: 'asc',
      },
    });

    // Transform data to match frontend expectations
    const formattedAssignments = assignments.map((assignment) => ({
      assignmentId: assignment.id,
      rateeUserId: assignment.rateeUserId,
      rateeEmail: assignment.rateeEmail,
      isCompleted: assignment.isCompleted,
      dateCompleted: assignment.dateCompleted,
      ratings: assignment.responses.map((r) => ({
        CategoryID: r.categoryId,
        RatingValue: r.ratingValue,
        Comment: r.comment || '',
      })),
    }));

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
      assignments: formattedAssignments,
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}