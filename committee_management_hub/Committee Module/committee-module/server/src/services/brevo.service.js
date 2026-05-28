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
      throw new AppError(
        response.status === 401
          ? 'Email service configuration error (invalid Brevo API key).'
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
