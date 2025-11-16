import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { validateUser } from '@/lib/auth';
import { extractAuthParams } from '@/lib/params';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const { uid, email } = extractAuthParams(url.searchParams as any);

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return new Response('Unauthorized', { status: 401 });
    }

    const admins = await prisma.tblAdministrators.findMany({ orderBy: { Username: 'asc' } });
    return new Response(JSON.stringify({ admins }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Failed to list admins', err);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const { uid, email } = extractAuthParams(url.searchParams as any);

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const newEmail = (body?.email || '').toString().trim();
    const description = (body?.description || '').toString().trim();
    if (!newEmail) {
      return new Response('Missing email', { status: 400 });
    }

    // check existing active admins case-insensitively
    const admins = await prisma.tblAdministrators.findMany({ where: { IsActive: 1 } });
    const exists = admins.find((a) => (a.Username || '').toLowerCase() === newEmail.toLowerCase());
    if (exists) {
      return new Response('Admin already exists', { status: 409 });
    }

    const created = await prisma.tblAdministrators.create({ data: { Username: newEmail, Description: description, IsActive: 1 } });
    return new Response(JSON.stringify({ admin: created }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Failed to create admin', err);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const { uid, email } = extractAuthParams(url.searchParams as any);

    const validation = await validateUser(uid, email);
    if (!validation.isValid || !validation.isAdmin) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const targetEmail = (body?.email || '').toString().trim();
    if (!targetEmail) {
      return new Response('Missing email', { status: 400 });
    }

    // find matching active admins
    const admins = await prisma.tblAdministrators.findMany({ where: { IsActive: 1 } });
    const match = admins.find((a) => (a.Username || '').toLowerCase() === targetEmail.toLowerCase());
    if (!match) {
      return new Response('Admin not found', { status: 404 });
    }

    if (admins.length <= 1) {
      return new Response('Cannot remove the last admin', { status: 400 });
    }

    // soft-disable the admin
    await prisma.tblAdministrators.update({ where: { AdministratorID: match.AdministratorID }, data: { IsActive: 0 } });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Failed to delete admin', err);
    return new Response('Internal server error', { status: 500 });
  }
}
