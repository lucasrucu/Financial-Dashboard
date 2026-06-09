# Deployment

The app is designed to deploy on [Vercel](https://vercel.com). It uses Next.js API routes (server-side), so any host that supports Node.js serverless functions works — but Vercel is the path of least resistance.

---

## Vercel Deployment

### 1. Push to GitHub

Make sure `master` is clean and all work is merged before deploying.

### 2. Import the project on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Framework preset auto-detects **Next.js** — no changes needed
4. Click **Deploy** (it will fail on first try — env vars are not set yet)

### 3. Add environment variables

In Vercel → your project → **Settings → Environment Variables**, add:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (service_role row) |
| `PLAID_CLIENT_ID` | Plaid Dashboard → Team Settings → Keys |
| `PLAID_SECRET` | Plaid Dashboard → Team Settings → Keys |
| `PLAID_ENV` | `sandbox` (testing) or `production` |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `BCP_PDF_PASSWORD` | Your BCP statement PDF password |

After adding variables, trigger a **Redeploy** from the Vercel dashboard.

### 4. Update Supabase Auth callback URLs

In Supabase → **Authentication → URL Configuration**:

- **Site URL:** your Vercel URL (e.g. `https://your-app.vercel.app`)
- **Redirect URLs:** add `https://your-app.vercel.app/auth/callback`

### 5. Update Google Cloud OAuth credentials

In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → your OAuth client**:

- **Authorized JavaScript origins:** add `https://your-app.vercel.app`
- **Authorized redirect URIs:** add `https://your-app.vercel.app/auth/callback`  
  *(the Supabase redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` should already be there from local setup)*

### 6. Update Plaid redirect URI (if using OAuth bank connections)

In the Plaid Dashboard → **API → Allowed redirect URIs**, add your Vercel domain.

---

## Subsequent Deploys

Vercel deploys automatically on every push to `master`. No manual steps needed after the initial setup.

---

## Sharing with Friends or Family

By default, your Google OAuth app is in **Testing mode** — only explicitly added test users can sign in. To open it up:

### Option A — Add specific people as test users (simplest)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → OAuth consent screen**
2. You'll be redirected into **Google Auth Platform** — click the **Audience** tab
3. Scroll to **Test users** → **Add users** → enter each person's Gmail address

They can sign in immediately. Best for 1–5 trusted people.

### Option B — Publish the OAuth app (for broader access)

1. Google Cloud Console → **APIs & Services → OAuth consent screen** → **Google Auth Platform → Audience**
2. Click **Publish App**
2. Click **Confirm** — Google moves the app to production mode
3. Users will see a warning screen ("This app isn't verified") the first time they sign in — they click **Advanced → Continue to [app name]** to proceed
4. This is expected and safe for a small personal app; Google's full verification process is only required if you want to remove the warning

> Formal verification (removing the warning) requires submitting to Google for review, providing a privacy policy URL, and demonstrating app usage. It's typically not worth doing for a personal app shared with a handful of people.

---

## Database for Production

Use a **separate Supabase project** for production — do not reuse your development project.

1. Create a new Supabase project
2. Run `supabase/setup.sql` in the SQL Editor once to create all tables
3. Update Vercel environment variables to point to the new project's URL and keys
4. Set `PLAID_ENV=production` and use the Production secret from Plaid

> To wipe financial data and start fresh (e.g. moving from sandbox to production Plaid), run `supabase/reset.sql` — see the comments at the top of that file. Your login is preserved.
