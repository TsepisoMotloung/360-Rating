import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { encodeAuthToken } from './lib/params';

export function middleware(request: NextRequest) {
  try {
    const url = request.nextUrl.clone();
    const sp = url.searchParams;

    const uid = sp.get('uid');
    const email = sp.get('email');

    // If plain credentials are present, redirect to same path with `auth` token and remove plain params
    if (uid && email && !sp.get('auth') && !sp.get('a')) {
      const token = encodeAuthToken(uid, email);
      if (token) {
        // remove plain params
        sp.delete('uid');
        sp.delete('email');
        sp.set('auth', token);
        url.search = sp.toString();
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  } catch (err) {
    // On error, continue without blocking the request
    return NextResponse.next();
  }
}

export const config = {
  matcher: '/:path*',
};
