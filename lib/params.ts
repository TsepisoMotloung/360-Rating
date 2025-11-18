export interface AuthParams {
  uid: string | null;
  email: string | null;
}

function safeBase64Decode(input: string): string {
  // Normalize URL-safe base64
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  try {
    // Node-safe
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(s, 'base64').toString('utf8');
    }
  } catch (e) {
    // fall through
  }

  try {
    // Browser fallback
    // atob expects padding; add if missing
    let padded = s;
    while (padded.length % 4 !== 0) padded += '=';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).atob(padded);
  } catch (e) {
    throw new Error('Invalid base64');
  }
}

function safeBase64Encode(input: string): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(input, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  } catch (e) {
    // fall through
  }

  try {
    // Browser btoa expects binary string, but for UTF-8 we can use encodeURIComponent trick
    // However in Node and modern browsers Buffer is available. Keep fallback minimal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b = (globalThis as any).btoa(unescape(encodeURIComponent(input)));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    throw new Error('Failed to base64 encode');
  }
}

function parseAuthToken(token: string | null | undefined): AuthParams {
  if (!token) return { uid: null, email: null };
  try {
    const decoded = safeBase64Decode(token);
    const parts = decoded.split(':');
    const uid = parts[0] || null;
    const email = parts.slice(1).join(':') || null;
    return { uid: uid || null, email: email || null };
  } catch (err) {
    return { uid: null, email: null };
  }
}

/**
 * Parse auth from a few shapes:
 * - URLSearchParams-like (has `.get`)
 * - plain object with `auth` string
 * - raw auth string
 * This function enforces that `auth` (base64 uid:email) is used and will not accept plain `uid`/`email` fields.
 */
export function extractAuthParams(searchParams: URLSearchParams | { get: (k: string) => string | null } | { auth?: string } | string) : AuthParams {
  // If a raw string is supplied, treat it as the token
  if (typeof searchParams === 'string') {
    return parseAuthToken(searchParams as string);
  }

  // If an object with `get` exists (URLSearchParams or similar)
  // prefer `auth` or `a` only. Do NOT accept `uid`/`email` plain params.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sp: any = searchParams;
  if (sp && typeof sp.get === 'function') {
    const auth = sp.get('auth') || sp.get('a');
    return parseAuthToken(auth);
  }

  // If provided a plain object with `auth` property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (sp && typeof sp === 'object' && typeof sp.auth === 'string') {
    return parseAuthToken(sp.auth);
  }

  return { uid: null, email: null };
}

export function buildAuthToken(uid: string, email: string) {
  const combined = `${uid}:${email}`;
  return safeBase64Encode(combined);
}

