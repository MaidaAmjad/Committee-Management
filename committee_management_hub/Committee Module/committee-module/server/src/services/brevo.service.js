import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const BREVO_EMAIL_URL = 'https://api.brevo.com/v3/smtp/email';
const REQUEST_TIMEOUT_MS = 20000;

export async function sendTransactionalEmail({ toEmail, toName, subject, htmlContent }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(BREVO_EMAIL_URL, {
      method: 'POST',
      headers: {
        'api-key': env.brevoApiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: env.brevoSenderEmail, name: env.brevoSenderName },
        to: [{ email: toEmail, name: toName || toEmail }],
        subject,
        htmlContent,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Brevo API error:', response.status, detail);

      let brevoMessage = '';
      try {
        const parsed = JSON.parse(detail);
        brevoMessage = parsed.message || '';
      } catch {
        brevoMessage = detail;
      }

      if (response.status === 401) {
        throw new AppError('Email service configuration error (invalid Brevo API key).', 502);
      }

      if (
        response.status === 403 &&
        /smtp account is not yet activated/i.test(brevoMessage)
      ) {
        throw new AppError(
          'Brevo SMTP is not activated on your account. In Brevo: Settings → SMTP & API, complete activation, or contact Brevo support.',
          502
        );
      }

      throw new AppError(
        brevoMessage
          ? `Email could not be sent: ${brevoMessage}`
          : 'Failed to send email. Please try again later.',
        502
      );
    }

    console.log(`Brevo email sent to ${toEmail}: ${subject}`);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name === 'AbortError') {
      throw new AppError('Email service timed out. Please try again.', 504);
    }
    console.error('Brevo send error:', error.message);
    throw new AppError('Failed to send email. Please try again later.', 502);
  } finally {
    clearTimeout(timeoutId);
  }
}
