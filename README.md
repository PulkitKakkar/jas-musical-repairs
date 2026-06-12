# JAS Instrument Repair Tracker

Production-ready repair tracking for JAS Musicals. Built with Next.js (React), TypeScript, Tailwind CSS, Supabase Authentication/Postgres, Twilio SMS, and Vercel.

## Features

- Secure Supabase admin login and row-level security
- Automatic unique repair numbers such as `REP-2026-000001`
- Customer deduplication by phone number and complete repair history
- Internal landing page focused on adding repairs and updating status
- Customer search, repair history, filtering, and Excel export
- Received, done, and collected workflows with dates, confirmation prompts, SMS, and audit logs
- Internal admin notes
- Printable repair receipt
- Responsive desktop and mobile interface

## Local Setup

Requirements: Node.js 20+, a Supabase project, and optionally a Twilio account.

1. Install dependencies:

   ```bash
   npm install
   ```

2. In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql).

3. Create the first administrator in Supabase: **Authentication → Users → Add user**. Disable public sign-ups in Authentication settings.

4. Copy `.env.example` to `.env.local` and fill in:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   TWILIO_ACCOUNT_SID=
   TWILIO_AUTH_TOKEN=
   TWILIO_PHONE_NUMBER=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. Optionally run [`supabase/seed.sql`](supabase/seed.sql) in the SQL editor.

6. Start the app:

   ```bash
   npm run dev
   ```

## Database

The schema uses snake_case SQL identifiers, represented by the requested fields as follows:

- `firstName` → `first_name`
- `repairNumber` → `repair_number`
- `customerId` → `customer_id`
- date fields → `received_date`, `completed_date`, and `collected_date`

Repair numbers are generated atomically by a Postgres sequence, preventing collisions during concurrent intake. RLS denies anonymous access and allows authenticated admins to manage records.

## Twilio Integration

1. Purchase or select an SMS-capable Twilio phone number.
2. Copy the Account SID and Auth Token from the Twilio Console.
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` in `.env.local` and Vercel.
4. Use E.164 customer numbers, for example `+447700900123`.
5. Open **Admin → Settings** and send a test SMS.

If Twilio is not configured, repair actions still succeed and the server logs that SMS delivery was skipped. If Twilio rejects a message, the repair transaction remains saved and the error is logged. In a larger deployment, move SMS sending to a durable queue with retries.

Twilio credentials are intentionally not stored in the database. Storing an Auth Token in an admin-editable table would expose a high-value secret to database readers and browser-facing code.

## Vercel Deployment

1. Push the repository to GitHub and import it into Vercel.
2. Add all environment variables from `.env.example` in **Project Settings → Environment Variables**.
3. Set `NEXT_PUBLIC_APP_URL` to the production URL, such as `https://repairs.example.com`.
4. Deploy. Vercel detects Next.js automatically.
5. In Supabase Authentication URL Configuration, set the Site URL to the Vercel production URL.

Use separate Supabase/Twilio projects or credentials for preview and production environments.

## Production Checklist

- Disable Supabase public sign-ups and require strong admin passwords.
- Enable MFA for admin accounts where available.
- Rotate Twilio credentials periodically.
- Configure Twilio geographic permissions and messaging compliance.
- Back up Supabase and test database recovery.
- Review audit logs and Vercel/Twilio delivery logs.

## Commands

```bash
npm run dev
npm run typecheck
npm run build
```
