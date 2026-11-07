# Running Regibee

These notes are for anyone changing or running the live app, people and Claude alike. The [README](README.md) covers local setup.

## Where each part runs

| Service | What it does | What to know |
| --- | --- | --- |
| GitHub `dango-design/regibee` | Code, pull requests, CI | CI reads the `CHROMATIC_PROJECT_TOKEN` repo secret. |
| Vercel | Builds and hosts the site | `main` deploys to regibee.com and www.regibee.com. Every other branch gets a preview URL. Every deployment URL except regibee.com needs a Vercel login. |
| Supabase `baby-registry` (ref `ibfvmgpfwhhyrhnxaxig`) | Production database and sign-in | Database changes are run by hand. See below. |
| Supabase `baby-registry-staging` | A separate database for testing | Put its keys in `.env.staging.local` and run `npm run dev:staging`. |
| Resend | Sends notification emails from `notifications@regibee.com` | Needs `RESEND_API_KEY`, and DNS records for regibee.com. |
| Porkbun | Registrar and DNS for regibee.com | The DNS records point the site at Vercel and verify the domain for Resend. |
| Chromatic | Visual tests of the Storybook stories | The project is in the `dango-design` Chromatic account, on the free plan. Its id is in `chromatic.config.json`. |

Vercel holds these env vars for production, preview and development: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` and `NEXT_PUBLIC_SITE_URL`. Run `vercel env pull .env.local` to copy them to your machine.

## Database changes

- Changes live in `supabase/migrations`. Nothing runs them on deploy. Someone runs each new file by hand.
- Production has no migration history table, so the Supabase CLI can't tell which files have run. Look at the database before running a file.
- Give a new file the next number after the highest one. Two files already share `009`.
- Run a file on staging first, then on production. Use the SQL Editor in the Supabase dashboard, or the CLI:

  ```bash
  supabase link --project-ref ibfvmgpfwhhyrhnxaxig
  supabase db query --linked -f supabase/migrations/<file>.sql
  ```

- If a migration takes away access that the live code still uses, deploy the code first and run the migration after. Run the other way round, and the live site breaks until the code is deployed. `009_restrict_registry_reads.sql` was one of these.
- To test access rules (RLS) on production without saving anything, put the test in a `DO` block. Set `local role` and `request.jwt.claims` inside it, run the queries, and end the block with `raise exception` so everything rolls back.

## Keys and access rules

- The anon key ships in the browser, so anyone can use it. The table access rules (RLS) are the only thing protecting data the anon key can reach.
- `SUPABASE_SERVICE_ROLE_KEY` skips every access rule. Use the service-role client only in server code, and filter by an id or slug the user is allowed to see. The public registry page (`src/app/r/[slug]/page.tsx`) works this way.

## Visual tests (Chromatic)

- `.github/workflows/chromatic.yml` runs Chromatic on every push. It asks Chromatic to snapshot only the stories the commit affects (TurboSnap, `onlyChanged`). Chromatic turns TurboSnap on only after the account has 10 builds from CI. The project moved accounts on 2026-11-06, so until that count is reached every build snapshots every story.
- A green `chromatic` job does not mean the review is done. The "UI Tests" check on a pull request stays pending until someone reviews the changed snapshots in Chromatic.
- On a branch build, accept only the changes that branch made. A branch build also shows changes still waiting for review on `main`.
- The free plan includes 5,000 snapshots a month. When they run out, Chromatic pauses testing and review until the next month.
- Storybook can't render async server components. Put a page's markup in a plain component and write the story for that. The landing page works this way.

## Before opening a pull request

- Run `npx tsc --noEmit` and `npm run build`.
- If you changed components or stories, also run `npm run build-storybook`.
- `npm run lint` fails right now. `eslint.config.mjs` imports `eslint-plugin-storybook`, which isn't in `package.json`.
