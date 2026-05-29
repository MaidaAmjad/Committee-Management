/**
 * Send a test email via Brevo. Usage (from server/):
 *   npm run test:email
 *   npm run test:email -- you@example.com
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.BREVO_API_KEY?.trim();
const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
const senderName = process.env.BREVO_SENDER_NAME?.trim() || 'TrustCom';
const toEmail = process.argv[2]?.trim() || senderEmail;

if (!apiKey || apiKey.includes('your-brevo')) {
  console.error('Set BREVO_API_KEY in server/.env');
  process.exit(1);
}
if (!senderEmail || senderEmail.includes('yourdomain')) {
  console.error('Set BREVO_SENDER_EMAIL in server/.env (must be a verified sender in Brevo)');
  process.exit(1);
}
if (!toEmail) {
  console.error('Pass a recipient: npm run test:email -- you@example.com');
  process.exit(1);
}

const accountRes = await fetch('https://api.brevo.com/v3/account', {
  headers: { 'api-key': apiKey, accept: 'application/json' },
});
if (accountRes.ok) {
  const account = await accountRes.json();
  if (!account.relay?.enabled) {
    console.warn(
      'Brevo transactional email is NOT activated yet (relay.enabled = false).\n' +
        'Request activation: Brevo dashboard → ? help → Support and Tickets.\n'
    );
  }
}

const res = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({
    sender: { email: senderEmail, name: senderName },
    to: [{ email: toEmail, name: 'Test' }],
    subject: 'TrustCom — Brevo test email',
    htmlContent: '<p>If you received this, Brevo is configured correctly.</p>',
  }),
});

const body = await res.text();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, body);
  process.exit(1);
}

console.log(`Test email sent to ${toEmail}`);
console.log(body || '(no body)');
