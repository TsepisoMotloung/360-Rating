import { NextResponse } from 'next/server';
import { extractAuthParams } from '@/lib/params';
import { validateUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const auth = url.searchParams.get('auth') || null;
    const { uid, email } = extractAuthParams(auth || '');

    if (!uid || !email) {
      return NextResponse.json({ isValid: false }, { status: 400 });
    }

    const validation = await validateUser(uid, email);
    return NextResponse.json(validation);
  } catch (err) {
    console.error('validate auth route error:', err);
    return NextResponse.json({ isValid: false }, { status: 500 });
  }
}
