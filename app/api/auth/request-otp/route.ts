import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Store OTPs in memory (in production, use Redis or database with expiry)
declare global {
  var otpStore: Map<string, { otp: string; expiresAt: number }> | undefined;
}

const otpStore = global.otpStore || new Map<string, { otp: string; expiresAt: number }>();
global.otpStore = otpStore;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists in database (Username field contains email)
    const user = await prisma.tblUser.findFirst({
      where: {
        Username: email,
        IsActive: 1
      },
      select: {
        UserID: true,
        Username: true,
        FName: true,
        Surname: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in the system' }, { status: 404 });
    }

    const fullName = `${user.FName || ''} ${user.Surname || ''}`.trim();

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    console.log(`Email service not yet available. But here is yours admin:${otp}`);

    // Store OTP
    otpStore.set(email.toLowerCase(), { otp, expiresAt });

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.alliance.co.ls',
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      secure: false,
      auth: process.env.SMTP_AUTHENTICATE === '1' ? {
        user: process.env.SMTP_USERNAME || 'noreply-aic',
        pass: process.env.SMTP_PASSWORD || '',
      } : undefined,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply-aic@alliance.co.ls',
      to: email,
      subject: '360° Rating System - Login OTP',
      text: `Dear ${fullName || 'User'},

Your OTP for logging into the 360° Rating System is: ${otp}

This OTP will expire in 10 minutes. If you did not request this, please ignore this email.

Best regards,
360° Rating System
AIC`,
      html: `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
      <div style="display: inline-block; background: white; width: 60px; height: 60px; border-radius: 12px; line-height: 60px; margin-bottom: 10px;">
        <span style="color: #dc2626; font-weight: bold; font-size: 32px;">360°</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px;">Login Verification</h1>
    </div>
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px; margin-bottom: 20px;">Dear ${fullName || 'User'},</p>
      <p style="font-size: 16px; margin-bottom: 20px;">Your OTP for logging into the 360° Rating System is:</p>
      <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 10px; padding: 20px; text-align: center; margin: 30px 0;">
        <div style="font-size: 36px; font-weight: bold; color: #dc2626; letter-spacing: 8px; font-family: monospace;">${otp}</div>
      </div>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">This OTP will expire in <strong>10 minutes</strong>.</p>
      <p style="font-size: 14px; color: #6b7280;">If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="font-size: 14px; color: #6b7280; margin: 0;">Best regards,<br/><strong>360° Rating System</strong><br/>Alliance Investment Company</p>
    </div>
  </body>
</html>
      `,
    });

    

    return NextResponse.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}