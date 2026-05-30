# Deploy TrustCom API (production)

Your Vercel site (`committee-management-ten.vercel.app`) is **only the Angular app**.  
Sign-in and data sync need the **Express API** in `server/` on a separate host.

**~10 minutes** using [Render](https://render.com) (free tier).

---

## Step 1 — Push code to GitHub

Make sure this repo is on GitHub (you already use it for Vercel).

---

## Step 2 — Create Render Web Service

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → sign up / log in.
2. **New +** → **Web Service**.
3. Connect your **Committee-Management** repository.
4. Settings:

| Field | Value |
|--------|--------|
| **Name** | `trustcom-api` (any name) |
| **Root Directory** | `committee_management_hub/Committee Module/committee-module/server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance type** | Free |

5. **Advanced** → Health Check Path: `/health`

---

## Step 3 — Environment variables (Render → Environment)

Copy values from your **local** `server/.env` (the file that works with `npm run dev`).

| Key | Example / notes |
|-----|------------------|
| `NODE_ENV` | `production` |
| `PORT` | Leave empty (Render sets it) |
| `CLIENT_URL` | `https://committee-management-ten.vercel.app` |
| `SUPABASE_URL` | From Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (secret) |
| `SUPABASE_ANON_KEY` | anon key |
| `JWT_SECRET` | Same long random string as local |
| `FIREBASE_PROJECT_ID` | `trustcom-7badb` |
| `FIREBASE_CLIENT_EMAIL` | From Firebase service account JSON |
| `FIREBASE_PRIVATE_KEY` | Full private key; paste with real newlines **or** `\n` escapes in quotes |
| `RECAPTCHA_SECRET_KEY` | Optional; if you use CAPTCHA on signup/login |
| `CAPTCHA_DEV_BYPASS` | `false` in production |

**After the first deploy**, add:

| Key | Value |
|-----|--------|
| `API_URL` | Your Render URL, e.g. `https://trustcom-api.onrender.com` (no trailing slash) |

Brevo keys are optional if you use Firebase email only.

6. Click **Create Web Service** and wait until status is **Live**.
7. Copy the public URL, e.g. `https://trustcom-api.onrender.com`.
8. Open `https://trustcom-api.onrender.com/health` — should show `{"success":true,"status":"ok"}`.

---

## Step 4 — Point the Angular app at the API

Edit `src/environments/environment.prod.ts`:

```typescript
apiUrl: 'https://trustcom-api.onrender.com',  // your Render URL, no trailing slash
```

Commit and push. Vercel will rebuild automatically.

---

## Step 5 — Firebase authorized domains

Firebase Console → **Authentication** → **Settings** → **Authorized domains**:

- `committee-management-ten.vercel.app`
- (Render does not need to be listed for email auth)

---

## Step 6 — Test

1. **Sign up** on the live site → verification email from Firebase.
2. Click the link → **Sign in** on Vercel.
3. Complete payment setup if prompted.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS error on login | `CLIENT_URL` on Render must exactly match `https://committee-management-ten.vercel.app` |
| “Auth API is not configured” | Set `apiUrl` in `environment.prod.ts` and redeploy Vercel |
| Render service sleeps (free) | First request after idle may take ~30s; upgrade or use a ping service |
| `FIREBASE_PRIVATE_KEY` errors | In Render, wrap in quotes and use `\n` for line breaks |
| 502 on establish | Check Render logs; confirm Firebase Admin env vars |

---

## Other hosts

Same env vars work on **Railway**, **Fly.io**, or a VPS: run `npm start` in the `server/` folder with `NODE_ENV=production`.
