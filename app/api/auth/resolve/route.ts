import { NextResponse } from 'next/server';
import { validateUser } from '@/lib/auth';
import { extractAuthParams } from '@/lib/params';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { uid, email } = extractAuthParams(url.searchParams as any);

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
