const nodemailer = require('nodemailer');

// Set up the robust SMTP Transporter using natively provided environment credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // Defaulting to Gmail for highest universal reliability
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Fires an automated HTML approval email to the destination business.
 */
const sendApprovalEmail = async (toEmail, companyName) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn("⚠️ SMTP credentials missing in .env! Approval email blocked.");
    return false;
  }

  const mailOptions = {
    from: `"Business Connect Admin" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: `Your Registration for Business Connect has been Approved!`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #1a7f37;">Registration Approved 🎉</h2>
        <p>Hello <b>${companyName}</b>,</p>
        <p>Great news! Your business registration has been successfully reviewed and approved by an Administrator.</p>
        <p>You now have full access to your business profile, networking connections, and the analytics dashboard.</p>
        <br/>
        <p>
          <a href="${process.env.CLIENT_URL}/login" 
             style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Login to Business Connect
          </a>
        </p>
        <br/><br/>
        <p style="font-size: 12px; color: #777;">If you did not request this registration, please contact our support team immediately.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ Approval email dispatched successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send Approval email to ${toEmail}:`, error.message);
    return false;
  }
};

/**
 * Fires an automated HTML rejection email to the destination business.
 */
const sendRejectionEmail = async (toEmail, companyName) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn("⚠️ SMTP credentials missing in .env! Rejection email blocked.");
    return false;
  }

  const mailOptions = {
    from: `"Business Connect Admin" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: `Business Connect Registration Update`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #cf1322;">Registration Rejected</h2>
        <p>Hello <b>${companyName}</b>,</p>
        <p>We are writing to inform you that your registration for Business Connect has unfortunately been rejected by an Administrator.</p>
        <p>This typically occurs if there are discrepancies with the provided documentation or business identity parameters.</p>
        <br/>
        <p>If you believe this decision was made in error, please reach out to our platform Support team for a manual review.</p>
        <br/><br/>
        <p style="font-size: 12px; color: #777;">This is an automated message. Please do not reply directly to this email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✉️ Rejection email dispatched successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send Rejection email to ${toEmail}:`, error.message);
    return false;
  }
};

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail
};
