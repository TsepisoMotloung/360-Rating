// sendEmail.js
require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendEmail() {
  // Create transporter with SMTP settings from .env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false, // false for port 2525
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: 'sKZBP#Yv)99y8(yW'
    }
  });

  // Get email details from command line args or use defaults
  const args = process.argv.slice(2);
  const to = args[0] || 'tmotloung@alliance.co.ls';
  const subject = args[1] || 'Test Email';
  const message = args[2] || 'This is a test email from nodemailer.';

  const mailOptions = {
    from: process.env.SMTP_FROM,
    to: to,
    subject: subject,
    text: message,
    html: `<p>${message}</p>`
  };

  try {
    console.log(`Sending email to ${to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('Error sending email:', error.message);
    process.exit(1);
  }
}

sendEmail();