# Firebase email verification (TrustCom)

Email signup, verification, and password reset use **Firebase Authentication** (not Brevo).

## Firebase Console

1. **Authentication → Sign-in method** → enable **Email/Password** (Email link sign-in is optional; password flow is used).
2. **Authentication → Settings → Authorized domains** — add:
   - `localhost`
   - Your production host (e.g. `committee-management-ten.vercel.app`)
3. **Authentication → Templates** (optional) — customize verification and password-reset emails.

## Server (`server/.env`)

Same Admin SDK as phone OTP:

```
FIREBASE_PROJECT_ID=trustcom-7badb
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Restart the API after changes: `cd server && npm run dev`.

## Client (`src/environments/environment.ts`)

- `useFirebaseEmailVerification: true` (default)
- `firebase: { apiKey, authDomain, projectId, appId }` from Firebase → Project settings → Your apps

Set `useFirebaseEmailVerification: false` to fall back to Brevo/API email verification.

## Production (Vercel + API host)

The Angular app on Vercel is **frontend only**. Deploy `server/` separately (Render, Railway, Fly.io, etc.), then set in `src/environments/environment.prod.ts`:

```ts
apiUrl: 'https://your-deployed-api.example.com',
```

Redeploy the frontend. In the API host `.env`, set `CLIENT_URL=https://committee-management-ten.vercel.app` (your Vercel URL).

Without `apiUrl`, users can still **sign up** (Firebase email), but **sign in** and committees/payments need the API.

## User flow

1. **Sign up** → Firebase creates the user and sends a verification email.
2. User clicks the link → redirected to `/login?verified=1`.
3. **Sign in** with email + password → app syncs the account to `auth_users` + Supabase via `POST /api/auth/firebase-email/establish`.
4. **Forgot password** → Firebase reset email → `/reset-password?mode=resetPassword&oobCode=...`.

## reCAPTCHA (signup & sign-in)

1. Create keys at [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin) — type **v2 Checkbox** (“I'm not a robot”).
2. Add domains: `localhost`, your production host.
3. **Client** — set `recaptchaSiteKey` in `src/environments/environment.ts` and `environment.prod.ts`.
4. **Server** — add to `server/.env`:
   ```
   RECAPTCHA_SECRET_KEY=your-secret-key
   ```
5. Restart API and `ng serve`.

Local dev: if `RECAPTCHA_SECRET_KEY` is unset, the server skips verification (`CAPTCHA_DEV_BYPASS`). The widget is hidden until you set `recaptchaSiteKey` on the client.

## Resend verification

Works in the same browser session after signup. If the session was lost, enter your password on the check-email page to resend.
