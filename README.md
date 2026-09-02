# Team Work Update Manager

Two pages:
- `/` — candidates pick their name, add hourly updates, see/edit/delete only their own entries.
- `/admin` — password-gated dashboard for you: sees everyone's updates, add common notes, generate the WhatsApp report, delete any entry, clear all data.

## If you already ran the old version of supabase-setup.sql

Open SQL Editor in Supabase and run:
```sql
alter table updates add column if not exists entry_date date not null default current_date;
```
Then continue below as normal.

## 1. Create the database (Supabase, free)

1. Go to supabase.com, sign up, create a new project (pick any name/region, set a DB password — you won't need it again).
2. Once it's ready, open **SQL Editor** (left sidebar) → New query.
3. Paste the contents of `supabase-setup.sql` (included in this project) and click **Run**.
4. Go to **Project Settings → API**. Copy:
   - `Project URL`
   - `anon public` key

## 2. Deploy to Vercel

1. Push this folder to a GitHub repo (or upload it directly — Vercel also supports drag-and-drop of a zip via "Add New Project" → "Upload").
2. Go to vercel.com → New Project → import the repo.
3. Before deploying, add Environment Variables (Project Settings → Environment Variables, or during import):
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL from Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key from Supabase
   - `NEXT_PUBLIC_ADMIN_PASSWORD` = any password you want for `/admin`
4. Click Deploy.

You'll get a link like `https://your-app.vercel.app`.

- Share `https://your-app.vercel.app` with your 20 team members.
- Use `https://your-app.vercel.app/admin` yourself, and log in with the password you set.

## 3. Local testing (optional)

```
npm install
cp .env.local.example .env.local   # then fill in your real values
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin.

## Notes on security

- The candidate page has no login — anyone with the link can add/edit/delete entries under any name. That matches "no login for team members," but means it runs on trust, not authentication.
- The `/admin` password check happens in the browser (via an env var), not on a server — good enough to keep casual team members out, but a technically determined person could bypass it. If you need real security later (e.g. per-person login), that's a bigger change — happy to help with that when you're ready.
- The Supabase table itself is open to anyone with your Supabase URL + anon key (which are visible in the deployed site's JS). This is fine for an internal, low-stakes reporting tool. Don't put confidential data in it.
