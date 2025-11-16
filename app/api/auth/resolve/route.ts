import { NextResponse } from 'next/server';
import { validateUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const uid = url.searchParams.get('uid');
    const email = url.searchParams.get('email');

    const validation = await validateUser(uid, email);
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providedUid = uid ? parseInt(uid || '') : null;

    return NextResponse.json({
      canonicalUid: validation.userId,
      canonicalEmail: validation.email,
      isAdmin: validation.isAdmin || false,
      differsFromProvided: providedUid !== null && providedUid !== validation.userId,
    });
  } catch (error) {
    console.error('Error resolving user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export { GET as POST };
