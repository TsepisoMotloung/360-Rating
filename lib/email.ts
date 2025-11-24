import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.alliance.co.ls',
  port: parseInt(process.env.SMTP_PORT || '2525', 10),
  secure: false,
  auth: process.env.SMTP_AUTHENTICATE === '1' ? {
    user: process.env.SMTP_USERNAME || 'noreply-aic',
    pass: process.env.SMTP_PASSWORD || '',
  } : undefined,
});

export async function sendAssignmentNotificationEmail(
  raterEmail: string,
  raterName: string,
  rateeName: string,
  rateeEmail: string,
  periodName: string,
  ratingLink?: string
) {
  try {
    const emailSubject = `360° Rating Assignment: Rate ${rateeName}`;
    const emailBody = `
Dear ${raterName},

You have been assigned to provide a 360° feedback rating for ${rateeName} (${rateeEmail}) during the ${periodName} rating period.

Please complete your rating by clicking the link below or logging into the 360° Rating System:
${ratingLink ? `\n${ratingLink}\n` : ''}

Thank you for taking the time to provide valuable feedback.

Best regards,
360° Rating System
AIC
`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply-aic@alliance.co.ls',
      to: raterEmail,
      subject: emailSubject,
      text: emailBody,
      html: `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2>360° Rating Assignment</h2>
    <p>Dear ${raterName},</p>
    <p>You have been assigned to provide a 360° feedback rating for <strong>${rateeName}</strong> (${rateeEmail}) during the <strong>${periodName}</strong> rating period.</p>
    ${ratingLink ? `<p><a href="${ratingLink}" style="display: inline-block; padding: 10px 20px; background-color: #1E40AF; color: white; text-decoration: none; border-radius: 5px;">Start Rating</a></p>` : ''}
    <p>Thank you for taking the time to provide valuable feedback.</p>
    <p>Best regards,<br/>360° Rating System<br/>Alliance Investment Company</p>
  </body>
</html>
      `,
    });

    console.log(`Email sent to ${raterEmail}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${raterEmail}:`, error);
    return false;
  }
}

export async function sendBulkAssignmentNotifications(
  assignments: Array<{
    raterEmail: string;
    raterName: string;
    rateeName: string;
    rateeEmail: string;
  }>,
  periodName: string,
  ratingLink?: string
) {
  const results = [];
  for (const assignment of assignments) {
    const success = await sendAssignmentNotificationEmail(
      assignment.raterEmail,
      assignment.raterName,
      assignment.rateeName,
      assignment.rateeEmail,
      periodName,
      ratingLink
    );
    results.push({ email: assignment.raterEmail, success });
  }
  return results;
}
