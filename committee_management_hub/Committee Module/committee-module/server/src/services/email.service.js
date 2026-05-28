import { env } from '../config/env.js';
import { sendTransactionalEmail } from './brevo.service.js';

function baseTemplate(title, bodyHtml, ctaLabel, ctaUrl) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;background:#f7f9fb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <h1 style="color:#004ac6;font-size:22px;margin:0 0 16px;">TrustCom</h1>
    ${bodyHtml}
    <p style="margin:24px 0;">
      <a href="${ctaUrl}" style="display:inline-block;background:#004ac6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">
        ${ctaLabel}
      </a>
    </p>
    <p style="color:#64748b;font-size:12px;margin-top:24px;">
      If the button does not work, copy and paste this link into your browser:<br>
      <a href="${ctaUrl}" style="color:#004ac6;word-break:break-all;">${ctaUrl}</a>
    </p>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(user, rawToken) {
  const verifyUrl = `${env.apiUrl}/api/auth/verify-email/${rawToken}`;
  const html = baseTemplate(
    'Verify your email',
    `<p style="color:#334155;line-height:1.6;">Hi ${user.fullName},</p>
     <p style="color:#334155;line-height:1.6;">Thanks for signing up. Please verify your email address to activate your TrustCom account.</p>
     <p style="color:#334155;line-height:1.6;">This link expires in ${env.emailVerificationExpiresHours} hours.</p>`,
    'Verify Email',
    verifyUrl
  );

  await sendTransactionalEmail({
    toEmail: user.email,
    toName: user.fullName,
    subject: 'Verify your TrustCom account',
    htmlContent: html,
  });
}

export async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}`;
  const html = baseTemplate(
    'Reset your password',
    `<p style="color:#334155;line-height:1.6;">Hi ${user.fullName},</p>
     <p style="color:#334155;line-height:1.6;">We received a request to reset your password. If you did not request this, you can ignore this email.</p>
     <p style="color:#334155;line-height:1.6;">This link expires in ${env.passwordResetExpiresHours} hour(s).</p>`,
    'Reset Password',
    resetUrl
  );

  await sendTransactionalEmail({
    toEmail: user.email,
    toName: user.fullName,
    subject: 'Reset your TrustCom password',
    htmlContent: html,
  });
}
