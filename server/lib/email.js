/**
 * Email Service  Brevo Transactional Email REST API
 *
 * Uses Brevo's HTTPS API (port 443) instead of SMTP.
 * Render and most cloud hosts block outbound SMTP (port 587/465),
 * but HTTPS is always open.
 *
 * Required Render env var:
 *   BREVO_API_KEY   = your Brevo v3 API key
 *                     Brevo dashboard -> Account (top-right) -> SMTP & API -> API Keys -> Generate
 *                     Looks like: xkeysib-abc123...
 *
 * Optional (already set):
 *   SMTP_FROM_EMAIL = adealixmaranan123@gmail.com  (must be a verified sender in Brevo)
 *   SMTP_FROM_NAME  = TalisayOil
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function getConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY,
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_EMAIL || '',
    fromName: process.env.SMTP_FROM_NAME || 'Talisay AI',
  };
}

// Check at startup
const _cfg = getConfig();
if (!_cfg.apiKey) {
  console.error('[email] MISSING: BREVO_API_KEY  add it in Render env vars (Brevo -> Account -> SMTP & API -> API Keys)');
} else {
  console.log(`[email] Brevo HTTP API ready | from="${_cfg.fromName}" <${_cfg.fromEmail}>`);
}

/**
 * Low-level send via Brevo REST API.
 */
async function sendViaBrevo({ to, subject, html }) {
  const cfg = getConfig();

  if (!cfg.apiKey) throw new Error('BREVO_API_KEY is not set. Add it in Render env vars.');
  if (!cfg.fromEmail) throw new Error('SMTP_FROM_EMAIL is not set. Add your verified Brevo sender email in Render env vars.');

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': cfg.apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: cfg.fromName, email: cfg.fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    const err = new Error(`Brevo API error: ${msg}`);
    err.statusCode = res.status;
    err.brevoResponse = data;
    throw err;
  }

  console.log(`[email] Sent to ${to} | messageId=${data.messageId || '(none)'}`);
  return data;
}

/**
 * Send an OTP verification email.
 */
export async function sendOtpEmail(to, otp, type = 'verify') {
  const { fromName } = getConfig();
  const isVerify = type === 'verify';

  const subject = isVerify ? `${fromName}  Verify Your Email` : `${fromName}  Password Change OTP`;
  const heading = isVerify ? 'Welcome to Talisay AI!' : 'Password Change Request';
  const message = isVerify
    ? 'Please use the code below to verify your email address and activate your account.'
    : 'Use the code below to confirm your password change. If you did not request this, please ignore this email.';

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #f8faf9; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #1b4332, #2d6a4f); padding: 32px 24px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Talisay AI</h1>
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

  return sendViaBrevo({ to, subject, html });
}

/** Generate a 6-digit OTP code */
export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Send account deactivation notification email.
 */
export async function sendDeactivationEmail(to, reason) {
  const { fromName } = getConfig();
  const contactEmail = 'talisayfruit@gmail.com';

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #f8faf9; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #1b4332, #2d6a4f); padding: 32px 24px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Talisay AI</h1>
        <p style="color: #fca5a5; margin: 8px 0 0; font-size: 14px;">Account Deactivated</p>
      </div>
      <div style="padding: 32px 24px; text-align: center;">
        <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Your account has been deactivated by an administrator.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 0 0 20px; text-align: left;">
          <p style="color: #991b1b; font-size: 13px; font-weight: 600; margin: 0 0 4px;">Reason:</p>
          <p style="color: #b91c1c; font-size: 14px; margin: 0; line-height: 1.5;">${reason || 'No reason provided'}</p>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
          If you believe this was a mistake, contact us at
          <a href="mailto:${contactEmail}" style="color: #2d6a4f; font-weight: 600;">${contactEmail}</a>.
        </p>
      </div>
      <div style="background: #f3f4f6; padding: 16px 24px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">Smart Talisay Fruit Analysis powered by AI</p>
      </div>
    </div>
  `;

  return sendViaBrevo({ to, subject: `${fromName}  Account Deactivated`, html });
}
