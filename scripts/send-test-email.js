#!/usr/bin/env node
/*
 Simple SMTP test script.

 Usage:
  SMTP_PASSWORD='...'
  node scripts/send-test-email.js --to rater@example.com --uid 123 --email rater@example.com

 If uid/email are provided, the script will build a base64 auth token and include a sample /rater?auth=... link.
*/

const nodemailer = require('nodemailer');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

function safeBase64Encode(input) {
  try {
    return Buffer.from(String(input), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return null;
  }
}

async function main() {
  const argv = parseArgs();
  const to = argv.to || process.env.TEST_EMAIL_TO;
  if (!to) {
    console.error('Usage: node scripts/send-test-email.js --to rater@example.com [--uid 123 --email rater@example.com]');
    process.exit(2);
  }

  const SMTP_HOST = process.env.SMTP_HOST || 'mail.alliance.co.ls';
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '2525', 10);
  const SMTP_AUTH = (process.env.SMTP_AUTHENTICATE || '1') === '1';
  const SMTP_USER = process.env.SMTP_USERNAME || 'noreply-aic';
  const SMTP_PASS = process.env.SMTP_PASSWORD || process.env.SMTPPwd || '';
  const SMTP_FROM = process.env.SMTP_FROM || 'noreply-aic@alliance.co.ls';

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: SMTP_AUTH ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  const uid = argv.uid || argv.u;
  const email = argv.email || argv.e || to;
  let ratingLink = '';
  if (uid && email) {
    const token = safeBase64Encode(`${uid}:${email}`);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
    ratingLink = `${baseUrl}/rater?auth=${encodeURIComponent(token)}`;
  }

  const subject = 'Test: 360° Rating - Please verify email delivery';
  const text = `This is a test email from the 360° Rating System.\n\n${ratingLink ? `Sample link: ${ratingLink}\n\n` : ''}If you received this message, SMTP is configured correctly.`;

  const html = `
    <p>This is a <strong>test email</strong> from the 360° Rating System.</p>
    ${ratingLink ? `<p>Sample link: <a href="${ratingLink}">${ratingLink}</a></p>` : ''}
    <p>If you received this message, SMTP is configured correctly.</p>
  `;

  try {
    console.log('Sending test email to', to, 'using', SMTP_HOST + ':' + SMTP_PORT);
    const info = await transporter.sendMail({ from: SMTP_FROM, to, subject, text, html });
    console.log('Message sent:', info.messageId || info.response);
    process.exit(0);
  } catch (err) {
    console.error('Failed to send test email:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
