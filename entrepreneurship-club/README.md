# Entrepreneurship Club

A standalone, static marketing site for the Entrepreneurship Club — completely
independent of the Orozco Homes remodel app that lives in the rest of this
repo. It's a single-page site (Home, About, Success Stories, Membership,
Community Values, Meetings, Resources) with an EN/ES language toggle, built
with plain Vite (no React).

This directory has its own `package.json`, `vite.config.js`, and
`netlify.toml` so it can be deployed as its **own Netlify site** from this
same GitHub repo.

## Local development

```bash
cd entrepreneurship-club
npm install
npm run dev
```

Open the URL Vite prints (defaults to [http://localhost:5173](http://localhost:5173)).

## Deploying as its own Netlify site

1. In Netlify: **Add new site → Import an existing project**, and connect
   this GitHub repo (`orozco-homes-app`).
2. Under **Build settings**, set:
   - **Base directory:** `entrepreneurship-club`
   - **Build command:** `npm run build` (already set via this directory's
     `netlify.toml`)
   - **Publish directory:** `entrepreneurship-club/dist`
3. Under **Site settings → Environment variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   These can point at the same Supabase project the Orozco Homes app uses —
   this site only ever reads/writes its own two tables (see below) — or a
   different project entirely. See `.env.example` in this directory.
4. Before the membership/story forms will accept submissions, run
   `supabase/migrations/021_entrepreneurship_club.sql` (at the repo root) in
   that Supabase project's SQL Editor.
5. Deploy. Once it's live, this becomes its own site with its own domain,
   deploy history, and dashboard entry — fully decoupled from the Orozco
   Homes site's deploys.

## Database scope

The two forms on this site write **only** to `ec_membership_requests` and
`ec_success_stories`. Both tables are insert-only for anonymous visitors
(Row Level Security); only a profile with `role = 'admin'` can read or
moderate submissions. Nothing on this site queries or touches any
material-selection, project, or client table from the Orozco Homes app.
