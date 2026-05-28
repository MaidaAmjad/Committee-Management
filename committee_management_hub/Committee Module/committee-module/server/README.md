# TrustCom Auth API

Express + JWT + Brevo + **Supabase PostgreSQL** (no MongoDB).

## Database

User accounts are stored in Supabase table `auth_users`. Run this once in **Supabase → SQL Editor**:

`../database-migrations/create-auth-users-table.sql`

## Setup

1. Copy environment file:

```bash
cd server
cp .env.example .env
```

2. Set in `.env`:
   - `SUPABASE_URL` — your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase **Project Settings → API** (service_role, keep secret)
   - `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` (verified sender in Brevo)
   - `JWT_SECRET`

3. Install and run:

```bash
npm install
npm run dev
```

No MongoDB required.

## Features

- Sign up → `is_verified: false` + Brevo verification email
- Verify email → `is_verified: true` + Supabase Auth confirmed
- Login blocked until verified → returns JWT
- Forgot / reset password via Brevo

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Sign up |
| GET | `/api/auth/verify-email/:token` | Verify email |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Request reset |
| POST | `/api/auth/reset-password` | Set new password |
| GET | `/api/auth/me` | Current user (Bearer JWT) |
