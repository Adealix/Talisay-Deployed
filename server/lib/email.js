/**
 * Email Service — Gmail SMTP via Nodemailer
 * Sends OTP verification emails for registration and password change.
 */
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send an OTP verification email.
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {'verify' | 'password'} type - Purpose of the OTP
 */
export async function sendOtpEmail(to, otp, type = 'verify') {
  const fromName = process.env.SMTP_FROM_NAME || 'Talisay AI';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_EMAIL;

  const isVerify = type === 'verify';

  const subject = isVerify
    ? `${fromName} — Verify Your Email`
    : `${fromName} — Password Change OTP`;

  const heading = isVerify ? 'Welcome to Talisay AI!' : 'Password Change Request';
  const message = isVerify
    ? 'Please use the code below to verify your email address and activate your account.'
    : 'Use the code below to confirm your password change. If you did not request this, please ignore this email.';

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #f8faf9; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #1b4332, #2d6a4f); padding: 32px 24px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">🌿 ${fromName}</h1>
        <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 14px;">${heading}</p>
      </div>
      <div style="padding: 32px 24px; text-align: center;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">${message}</p>
        <div style="background: #fff; border: 2px dashed #2d6a4f; border-radius: 12px; padding: 20px; margin: 0 auto; display: inline-block;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1b4332; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #9ca3af; font-size: 13px; margin: 20px 0 0;">This code expires in <strong>10 minutes</strong>.</p>
      </div>
      <div style="background: #f3f4f6; padding: 16px 24px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">Smart Talisay Fruit Analysis powered by AI</p>
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });

  console.log(`[email] OTP sent to ${to} (type=${type}, messageId=${info.messageId})`);
  return info;
}

/** Generate a 6-digit OTP code */
export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
