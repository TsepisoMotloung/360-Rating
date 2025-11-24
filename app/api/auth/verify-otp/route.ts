import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// This should match the otpStore from request-otp
declare global {
  var otpStore: Map<string, { otp: string; expiresAt: number }> | undefined;
}

const otpStore = global.otpStore || new Map<string, { otp: string; expiresAt: number }>();
global.otpStore = otpStore;

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const emailKey = email.toLowerCase();

    // Check if OTP exists
    const storedOtpData = otpStore.get(emailKey);

    if (!storedOtpData) {
      return NextResponse.json({ error: 'OTP not found or expired' }, { status: 400 });
    }

    // Check if OTP is expired
    if (Date.now() > storedOtpData.expiresAt) {
      otpStore.delete(emailKey);
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // Verify OTP
    if (storedOtpData.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // OTP is valid, get user from database (Username field contains email)
    const user = await prisma.tblUser.findFirst({
      where: {
        Username: email,
        IsActive: 1
      },
      select: {
        UserID: true,
        Username: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate auth token: base64(uid:email)
    const authString = `${user.UserID}:${user.Username}`;
    const authToken = Buffer.from(authString).toString('base64');

    // Clear OTP after successful verification
    otpStore.delete(emailKey);

    return NextResponse.json({ 
      success: true, 
      authToken,
      message: 'Login successful' 
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}