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

export function extractAuthParams(searchParams: URLSearchParams | { get: (k: string) => string | null }) : AuthParams {
  const sp = (searchParams as URLSearchParams);

  // Support combined base64 token in `auth` param. Expected format when decoded: "uid:email"
  const auth = sp.get('auth') || sp.get('a');
  if (auth) {
    try {
      const decoded = safeBase64Decode(auth);
      const parts = decoded.split(':');
      const uid = parts[0] || null;
      const email = parts.slice(1).join(':') || null;
      return { uid: uid || null, email: email || null };
    } catch (err) {
      // silently fall through to plain parsing
    }
  }

  // Fallback: accept plain uid/email query params
  const uid = sp.get('uid');
  const email = sp.get('email');
  return { uid: uid || null, email: email || null };
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
    // Browser fallback
    // btoa operates on binary string; ensure utf8-safe encoding
    // simple utf8 encoder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).btoa(unescape(encodeURIComponent(input))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    throw new Error('Base64 encode failure');
  }
}

export function encodeAuthToken(uid: string | null, email: string | null): string | null {
  if (!uid || !email) return null;
  const combined = `${uid}:${email}`;
  return safeBase64Encode(combined);
}

export function decodeAuthToken(token: string): AuthParams {
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
