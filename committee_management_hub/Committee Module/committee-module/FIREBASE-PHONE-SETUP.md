# Firebase Phone OTP Setup

This project uses **Firebase Phone Authentication** for signup and forgot-password flows.  
User data is stored in **Supabase PostgreSQL** (`auth_users` table), not MongoDB.

## 1. Run database migration

In **Supabase → SQL Editor**, run:

`database-migrations/add-phone-otp-auth.sql`

## 2. Firebase Console

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. **Authentication → Sign-in method → Phone** → Enable
3. **Authentication → Settings → Authorized domains**: add `localhost` and your production domain
4. **Authentication → Settings → SMS region policy** (required for +92 and most countries):
   - Set policy to **Allow**
   - Add **Pakistan (PK)** and any other countries your users use
   - New Firebase projects often block all SMS regions by default; Firebase returns a misleading “provider disabled” error when the region is blocked
5. **Project settings → Your apps** → Add Web app → copy config into `src/environments/environment.ts`:

```typescript
firebase: {
  apiKey: '...',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  appId: '...',
},
```

5. **Project settings → Service accounts → Generate new private key**  
   Add to `server/.env`:

```
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 3. reCAPTCHA

Firebase Phone Auth uses invisible reCAPTCHA in the browser. For local dev, use `localhost` in authorized domains.

### Test without real SMS (Spark / 10 SMS per day limit)

Under **Sign-in method → Phone → Phone numbers for testing**, add e.g.:

| Phone number     | Verification code |
|------------------|-------------------|
| +923001234567    | 123456            |

Use that number on signup; Firebase accepts the fixed code with no SMS sent.

## 4. Auth flow

| Step | Signup | Forgot password |
|------|--------|-----------------|
| 1 | `/signup` — name, phone, password | `/forgot-password` — phone |
| 2 | API stores **pending** session (no user row yet) | Same |
| 3 | `/verify-otp` — Firebase sends OTP | `/verify-otp` |
| 4 | OTP verified → user created with `phone_verified=true` | `/reset-password?mode=phone` |
| 5 | `/verification-success` → login/dashboard | New password set |

- OTP expires: **5 minutes** (`OTP_EXPIRES_MINUTES`)
- Resend cooldown: **60 seconds**
- Max resends: **3**

## 5. Login

Users sign in with **phone number + password** at `/login`.  
Only `phone_verified=true` accounts can access protected routes.

## 6. Test locally

```powershell
cd server
npm run dev

cd ..
npm start
```

Open http://localhost:4200/signup
