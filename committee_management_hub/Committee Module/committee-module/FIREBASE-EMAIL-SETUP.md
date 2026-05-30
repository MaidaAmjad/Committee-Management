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

## User flow

1. **Sign up** → Firebase creates the user and sends a verification email.
2. User clicks the link → redirected to `/login?verified=1`.
3. **Sign in** with email + password → app syncs the account to `auth_users` + Supabase via `POST /api/auth/firebase-email/establish`.
4. **Forgot password** → Firebase reset email → `/reset-password?mode=resetPassword&oobCode=...`.

## Resend verification

Works in the same browser session after signup. If the session was lost, enter your password on the check-email page to resend.
