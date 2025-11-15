import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const periods = await prisma.ratingPeriod.findMany({
      orderBy: { dateCreated: 'desc' },
    });

    return NextResponse.json({
      periods: periods.map(p => ({
        RatingPeriodID: p.id,
        PeriodName: p.periodName,
        StartDate: p.startDate,
        EndDate: p.endDate,
        IsActive: p.isActive,
        CreatedBy: p.createdBy,
        DateCreated: p.dateCreated,
      })),
    });
  } catch (error) {
    console.error('Error fetching periods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, periodName, startDate, endDate, isActive } = body;

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!periodName || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // If setting this period as active, deactivate all others
    if (isActive) {
      await prisma.ratingPeriod.updateMany({
        data: { isActive: false },
      });
    }

    const period = await prisma.ratingPeriod.create({
      data: {
        periodName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive ?? true,
        createdBy: email,
      },
    });

    return NextResponse.json({
      success: true,
      periodId: period.id,
    });
  } catch (error) {
    console.error('Error creating period:', error);
    return NextResponse.json({ error: 'Failed to create period' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, email, periodId, isActive } = body;

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If activating this period, deactivate all others
    if (isActive) {
      await prisma.ratingPeriod.updateMany({
        data: { isActive: false },
      });
    }

    await prisma.ratingPeriod.update({
      where: { id: periodId },
      data: { isActive },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating period:', error);
    return NextResponse.json({ error: 'Failed to update period' }, { status: 500 });
  }
}