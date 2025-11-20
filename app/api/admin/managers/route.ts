import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

function safeBase64Decode(input: string): string {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  try {
    let padded = s;
    while (padded.length % 4 !== 0) padded += '=';
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch (e) {
    throw new Error('Invalid base64');
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = request.nextUrl.searchParams.get('auth');
    if (!auth) {
      return NextResponse.json({ error: 'Missing auth parameter' }, { status: 400 });
    }

    let uid, email;
    try {
      const decoded = safeBase64Decode(auth);
      const parts = decoded.split(':');
      uid = parts[0] || null;
      email = parts.slice(1).join(':') || null;
      if (!uid || !email) {
        throw new Error('Invalid token format');
      }
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 400 });
    }

    const validation = await validateUser(uid, email);

    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const managers = await prisma.manager.findMany({
      orderBy: { dateCreated: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdBy: true,
        dateCreated: true,
      },
    });

    return NextResponse.json(managers);
  } catch (error) {
    console.error('Error fetching managers:', error);
    return NextResponse.json({ error: 'Failed to fetch managers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth, email, firstName, lastName } = body;

    if (!auth) {
      return NextResponse.json({ error: 'Missing auth parameter' }, { status: 400 });
    }

    let uid, adminEmail;
    try {
      const decoded = safeBase64Decode(auth);
      const parts = decoded.split(':');
      uid = parts[0] || null;
      adminEmail = parts.slice(1).join(':') || null;
      if (!uid || !adminEmail) {
        throw new Error('Invalid token format');
      }
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 400 });
    }

    const validation = await validateUser(uid, adminEmail);

    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if manager already exists
    const existing = await prisma.manager.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: 'Manager already exists' }, { status: 400 });
    }

    const manager = await prisma.manager.create({
      data: {
        email: email.toLowerCase(),
        firstName: firstName || '',
        lastName: lastName || '',
        createdBy: adminEmail,
        isActive: true,
      },
    });

    return NextResponse.json(manager, { status: 201 });
  } catch (error) {
    console.error('Error creating manager:', error);
    return NextResponse.json({ error: 'Failed to create manager' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth, id, isActive, firstName, lastName } = body;

    if (!auth) {
      return NextResponse.json({ error: 'Missing auth parameter' }, { status: 400 });
    }

    let uid, adminEmail;
    try {
      const decoded = JSON.parse(Buffer.from(auth, 'base64').toString());
      uid = decoded.uid;
      adminEmail = decoded.email;
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 400 });
    }

    const validation = await validateUser(uid, adminEmail);

    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const manager = await prisma.manager.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      },
    });

    return NextResponse.json(manager);
  } catch (error) {
    console.error('Error updating manager:', error);
    return NextResponse.json({ error: 'Failed to update manager' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const auth = request.nextUrl.searchParams.get('auth');

    if (!auth || !id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    let uid, adminEmail;
    try {
      const decoded = JSON.parse(Buffer.from(auth, 'base64').toString());
      uid = decoded.uid;
      adminEmail = decoded.email;
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 400 });
    }

    const validation = await validateUser(uid, adminEmail);

    if (!validation.isValid || !validation.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.manager.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting manager:', error);
    return NextResponse.json({ error: 'Failed to delete manager' }, { status: 500 });
  }
}
